#!/bin/sh
set -e

# vars
DISTROS=""

# return all available distros as json
all_distros() {
    find src \
        -mindepth 1 \
        -maxdepth 1 \
        -type d \
        ! -name '_common' \
        -printf '"%f"\n' |
        paste -sd, -
}

# manual runs
if [ "$GITHUB_EVENT_NAME" = "workflow_dispatch" ]; then
    if [ "$INPUT_DISTRO" = "all" ]; then
        echo "distros=[$(all_distros)]" >>"$GITHUB_OUTPUT"
    else
        echo "distros=[\"$INPUT_DISTRO\"]" >>"$GITHUB_OUTPUT"
    fi
    exit 0
fi

# ignore non-renovate or unmerged pull requests
MERGED="$(jq -r '.pull_request.merged' "$GITHUB_EVENT_PATH")"
AUTHOR="$(jq -r '.pull_request.user.login' "$GITHUB_EVENT_PATH")"
if [ "$MERGED" != "true" ] || [ "$AUTHOR" != "renovate[bot]" ]; then
    echo "distros=[]" >>"$GITHUB_OUTPUT"
    exit 0
fi

# get changed files
BASE_SHA="$(jq -r '.pull_request.base.sha' "$GITHUB_EVENT_PATH")"
MERGE_SHA="$(jq -r '.pull_request.merge_commit_sha' "$GITHUB_EVENT_PATH")"
git diff --name-only \
    "$BASE_SHA" \
    "$MERGE_SHA" \
    >/tmp/changed-files

# common changes rebuild all distros
if grep -q '^src/_common/' /tmp/changed-files; then
    echo "distros=[$(all_distros)]" >>"$GITHUB_OUTPUT"
    exit 0
fi

# collect changed distros
for distro in $(find src -mindepth 1 -maxdepth 1 -type d ! -name '_common' -printf '%f\n'); do
    if grep -q "^src/${distro}/" /tmp/changed-files; then
        DISTROS="${DISTROS}${DISTROS:+ }${distro}"
    fi
done

# output json matrix
if [ -z "$DISTROS" ]; then
    echo "distros=[]" >>"$GITHUB_OUTPUT"
else
    JSON=""

    for distro in $DISTROS; do
        JSON="${JSON}${JSON:+,}\"${distro}\""
    done

    echo "distros=[$JSON]" >>"$GITHUB_OUTPUT"
fi
