#!/usr/bin/env bash
#MISE description="Format shell scripts with shfmt"

set -euo pipefail

mise exec -- shfmt -w scripts test "$@"
