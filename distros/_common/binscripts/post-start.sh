#!/bin/sh
set -e

# mise lifecycle
mise self-update -y || true
mise cache clear || true
mise prune -y || true
mise install || true
