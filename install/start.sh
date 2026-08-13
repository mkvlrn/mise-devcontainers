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
RECREATE=false
REMOVE_EXISTING=""
WORKSPACE_FOLDER="$(
    devcontainer read-configuration --workspace-folder "$ROOT" |
        grep '"workspaceFolder"' |
        sed 's/.*"workspaceFolder"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/'
)"

for arg in "$@"; do
    case "$arg" in
    --recreate)
        RECREATE=true
        ;;
    esac
done

if [ "$RECREATE" = true ]; then
    REMOVE_EXISTING="--remove-existing-container"
    echo "🔄 Recreating dev container..."
elif docker container inspect "$CONTAINER" >/dev/null 2>&1; then
    echo "▶️ Starting existing dev container..."
else
    echo "🚀 Creating dev container..."
fi

devcontainer up \
    --workspace-folder "$ROOT" \
    $REMOVE_EXISTING \
    2>/dev/null

docker exec -it \
    --user dev \
    -w "$WORKSPACE_FOLDER" \
    "$CONTAINER" \
    fish
