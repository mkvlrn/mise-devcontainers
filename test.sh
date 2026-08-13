#!/bin/sh
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
TEMP_DIR="$(mktemp -d)"

trap 'rm -rf "$TEMP_DIR"' EXIT

cd "$TEMP_DIR"

"$ROOT/install.sh" "$@"

"$TEMP_DIR/.devcontainer/start.sh" --recreate
