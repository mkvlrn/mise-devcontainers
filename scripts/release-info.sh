#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

EVENT_PATH="${GITHUB_EVENT_PATH:-}"
[ -n "$EVENT_PATH" ] && [ -f "$EVENT_PATH" ] || die "GITHUB_EVENT_PATH is required and must exist"

HEAD_SHA="$(jq -r '.pull_request.head.sha // empty' "$EVENT_PATH")"
[ -n "$HEAD_SHA" ] || die "could not parse head SHA from $EVENT_PATH"

METADATA_FILE="$(validation_metadata_dir)/metadata.json"
[ -f "$METADATA_FILE" ] || die "validation metadata file not found at $METADATA_FILE"

SAVED_HEAD_SHA="$(jq -r '.headSha // empty' "$METADATA_FILE")"
if [ "$SAVED_HEAD_SHA" != "$HEAD_SHA" ]; then
  die "successful validation was for $SAVED_HEAD_SHA, but release head is $HEAD_SHA"
fi

DISTROS="$(jq -c '.distros' "$METADATA_FILE")"
CANDIDATE_TAG="$(jq -r '.candidateTag' "$METADATA_FILE")"
IMAGE_VERSION="$(jq -r '.imageVersion' "$METADATA_FILE")"

log "Loaded release info for head $HEAD_SHA:"
log "  distros: $DISTROS"
log "  candidate_tag: $CANDIDATE_TAG"
log "  image_version: $IMAGE_VERSION"

write_github_output "distros" "$DISTROS"
write_github_output "candidate_tag" "$CANDIDATE_TAG"
write_github_output "image_version" "$IMAGE_VERSION"
