#!/bin/sh
set -e

REPO="mkvlrn/mise-devcontainers"
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

command -v curl >/dev/null 2>&1 || {
    echo "Error: curl is required" >&2
    exit 1
}

IMAGE="mkvlrn/mise-devcontainer-${DISTRO}"
TAG="current"
TARGET="$(pwd)/.devcontainer"
TMP_DIR="$(mktemp -d)"

trap 'rm -rf "$TMP_DIR"' EXIT

echo "==> Resolving ${IMAGE}:${TAG}..."

TOKEN="$(
    curl -fsSL \
        "https://auth.docker.io/token?service=registry.docker.io&scope=repository:${IMAGE}:pull" |
        sed -n 's/.*"token":"\([^"]*\)".*/\1/p'
)"

[ -n "$TOKEN" ] || {
    echo "Error: failed to authenticate with Docker Hub" >&2
    exit 1
}

DIGEST="$(
    curl -fsSI \
        -H "Authorization: Bearer $TOKEN" \
        -H "Accept: application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json" \
        "https://registry-1.docker.io/v2/${IMAGE}/manifests/${TAG}" |
        awk -F ': ' 'tolower($1) == "docker-content-digest" { gsub("\r", "", $2); print $2 }'
)"

[ -n "$DIGEST" ] || {
    echo "Error: could not resolve ${IMAGE}:${TAG}" >&2
    exit 1
}

echo "==> Downloading devcontainer files..."

curl -fsSL \
    "https://raw.githubusercontent.com/${REPO}/main/install/devcontainer.json" \
    -o "$TMP_DIR/devcontainer.json"

curl -fsSL \
    "https://raw.githubusercontent.com/${REPO}/main/install/start.sh" \
    -o "$TMP_DIR/start.sh"

sed \
    -e 's#"image"[[:space:]]*:[[:space:]]*"[^"]*"#"image": "'"${IMAGE}:${TAG}@${DIGEST}"'"#' \
    -e 's#mise-devcontainer-${localWorkspaceFolderBasename}#mise-devcontainer-'"$DISTRO"'-${localWorkspaceFolderBasename}#g' \
    "$TMP_DIR/devcontainer.json" \
    >"$TMP_DIR/devcontainer.json.new"

mv "$TMP_DIR/devcontainer.json.new" "$TMP_DIR/devcontainer.json"
chmod +x "$TMP_DIR/start.sh"

mkdir -p "$TARGET"

cp "$TMP_DIR/devcontainer.json" "$TARGET/devcontainer.json"
cp "$TMP_DIR/start.sh" "$TARGET/start.sh"

echo "==> Installed .devcontainer"
echo "==> Image: ${IMAGE}:${TAG}@${DIGEST}"
