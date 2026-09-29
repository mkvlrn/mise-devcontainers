#!/usr/bin/env bash
#MISE description="Check shell scripts with shellcheck"

mise exec -- shellcheck -x scripts/*.sh test/_common/*.sh test/*/*.sh test/publish-template-test.sh "$@"
