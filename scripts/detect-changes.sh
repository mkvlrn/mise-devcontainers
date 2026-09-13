#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

EVENT_PATH="${GITHUB_EVENT_PATH:-}"
BASE_SHA="${BASE_SHA:-}"
HEAD_SHA="${HEAD_SHA:-}"

if [ -n "$EVENT_PATH" ] && [ -f "$EVENT_PATH" ]; then
  if [ -z "$BASE_SHA" ]; then
    BASE_SHA="$(jq -r '.pull_request.base.sha // empty' "$EVENT_PATH")"
  fi
  if [ -z "$HEAD_SHA" ]; then
    HEAD_SHA="$(jq -r '.pull_request.head.sha // empty' "$EVENT_PATH")"
  fi
fi

if [ -z "$BASE_SHA" ] || [ -z "$HEAD_SHA" ]; then
  log "GITHUB_EVENT_PATH or BASE_SHA/HEAD_SHA not fully specified, defaulting to HEAD~1...HEAD"
  BASE_SHA="${BASE_SHA:-HEAD~1}"
  HEAD_SHA="${HEAD_SHA:-HEAD}"
fi

log "Detecting changes between $BASE_SHA and $HEAD_SHA..."
mapfile -t CHANGED_FILES < <(git diff --name-only "$BASE_SHA...$HEAD_SHA" 2>/dev/null || git diff --name-only "$BASE_SHA" "$HEAD_SHA")

rebuild_all=false
for file in "${CHANGED_FILES[@]}"; do
  if [[ "$file" == distros/_common/* ]] || [[ "$file" == templates/_common/* ]] || [ "$file" = ".rebuild-all" ]; then
    rebuild_all=true
    break
  fi
done

CHANGED_DISTROS=()
if [ "$rebuild_all" = true ]; then
  CHANGED_DISTROS=("${DISTRO_LIST[@]}")
else
  for distro in "${DISTRO_LIST[@]}"; do
    for file in "${CHANGED_FILES[@]}"; do
      if [[ "$file" == "distros/$distro/"* ]] || [[ "$file" == "templates/$distro/"* ]]; then
        CHANGED_DISTROS+=("$distro")
        break
      fi
    done
  done
fi

if [ "${#CHANGED_DISTROS[@]}" -eq 0 ]; then
  DISTROS_JSON="[]"
else
  DISTROS_JSON="$(printf '%s\n' "${CHANGED_DISTROS[@]}" | jq -R . | jq -s -c .)"
fi

RUN_ID="${GITHUB_RUN_ID:-0}"
RUN_ATTEMPT="${GITHUB_RUN_ATTEMPT:-1}"
CANDIDATE_TAG="ci-${RUN_ID}-${RUN_ATTEMPT}"
IMAGE_VERSION="$(date -u +%Y.%-m.%-d-%-H.%-M.%-S)"

log "Changed distros: $DISTROS_JSON"
log "Candidate tag: $CANDIDATE_TAG"
log "Image version: $IMAGE_VERSION"

write_github_output "distros" "$DISTROS_JSON"
write_github_output "candidate_tag" "$CANDIDATE_TAG"
write_github_output "image_version" "$IMAGE_VERSION"
