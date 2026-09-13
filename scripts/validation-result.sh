#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

declare -A RESULTS=(
  ["detect-changes"]="${DETECT_CHANGES_RESULT:-}"
  ["build-image"]="${BUILD_IMAGE_RESULT:-}"
  ["create-template"]="${CREATE_TEMPLATE_RESULT:-}"
  ["test-template"]="${TEST_TEMPLATE_RESULT:-}"
)

failed=false
for job in "${!RESULTS[@]}"; do
  result="${RESULTS[$job]}"
  if [ -z "$result" ]; then
    echo "Error: environment variable for $job result is not set" >&2
    failed=true
  elif [ "$result" != "success" ] && [ "$result" != "skipped" ]; then
    echo "Error: $job finished with result: $result" >&2
    failed=true
  fi
done

if [ "$failed" = true ]; then
  die "validation failed"
fi

log "All validation jobs succeeded or were skipped."
