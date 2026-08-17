#!/bin/sh
set -e

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="$(basename "$ROOT")"
CONFIG="$ROOT/.devcontainer/devcontainer.json"

SSH_CONFIG_DIR="$HOME/.config/mise-devcontainers/ssh"

# -----------------------------------------------------------------------------
# Project
# -----------------------------------------------------------------------------

# Read the distro name from the image configured in devcontainer.json.
DISTRO="$(
  sed -n \
    's#.*"image"[[:space:]]*:[[:space:]]*"ghcr.io/mkvlrn/mise-devcontainer-\([^:"]*\).*#\1#p' \
    "$CONFIG"
)"

[ -n "$DISTRO" ] || {
  echo "Error: could not determine distro from devcontainer.json" >&2
  exit 1
}

# Recreate the same stable SSH target used by up.sh.
PROJECT_HASH="$(
  printf '%s' "$ROOT" |
    git hash-object --stdin |
    cut -c1-8
)"

SSH_TARGET="mise-devcontainer-${DISTRO}-${PROJECT}-${PROJECT_HASH}"
SSH_CONFIG="$SSH_CONFIG_DIR/$SSH_TARGET.conf"

# -----------------------------------------------------------------------------
# Container
# -----------------------------------------------------------------------------

# Find the Docker container belonging to this workspace.
CONTAINER_ID="$(
  docker container ls -aq \
    --filter "label=devcontainer.local_folder=$ROOT" |
    head -n 1
)"

IMAGE_ID=""

# Remember the temporary image before removing the container that references it.
if [ -n "$CONTAINER_ID" ]; then
  IMAGE_ID="$(
    docker inspect \
      --format '{{.Image}}' \
      "$CONTAINER_ID"
  )"

  echo "🗑️ Removing dev container..."
  docker rm -f "$CONTAINER_ID" >/dev/null
fi

# -----------------------------------------------------------------------------
# SSH
# -----------------------------------------------------------------------------

# Remove the SSH target created for this project.
rm -f "$SSH_CONFIG"

# -----------------------------------------------------------------------------
# Image
# -----------------------------------------------------------------------------

# Remove the temporary image created by the Dev Container CLI.
if [ -n "$IMAGE_ID" ]; then
  echo "🗑️ Removing temporary image..."
  docker image rm "$IMAGE_ID" >/dev/null 2>&1 || true
fi

# -----------------------------------------------------------------------------
# Feedback
# -----------------------------------------------------------------------------

echo "✓ Dev container removed."
