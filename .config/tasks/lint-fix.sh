#!/usr/bin/env bash
#MISE description="Format shell scripts with shfmt"

mise exec -- shfmt -w scripts test "$@"
