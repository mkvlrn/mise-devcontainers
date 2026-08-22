#!/bin/sh
set -e

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

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
