#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

DISTROS=""
CANDIDATE_TAG=""
IMAGE_VERSION=""
HEAD_SHA=""

while [ "$#" -gt 0 ]; do
  case "$1" in
  --distros)
    [ "$#" -ge 2 ] || die "--distros requires a value"
    DISTROS="$2"
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
  --headSha)
    [ "$#" -ge 2 ] || die "--headSha requires a value"
    HEAD_SHA="$2"
    shift 2
    ;;
  *)
    die "unknown argument: $1"
    ;;
  esac
done

[ -n "$DISTROS" ] || die "--distros is required"
[ -n "$CANDIDATE_TAG" ] || die "--candidateTag is required"
[ -n "$IMAGE_VERSION" ] || die "--imageVersion is required"
[ -n "$HEAD_SHA" ] || die "--headSha is required"

METADATA_DIR="$(validation_metadata_dir)"
rm -rf "$METADATA_DIR"
mkdir -p "$METADATA_DIR"

log "Saving validation metadata to $METADATA_DIR/metadata.json..."
jq -n \
  --argjson distros "$DISTROS" \
  --arg candidateTag "$CANDIDATE_TAG" \
  --arg imageVersion "$IMAGE_VERSION" \
  --arg headSha "$HEAD_SHA" \
  '{
    distros: $distros,
    candidateTag: $candidateTag,
    imageVersion: $imageVersion,
    headSha: $headSha
  }' >"$METADATA_DIR/metadata.json"

log "Validation metadata saved successfully."
