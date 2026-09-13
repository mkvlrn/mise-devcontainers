#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Distro list discovered dynamically from distros directory
readarray -t DISTRO_LIST < <(find "$ROOT/distros" -mindepth 1 -maxdepth 1 -type d ! -name '_common' -exec basename {} \; | sort)

# Logging and error handling
die() {
  echo "Error: $*" >&2
  exit 1
}

log() {
  echo "==> $*"
}

# Distro validation
validate_distro() {
  local target="$1"
  for d in "${DISTRO_LIST[@]}"; do
    if [ "$d" = "$target" ]; then
      return 0
    fi
  done
  die "invalid distro '$target'; must be one of: ${DISTRO_LIST[*]}"
}

# Image references
image_name() {
  local distro="$1"
  echo "mkvlrn/mise-devcontainer-${distro}"
}

image_ref() {
  local distro="$1"
  echo "ghcr.io/$(image_name "$distro")"
}

# Path helpers
distros_dir() {
  local distro="$1"
  echo "$ROOT/distros/$distro"
}

templates_dir() {
  local distro="$1"
  echo "$ROOT/templates/$distro"
}

test_suites_dir() {
  local distro="$1"
  echo "$ROOT/test/$distro"
}

build_image_dir() {
  local distro="$1"
  echo "$ROOT/.tmp/.build-image-$distro"
}

publish_template_dir() {
  local distro="$1"
  echo "$ROOT/.tmp/.publish-template-$distro"
}

test_execution_dir() {
  local distro="$1"
  echo "$ROOT/.tmp/.test-execution-$distro"
}

validation_metadata_dir() {
  echo "$ROOT/.tmp/.validation-metadata"
}

publish_collection_dir() {
  echo "$ROOT/.tmp/.publish-collection"
}

downloaded_template_dir() {
  local distro="$1"
  echo "$ROOT/.tmp/.publish-templates/template-$distro"
}

# Directory overlay helper
prepare_overlay() {
  local common_dir="$1"
  local distro_dir="$2"
  local output_dir="$3"

  rm -rf "$output_dir"
  mkdir -p "$output_dir"
  cp -a "$common_dir/." "$output_dir/"
  cp -a "$distro_dir/." "$output_dir/"
  find "$output_dir" -name .gitkeep -delete 2>/dev/null || true
}

# GitHub Actions output helper
write_github_output() {
  local key="$1"
  local value="$2"
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    printf '%s=%s\n' "$key" "$value" >>"$GITHUB_OUTPUT"
  else
    echo "[OUTPUT] $key=$value"
  fi
}
