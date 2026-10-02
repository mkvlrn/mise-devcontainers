#!/usr/bin/env bash
#MISE description="Install Lefthook git hooks"

set -euo pipefail

mise exec -- lefthook install
