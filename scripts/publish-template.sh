#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

DISTROS=""
CANDIDATE_TAG=""
IMAGE_VERSION=""
NAMESPACE="mkvlrn/mise-devcontainers"

while [ "$#" -gt 0 ]; do
  case "$1" in
  --distros)
    [ "$#" -ge 2 ] || die "--distros requires a value"
    DISTROS="$2"
    shift 2
    ;;
  --candidateTag)
    [ "$#" -ge 2 ] || die "--candidateTag requires a value"
    CANDIDATE_TAG="$2"
    shift 2
    ;;
  --imageVersion)
    [ "$#" -ge 2 ] || die "--imageVersion requires a value"
    IMAGE_VERSION="$2"
    shift 2
    ;;
  *)
    die "unknown argument: $1"
    ;;
  esac
done

[ -n "$DISTROS" ] || die "--distros is required"
[ -n "$CANDIDATE_TAG" ] || die "--candidateTag is required"
[ -n "$IMAGE_VERSION" ] || die "--imageVersion is required"

# Validate distros JSON
mapfile -t CHANGED_DISTROS < <(echo "$DISTROS" | jq -r '.[]')
[ "${#CHANGED_DISTROS[@]}" -gt 0 ] || die "distros array must not be empty"

for distro in "${CHANGED_DISTROS[@]}"; do
  validate_distro "$distro"
done

# Check for duplicates in distros
dup_check="$(echo "$DISTROS" | jq 'length == (unique | length)')"
[ "$dup_check" = "true" ] || die "distros must not contain duplicates"

DOCKER_CMD="${DOCKER_CMD:-docker}"
ORAS_CMD="${ORAS_CMD:-oras}"
DEVCONTAINER_CMD="${DEVCONTAINER_CMD:-devcontainer}"

get_image_digest() {
  local ref="$1"
  local output
  output="$("$DOCKER_CMD" buildx imagetools inspect "$ref")"
  local digest
  digest="$(echo "$output" | grep -E '^Digest:[[:space:]]+sha256:[a-f0-9]{64}' | awk '{print $2}' | head -n1)"
  if [ -z "$digest" ]; then
    die "could not resolve digest for $ref"
  fi
  echo "$digest"
}

restore_template() {
  local distro="$1"
  local destination="$2"
  local download_dir
  download_dir="$(mktemp -d)"

  if ! "$ORAS_CMD" pull --output "$download_dir" "ghcr.io/${NAMESPACE}/${distro}:latest" >/dev/null 2>&1; then
    rm -rf "$download_dir"
    die "could not restore published template for $distro; all five templates are required. If it has never been published, change .rebuild-all to validate and release every distro"
  fi

  local archive="$download_dir/devcontainer-template-${distro}.tgz"
  if [ ! -f "$archive" ]; then
    rm -rf "$download_dir"
    die "template archive not found in oras output for $distro"
  fi

  mkdir -p "$destination"
  tar --extract --file "$archive" --directory "$destination" --no-same-owner
  rm -rf "$download_dir"
}

COLLECTION_DIR="$(publish_collection_dir)"
rm -rf "$COLLECTION_DIR"
mkdir -p "$COLLECTION_DIR"

log "Staging template collection in $COLLECTION_DIR..."

for distro in "${DISTRO_LIST[@]}"; do
  destination="$COLLECTION_DIR/$distro"
  is_changed=false
  for c in "${CHANGED_DISTROS[@]}"; do
    if [ "$c" = "$distro" ]; then
      is_changed=true
      break
    fi
  done

  if [ "$is_changed" = true ]; then
    source_dir="$(downloaded_template_dir "$distro")"
    [ -d "$source_dir" ] || die "tested template for $distro doesn't exist"

    cp -a "$source_dir" "$destination"
  else
    log "Restoring published template for unchanged distro $distro..."
    restore_template "$distro" "$destination"
  fi

  # Validate metadata
  metadata_file="$destination/devcontainer-template.json"
  [ -f "$metadata_file" ] || die "metadata file missing for $distro"
  meta_id="$(jq -r '.id // empty' "$metadata_file")"
  [ "$meta_id" = "$distro" ] || die "template ID $meta_id does not match distro $distro"

  config_file="$destination/.devcontainer/devcontainer.json"
  [ -f "$config_file" ] || die "config file missing for $distro"

  if [ "$is_changed" = true ]; then
    meta_ver="$(jq -r '.version // empty' "$metadata_file")"
    [ "$meta_ver" = "$IMAGE_VERSION" ] || die "tested template for $distro does not match the validated release (version mismatch: expected $IMAGE_VERSION, got $meta_ver)"

    img_ref="$(image_ref "$distro")"
    candidate_ref="${img_ref}:${CANDIDATE_TAG}"
    cfg_img="$(jq -r '.image // empty' "$config_file")"
    [ "$cfg_img" = "$candidate_ref" ] || die "tested template for $distro does not match the validated release (image mismatch: expected $candidate_ref, got $cfg_img)"

    cand_digest="$(get_image_digest "$candidate_ref")"
    current_ref="${img_ref}:current"
    curr_digest="$(get_image_digest "$current_ref")"

    if [ "$cand_digest" != "$curr_digest" ]; then
      die "current image for $distro does not match tested candidate (candidate: $cand_digest, current: $curr_digest)"
    fi

    pinned_image="${current_ref}@${curr_digest}"
    tmp_cfg="$(mktemp)"
    jq --arg img "$pinned_image" '.image = $img' "$config_file" >"$tmp_cfg"
    mv "$tmp_cfg" "$config_file"
  fi
done

log "Publishing template collection..."
"$DEVCONTAINER_CMD" templates publish --registry ghcr.io --namespace "$NAMESPACE" "$COLLECTION_DIR"

log "Template collection published successfully."
