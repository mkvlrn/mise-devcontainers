#!/bin/sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

. "$SCRIPT_DIR/lib.sh"

# stop devcontainer
if container_exists; then
    echo "⏹️ Stopping dev container..."
    docker stop "$CONTAINER" >/dev/null
    echo "✓ Dev container stopped."
else
    echo "Dev container does not exist."
fi
