#!/bin/sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

exec devcontainer exec \
  --workspace-folder "$ROOT" \
  fish -l
