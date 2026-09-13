#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

TOKEN="${GITHUB_TOKEN:-}"
REPOSITORY="${GITHUB_REPOSITORY:-}"
EVENT_PATH="${GITHUB_EVENT_PATH:-}"

[ -n "$TOKEN" ] || die "GITHUB_TOKEN environment variable is required"
[ -n "$REPOSITORY" ] || die "GITHUB_REPOSITORY environment variable is required"
[ -n "$EVENT_PATH" ] && [ -f "$EVENT_PATH" ] || die "GITHUB_EVENT_PATH is required and must exist"

HEAD_SHA="$(jq -r '.pull_request.head.sha // empty' "$EVENT_PATH")"
[ -n "$HEAD_SHA" ] || die "could not parse head SHA from $EVENT_PATH"

log "Finding successful validation run for head SHA $HEAD_SHA in $REPOSITORY..."

API_URL="https://api.github.com/repos/${REPOSITORY}/actions/workflows/validate.yml/runs?event=pull_request&status=success&head_sha=${HEAD_SHA}&per_page=1"

RESPONSE="$(curl -fsSL \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-GitHub-Api-Version: 2026-03-10" \
  "$API_URL")"

RUN_ID="$(echo "$RESPONSE" | jq -r '.workflow_runs[0].id // empty')"

if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then
  die "could not find successful validation for head SHA $HEAD_SHA"
fi

log "Found validation run ID: $RUN_ID"
write_github_output "run_id" "$RUN_ID"
