#!/bin/sh
set -e

# vars
DISTRO="$1"
BUILD_DIR=".build-template"
PUBLISH_DIR=".publish-template"

[ -n "$DISTRO" ] || {
    echo "Error: distro is required" >&2
    exit 1
}

TEMPLATE_DIR="$BUILD_DIR/$DISTRO"

[ -d "$TEMPLATE_DIR" ] || {
    echo "Error: template '$DISTRO' has not been created" >&2
    exit 1
}

# prepare single-template collection
rm -rf "$PUBLISH_DIR"
mkdir -p "$PUBLISH_DIR"
cp -a "$TEMPLATE_DIR" "$PUBLISH_DIR/$DISTRO"

trap 'rm -rf "$PUBLISH_DIR"' EXIT

# publish template
echo "==> Publishing template..."
devcontainer templates publish \
    --registry ghcr.io \
    --namespace mkvlrn/mise-devcontainers \
    "$PUBLISH_DIR"

echo "==> Done!"
