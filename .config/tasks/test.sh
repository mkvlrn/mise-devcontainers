#!/usr/bin/env bash
#MISE description="Run test suite"

set -euo pipefail

./test/publish-template-test.sh "$@"
