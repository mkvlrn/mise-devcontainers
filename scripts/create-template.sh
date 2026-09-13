#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

DISTRO=""
CANDIDATE_TAG=""
IMAGE_VERSION=""

while [ "$#" -gt 0 ]; do
  case "$1" in
  --distro)
    [ "$#" -ge 2 ] || die "--distro requires a value"
    DISTRO="$2"
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

[ -n "$DISTRO" ] || die "--distro is required"
[ -n "$CANDIDATE_TAG" ] || die "--candidateTag is required"
[ -n "$IMAGE_VERSION" ] || die "--imageVersion is required"
validate_distro "$DISTRO"

COMMON_DIR="$(templates_dir "_common")"
DISTRO_DIR="$(templates_dir "$DISTRO")"
OUTPUT_DIR="$(publish_template_dir "$DISTRO")"
IMAGE_REF="$(image_ref "$DISTRO")"

log "Preparing template files for $DISTRO in $OUTPUT_DIR..."
prepare_overlay "$COMMON_DIR" "$DISTRO_DIR" "$OUTPUT_DIR"

log "Configuring devcontainer.json for $DISTRO..."
CONTAINER_CONFIG_PATH="$OUTPUT_DIR/.devcontainer/devcontainer.json"
NAME_VAL="mise-devcontainer-${DISTRO}-\${localWorkspaceFolderBasename}"
IMAGE_VAL="${IMAGE_REF}:${CANDIDATE_TAG}"

tmp_dc="$(mktemp)"
jq --arg name "$NAME_VAL" --arg img "$IMAGE_VAL" \
  '.name = $name | .image = $img' \
  "$CONTAINER_CONFIG_PATH" >"$tmp_dc"
mv "$tmp_dc" "$CONTAINER_CONFIG_PATH"

log "Configuring devcontainer-template.json for $DISTRO..."
TEMPLATE_CONFIG_PATH="$OUTPUT_DIR/devcontainer-template.json"
tmp_tpl="$(mktemp)"
jq --arg ver "$IMAGE_VERSION" \
  '.version = $ver' \
  "$TEMPLATE_CONFIG_PATH" >"$tmp_tpl"
mv "$tmp_tpl" "$TEMPLATE_CONFIG_PATH"

log "Template created for $DISTRO at $OUTPUT_DIR"
