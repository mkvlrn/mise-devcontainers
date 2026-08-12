#!/bin/sh
set -e

TEMP_DIR="$(mktemp -d)"
TEST_CONFIG="$TEMP_DIR/devcontainer.json"
ROOT="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$ROOT/install/devcontainer.json"
DISTRO=""

while [ "$#" -gt 0 ]; do
    case "$1" in
    --distro)
        [ "$#" -ge 2 ] || {
            echo "Error: --distro requires a value" >&2
            exit 1
        }
        DISTRO="$2"
        shift 2
        ;;
    *)
        echo "Error: unknown option: $1" >&2
        exit 1
        ;;
    esac
done

[ -n "$DISTRO" ] || {
    echo "Error: --distro is required" >&2
    exit 1
}
DISTRO_DIR="./distros/${DISTRO}"
[ -d "$DISTRO_DIR" ] || {
    echo "Error: distro '$DISTRO' does not exist" >&2
    exit 1
}

IMAGE="mkvlrn/mise-devcontainer-${DISTRO}:current"
PROJECT="$(basename "$ROOT")"
CONTAINER="mise-devcontainer-${DISTRO}-${PROJECT}"

sed \
    -e 's#"image"[[:space:]]*:[[:space:]]*"[^"]*"#"image": "'"$IMAGE"'"#' \
    -e 's#mise-devcontainer-${localWorkspaceFolderBasename}#mise-devcontainer-'"$DISTRO"'-${localWorkspaceFolderBasename}#g' \
    "$CONFIG" \
    >"$TEST_CONFIG"

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true

devcontainer up \
    --workspace-folder "$ROOT" \
    --config "$TEST_CONFIG"

docker exec -it \
    --user dev \
    -w "/code/mise-devcontainers" \
    "$CONTAINER" \
    fish

rm -rf "$TEMP_DIR"
