#!/bin/sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

. "$SCRIPT_DIR/lib.sh"

IMAGE_ID=""

# stop and remove devcontainer
if container_exists; then
  IMAGE_ID="$(
    docker inspect \
      --format '{{.Image}}' \
      "$CONTAINER"
  )"

  echo "🗑️ Removing dev container..."
  docker rm -f "$CONTAINER" >/dev/null
fi

# remove ssh target
remove_ssh_entry

# remove image created by the Dev Container CLI
if [ -n "$IMAGE_ID" ]; then
  echo "🗑️ Removing temporary image..."
  docker image rm "$IMAGE_ID" >/dev/null 2>&1 || true
fi

# feedback
echo "✓ Dev container removed."
