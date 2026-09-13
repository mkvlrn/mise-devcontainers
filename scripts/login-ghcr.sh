#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

USERNAME="${GHCR_USERNAME:-}"
TOKEN="${GITHUB_TOKEN:-}"

[ -n "$USERNAME" ] || die "GHCR_USERNAME environment variable is required"
[ -n "$TOKEN" ] || die "GITHUB_TOKEN environment variable is required"

log "Logging in to ghcr.io as $USERNAME..."
printf '%s' "$TOKEN" | docker login ghcr.io --username "$USERNAME" --password-stdin

log "GHCR login successful."
