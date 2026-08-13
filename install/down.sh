#!/bin/sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="$(basename "$ROOT")"
CONFIG="$ROOT/.devcontainer/devcontainer.json"

DISTRO="$(
    sed -n 's#.*"image"[[:space:]]*:[[:space:]]*"ghcr.io/mkvlrn/mise-devcontainer-\([^:"]*\).*#\1#p' "$CONFIG"
)"

[ -n "$DISTRO" ] || {
    echo "Error: could not determine distro from devcontainer.json" >&2
    exit 1
}

CONTAINER="mise-devcontainer-${DISTRO}-${PROJECT}"

if docker container inspect "$CONTAINER" >/dev/null 2>&1; then
    echo "⏹️ Stopping dev container..."
    docker stop "$CONTAINER" >/dev/null
    echo "✓ Dev container stopped."
else
    echo "Dev container does not exist."
fi
