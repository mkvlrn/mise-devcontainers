#!/bin/sh
set -e

# vars
DISTRO=""
NOCACHE_FLAG=""
CACHE_FLAGS=""
PUSH_FLAG=""

# parse arguments
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
    --no-cache)
        NOCACHE_FLAG="--no-cache"
        shift
        ;;
    --push)
        PUSH_FLAG="--push"
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

IMAGE_NAME="mkvlrn/mise-devcontainer-${DISTRO}"
CALVER="$(date +%Y.%m.%d-%H%M%S)"

if [ -n "$PUSH_FLAG" ]; then
    CACHE_FLAGS="--cache-from type=registry,ref=${IMAGE_NAME}:buildcache --cache-to type=registry,ref=${IMAGE_NAME}:buildcache,mode=max"
fi

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
    -f "./distros/${DISTRO}/Dockerfile" \
    .

# cleanup old tags and prune
docker images "$IMAGE_NAME" --format '{{.Repository}}:{{.Tag}}' |
    grep -v -E ":(latest|current|$CALVER)$" |
    xargs -r docker rmi --force 2>/dev/null || true
docker image prune -f 2>/dev/null || true
echo "==> Done!"
