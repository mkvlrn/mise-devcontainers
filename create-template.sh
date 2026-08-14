#!/bin/sh
set -e

# lib
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/lib.sh"

# vars
DISTRO=""
BUILD_DIR=".build-template"
TEMPLATE_VERSION="$(date +%Y.%-m.%-d-%-H.%-M.%-S)"
PUSH=false
PUBLISH_DIR=".publish-template"

# parse arguments
while [ "$#" -gt 0 ]; do
    case "$1" in
    --distro)
        [ "$#" -ge 2 ] || error "--distro requires a value"
        DISTRO="$2"
        shift 2
        ;;
    --push)
        PUSH=true
        shift
        ;;
    *)
        error "unknown option: $1"
        ;;
    esac
done

# set more vars
require_distro
DISTRO_DIR="$ROOT/templates/$DISTRO"
require_distro_dir "$DISTRO_DIR"
set_image_vars
TAG="current"
OUTPUT_DIR="$ROOT/$BUILD_DIR/$DISTRO"
PUBLISH_DIR="$ROOT/$PUBLISH_DIR"

# create template unless an existing one is being pushed
if [ "$PUSH" != true ] || [ ! -d "$OUTPUT_DIR" ]; then
    # prepare template files
    prepare_overlay \
        "$ROOT/templates/_common" \
        "$DISTRO_DIR" \
        "$OUTPUT_DIR"

    # resolve image digest
    echo "==> Resolving ${IMAGE_REF}:${TAG}..."
    TOKEN="$(
        curl -fsSL \
            "https://ghcr.io/token?service=ghcr.io&scope=repository:${IMAGE}:pull" |
            sed -n 's/.*"token":"\([^"]*\)".*/\1/p'
    )"
    [ -n "$TOKEN" ] || error "failed to authenticate with GHCR"

    DIGEST="$(
        curl -fsSI \
            -H "Authorization: Bearer $TOKEN" \
            -H "Accept: application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json" \
            "https://ghcr.io/v2/${IMAGE}/manifests/${TAG}" |
            awk -F ': ' 'tolower($1) == "docker-content-digest" { gsub("\r", "", $2); print $2 }'
    )"
    [ -n "$DIGEST" ] || error "could not resolve ${IMAGE_REF}:${TAG}"

    # configure template
    sed \
        -e 's#"image"[[:space:]]*:[[:space:]]*"[^"]*"#"image": "'"${IMAGE_REF}:${TAG}@${DIGEST}"'"#' \
        -e 's#mise-devcontainer-${localWorkspaceFolderBasename}#mise-devcontainer-'"$DISTRO"'-${localWorkspaceFolderBasename}#g' \
        "$OUTPUT_DIR/.devcontainer/devcontainer.json" \
        >"$OUTPUT_DIR/.devcontainer/devcontainer.json.new"
    mv "$OUTPUT_DIR/.devcontainer/devcontainer.json.new" "$OUTPUT_DIR/.devcontainer/devcontainer.json"

    sed \
        -e 's#"version"[[:space:]]*:[[:space:]]*"[^"]*"#"version": "'"$TEMPLATE_VERSION"'"#' \
        "$OUTPUT_DIR/devcontainer-template.json" \
        >"$OUTPUT_DIR/devcontainer-template.json.new"
    mv "$OUTPUT_DIR/devcontainer-template.json.new" "$OUTPUT_DIR/devcontainer-template.json"
fi

# publish template
if [ "$PUSH" = true ]; then
    rm -rf "$PUBLISH_DIR"
    mkdir -p "$PUBLISH_DIR"
    cp -a "$OUTPUT_DIR" "$PUBLISH_DIR/$DISTRO"

    trap 'rm -rf "$PUBLISH_DIR"' EXIT

    echo "==> Publishing template..."
    devcontainer templates publish \
        --registry ghcr.io \
        --namespace mkvlrn/mise-devcontainers \
        "$PUBLISH_DIR"

    rm -rf "$PUBLISH_DIR"
    trap - EXIT
fi

echo "==> Done!"
