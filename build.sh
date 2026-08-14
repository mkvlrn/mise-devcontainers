#!/bin/sh
set -e

# lib
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/lib.sh"

# vars
DISTRO=""
NOCACHE_FLAG=""
CACHE_FLAGS=""
PUSH_FLAG=""
BUILD_DIR=".build"

# parse arguments
while [ "$#" -gt 0 ]; do
    case "$1" in
    --distro)
        [ "$#" -ge 2 ] || error "--distro requires a value"
        DISTRO="$2"
        shift 2
        ;;
    --no-cache)
        NOCACHE_FLAG="--no-cache"
        shift
        ;;
    --push)
        PUSH_FLAG="--push"
        shift
        ;;
    *)
        error "unknown option: $1"
        ;;
    esac
done

# set more vars
require_distro
DISTRO_DIR="$ROOT/src/$DISTRO"
require_distro_dir "$DISTRO_DIR"
set_image_vars
IMAGE_NAME="$IMAGE_REF"
CALVER="$(date +%Y.%m.%d-%H%M%S)"
OUTPUT_DIR="$ROOT/$BUILD_DIR/$DISTRO"
if [ -n "$PUSH_FLAG" ]; then
    CACHE_FLAGS="--cache-from type=registry,ref=${IMAGE_NAME}:buildcache --cache-to type=registry,ref=${IMAGE_NAME}:buildcache,mode=max"
fi

# prepare build files
prepare_overlay \
    "$ROOT/src/_common" \
    "$DISTRO_DIR" \
    "$OUTPUT_DIR"
cat \
    "$DISTRO_DIR/Dockerfile" \
    "$ROOT/src/_common/Dockerfile" \
    >"$OUTPUT_DIR/Dockerfile"

# build
echo "==> Building image..."
docker buildx build \
    --secret id=mise_github_token,env=MISE_GITHUB_TOKEN \
    $NOCACHE_FLAG \
    $CACHE_FLAGS \
    $PUSH_FLAG \
    -t "${IMAGE_NAME}:${CALVER}" \
    -t "${IMAGE_NAME}:latest" \
    -t "${IMAGE_NAME}:current" \
    -f "${OUTPUT_DIR}/Dockerfile" \
    "$ROOT"

# cleanup old tags and prune
docker images "$IMAGE_NAME" --format '{{.Repository}}:{{.Tag}}' |
    grep -v -E ":(latest|current|$CALVER)$" |
    xargs -r docker rmi --force 2>/dev/null || true
docker image prune -f 2>/dev/null || true
echo "==> Done!"
