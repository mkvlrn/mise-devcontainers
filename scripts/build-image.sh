#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

DISTRO=""
CANDIDATE_TAG=""
NO_CACHE=false

while [ "$#" -gt 0 ]; do
  case "$1" in
  --distro)
    [ "$#" -ge 2 ] || die "--distro requires a value"
    DISTRO="$2"
    shift 2
    ;;
  --candidateTag)
    [ "$#" -ge 2 ] || die "--candidateTag requires a value"
    CANDIDATE_TAG="$2"
    shift 2
    ;;
  --no-cache)
    NO_CACHE=true
    shift
    ;;
  *)
    die "unknown argument: $1"
    ;;
  esac
done

[ -n "$DISTRO" ] || die "--distro is required"
[ -n "$CANDIDATE_TAG" ] || die "--candidateTag is required"
validate_distro "$DISTRO"

COMMON_DIR="$(distros_dir "_common")"
DISTRO_DIR="$(distros_dir "$DISTRO")"
OUTPUT_DIR="$(build_image_dir "$DISTRO")"
IMAGE_REF="$(image_ref "$DISTRO")"

log "Preparing build files for $DISTRO in $OUTPUT_DIR..."
prepare_overlay "$COMMON_DIR" "$DISTRO_DIR" "$OUTPUT_DIR"

log "Merging Dockerfiles for $DISTRO..."
cat "$DISTRO_DIR/Dockerfile" "$COMMON_DIR/Dockerfile" >"$OUTPUT_DIR/Dockerfile"

DOCKER_ARGS=(
  "buildx" "build"
  "--push"
  "--cache-from" "type=registry,ref=${IMAGE_REF}:buildcache"
  "--cache-to" "type=registry,ref=${IMAGE_REF}:buildcache,mode=max"
  "--secret" "id=mise_github_token,env=MISE_GITHUB_TOKEN"
)

if [ "$NO_CACHE" = true ]; then
  DOCKER_ARGS+=("--no-cache")
fi

DOCKER_ARGS+=(
  "-t" "${IMAGE_REF}:${CANDIDATE_TAG}"
  "-f" "${OUTPUT_DIR}/Dockerfile"
  "${OUTPUT_DIR}"
)

log "Building image ${IMAGE_REF}:${CANDIDATE_TAG}..."
docker "${DOCKER_ARGS[@]}"

log "Build complete for $DISTRO!"
