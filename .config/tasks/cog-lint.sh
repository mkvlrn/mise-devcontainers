#!/usr/bin/env bash
#MISE description="Verify the commit message"

set -euo pipefail

mise exec -- cog verify --file "$1"
