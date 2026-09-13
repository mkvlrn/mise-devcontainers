#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

DISTRO=""

while [ "$#" -gt 0 ]; do
  case "$1" in
  --distro)
    [ "$#" -ge 2 ] || die "--distro requires a value"
    DISTRO="$2"
    shift 2
    ;;
  *)
    die "unknown argument: $1"
    ;;
  esac
done

[ -n "$DISTRO" ] || die "--distro is required"
validate_distro "$DISTRO"

TEMPLATE_OUTPUT_DIR="$(publish_template_dir "$DISTRO")"
TEST_SUITE_FILE="$ROOT/test/$DISTRO/test.sh"
TEST_EXECUTION_DIR="$(test_execution_dir "$DISTRO")"

[ -d "$TEMPLATE_OUTPUT_DIR" ] || die "template directory for $DISTRO doesn't exist ($TEMPLATE_OUTPUT_DIR)"
[ -f "$TEST_SUITE_FILE" ] || die "test suite for $DISTRO doesn't exist ($TEST_SUITE_FILE)"

# Host SSH environment preparation
mkdir -p "$HOME/.ssh"
SIGNING_KEY="$HOME/.ssh/id_ed25519_signing"
CREATED_SIGNING_KEY=false
STARTED_SSH_AGENT=false

if [ ! -f "$SIGNING_KEY" ]; then
  log "Generating temporary SSH test key..."
  ssh-keygen -q -t ed25519 -N "" -f "$SIGNING_KEY"
  CREATED_SIGNING_KEY=true
fi

if [ -z "${SSH_AUTH_SOCK:-}" ]; then
  log "Starting temporary SSH agent..."
  eval "$(ssh-agent -s)" >/dev/null
  STARTED_SSH_AGENT=true
fi

ssh-add "$SIGNING_KEY" >/dev/null 2>&1 || true

cleanup() {
  log "Cleaning up test environment..."
  if [ -d "$TEST_EXECUTION_DIR/.devcontainer" ]; then
    "$TEST_EXECUTION_DIR/.devcontainer/down.sh" 2>/dev/null || true
  fi
  if [ "$STARTED_SSH_AGENT" = true ] && [ -n "${SSH_AGENT_PID:-}" ]; then
    kill "$SSH_AGENT_PID" 2>/dev/null || true
  fi
  if [ "$CREATED_SIGNING_KEY" = true ]; then
    rm -f "$SIGNING_KEY" "${SIGNING_KEY}.pub"
  fi
  rm -rf "$TEST_EXECUTION_DIR"
}

trap cleanup EXIT INT TERM

# Prepare test execution directory
log "Setting up test workspace in $TEST_EXECUTION_DIR..."
rm -rf "$TEST_EXECUTION_DIR"
mkdir -p "$TEST_EXECUTION_DIR"
cp -a "$TEMPLATE_OUTPUT_DIR/.devcontainer" "$TEST_EXECUTION_DIR/"
chmod 755 "$TEST_EXECUTION_DIR/.devcontainer/"*.sh
cp -a "$ROOT/test" "$TEST_EXECUTION_DIR/"

# Start devcontainer
log "Starting devcontainer for $DISTRO..."
"$TEST_EXECUTION_DIR/.devcontainer/up.sh"

# Run tests inside container workspace
log "Running template tests for $DISTRO..."
"$TEST_EXECUTION_DIR/.devcontainer/shell.sh" sh -lc "./test/$DISTRO/test.sh"

log "Template tests passed for $DISTRO!"
