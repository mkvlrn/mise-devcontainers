#!/bin/sh
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
DISTRO=""
REMOVE=false

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
    --remove)
        REMOVE=true
        shift
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

TEST_DIR="$ROOT/test/$DISTRO"

if [ "$REMOVE" = true ] && [ ! -d "$TEST_DIR" ]; then
    echo "Error: test does not exist: $DISTRO" >&2
    exit 1
fi

if [ "$REMOVE" = true ]; then
    if [ -x "$TEST_DIR/.devcontainer/remove.sh" ]; then
        "$TEST_DIR/.devcontainer/remove.sh"
    fi

    rm -rf "$TEST_DIR"
    exit 0
fi

rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

"$ROOT/install.sh" --distro "$DISTRO"

"$TEST_DIR/.devcontainer/up.sh" --recreate
