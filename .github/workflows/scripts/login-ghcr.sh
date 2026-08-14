#!/bin/sh
set -e

[ -n "${GHCR_TOKEN:-}" ] || {
    echo "Error: GHCR_TOKEN is required" >&2
    exit 1
}

[ -n "${GHCR_USERNAME:-}" ] || {
    echo "Error: GHCR_USERNAME is required" >&2
    exit 1
}

echo "$GHCR_TOKEN" |
    docker login ghcr.io \
        -u "$GHCR_USERNAME" \
        --password-stdin
