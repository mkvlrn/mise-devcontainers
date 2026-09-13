#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

DISTRO=""
CANDIDATE_TAG=""
IMAGE_VERSION=""

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
  --imageVersion)
    [ "$#" -ge 2 ] || die "--imageVersion requires a value"
    IMAGE_VERSION="$2"
    shift 2
    ;;
  *)
    die "unknown argument: $1"
    ;;
  esac
done

[ -n "$DISTRO" ] || die "--distro is required"
[ -n "$CANDIDATE_TAG" ] || die "--candidateTag is required"
[ -n "$IMAGE_VERSION" ] || die "--imageVersion is required"
validate_distro "$DISTRO"

IMAGE_REF="$(image_ref "$DISTRO")"
CANDIDATE_REF="${IMAGE_REF}:${CANDIDATE_TAG}"

log "Promoting image for $DISTRO: $CANDIDATE_REF -> $IMAGE_VERSION, latest, current..."

docker buildx imagetools create \
  --prefer-index=false \
  -t "${IMAGE_REF}:${IMAGE_VERSION}" \
  -t "${IMAGE_REF}:latest" \
  -t "${IMAGE_REF}:current" \
  "${CANDIDATE_REF}"

log "Image promotion complete for $DISTRO."
