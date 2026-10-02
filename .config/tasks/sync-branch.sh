#!/usr/bin/env bash
#MISE description="Sync tool versions"

set -euo pipefail

mise install
mise prune -y
