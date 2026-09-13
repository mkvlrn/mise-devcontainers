#!/bin/sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=test/_common/util.sh
. "$SCRIPT_DIR/../_common/util.sh"
# shellcheck source=test/_common/base.sh
. "$SCRIPT_DIR/../_common/base.sh"

# distro-specific tests go here

report_results
