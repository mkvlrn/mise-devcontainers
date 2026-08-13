#!/bin/sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="$(basename "$ROOT")"
CONFIG="$ROOT/.devcontainer/devcontainer.json"
SSH_CONFIG="$HOME/.config/mise-devcontainers/ssh_config"

DISTRO="$(
    sed -n 's#.*"image"[[:space:]]*:[[:space:]]*"ghcr.io/mkvlrn/mise-devcontainer-\([^:"]*\).*#\1#p' "$CONFIG"
)"

[ -n "$DISTRO" ] || {
    echo "Error: could not determine distro from devcontainer.json" >&2
    exit 1
}

CONTAINER="mise-devcontainer-${DISTRO}-${PROJECT}"
IMAGE_ID="$(
    docker inspect \
        --format '{{.Image}}' \
        "$CONTAINER" 2>/dev/null
)"

# Stop and remove the container if it exists.
if docker container inspect "$CONTAINER" >/dev/null 2>&1; then
    echo "🗑️ Removing dev container..."
    docker rm -f "$CONTAINER" >/dev/null
fi

# Remove the container's SSH target if it exists.
if [ -f "$SSH_CONFIG" ]; then
    awk -v host="$CONTAINER" '
        $1 == "Host" && $2 == host { skip = 1; next }
        skip && $1 == "Host" { skip = 0 }
        !skip { print }
    ' "$SSH_CONFIG" >"${SSH_CONFIG}.tmp"

    mv "${SSH_CONFIG}.tmp" "$SSH_CONFIG"
fi

# Remove the image created by the devcontainer CLI.
if [ -n "$IMAGE_ID" ]; then
    docker image rm "$IMAGE_ID" >/dev/null 2>&1 || true
fi

echo "✓ Dev container removed."
