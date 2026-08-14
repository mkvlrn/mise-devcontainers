#!/bin/sh
set -e

# lib
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/lib.sh"

# vars
DISTRO=""
BUILD_DIR=".build-template"
TEST_DIR=".test-template"
CREATED_GITCONFIG=false
CREATED_SIGNING_KEY=false
STARTED_SSH_AGENT=false

# parse arguments
while [ "$#" -gt 0 ]; do
    case "$1" in
    --distro)
        [ "$#" -ge 2 ] || error "--distro requires a value"
        DISTRO="$2"
        shift 2
        ;;
    *)
        error "unknown option: $1"
        ;;
    esac
done

# set more vars
require_distro
[ -f "$ROOT/test/$DISTRO/test.sh" ] ||
    error "tests do not exist for distro '$DISTRO'"
BUILD_DIR="$ROOT/$BUILD_DIR/$DISTRO"
TEST_DIR="$ROOT/$TEST_DIR/$DISTRO"

# prepare host environment
mkdir -p "$HOME/.ssh"
if [ ! -e "$HOME/.gitconfig" ]; then
    touch "$HOME/.gitconfig"
    CREATED_GITCONFIG=true
fi
if [ ! -e "$HOME/.ssh/id_ed25519_signing" ]; then
    touch "$HOME/.ssh/id_ed25519_signing"
    CREATED_SIGNING_KEY=true
fi
if [ -z "${SSH_AUTH_SOCK:-}" ]; then
    eval "$(ssh-agent -s)" >/dev/null
    STARTED_SSH_AGENT=true
fi

# host environment cleanup
trap '
    [ "$STARTED_SSH_AGENT" = true ] && ssh-agent -k >/dev/null
    [ "$CREATED_SIGNING_KEY" = true ] && rm -f "$HOME/.ssh/id_ed25519_signing"
    [ "$CREATED_GITCONFIG" = true ] && rm -f "$HOME/.gitconfig"
' EXIT

# prepare test workspace
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
cp -a "$BUILD_DIR/.devcontainer" "$TEST_DIR/"
cp -a "$ROOT/test/_common" "$TEST_DIR/"
cp "$ROOT/test/$DISTRO/test.sh" "$TEST_DIR/test.sh"
chmod +x "$TEST_DIR/test.sh"

# start devcontainer
"$TEST_DIR/.devcontainer/up.sh" --recreate

# determine ssh target
PROJECT="$(basename "$TEST_DIR")"
CONTAINER="mise-devcontainer-${DISTRO}-${PROJECT}"

# wait for ssh
echo "==> Waiting for SSH..."
ATTEMPTS=0
until ssh -o ConnectTimeout=2 "$CONTAINER" true 2>/dev/null; do
    ATTEMPTS=$((ATTEMPTS + 1))

    if [ "$ATTEMPTS" -ge 5 ]; then
        echo "==> SSH diagnostics:" >&2
        docker exec "$CONTAINER" sh -c '
        /usr/sbin/sshd -T
        ' >&2 || true
        error "SSH did not become ready"
    fi

    sleep 1
done

# run tests inside the finished environment
TEST_RESULT=0
ssh "$CONTAINER" \
    "cd /code/$PROJECT && ./test.sh" ||
    TEST_RESULT=$?

# remove devcontainer and associated state
"$TEST_DIR/.devcontainer/remove.sh"

# report results
if [ "$TEST_RESULT" -ne 0 ]; then
    error "template tests failed"
fi
echo "==> Template tests passed!"
