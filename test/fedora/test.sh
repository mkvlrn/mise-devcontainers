#!/bin/sh

# generic, environment tests
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

. "$SCRIPT_DIR/_common/utils.sh"
. "$SCRIPT_DIR/_common/base.sh"

# distro-specific tests

report_results
