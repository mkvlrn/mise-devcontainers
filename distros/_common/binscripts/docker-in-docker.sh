#!/bin/sh
set -e

dockerd >/dev/null 2>&1 &
DOCKERD_PID=$!

"$@" &
COMMAND_PID=$!

cleanup() {
  kill "$COMMAND_PID" "$DOCKERD_PID" 2>/dev/null || true
  wait "$COMMAND_PID" "$DOCKERD_PID" 2>/dev/null || true
}

trap cleanup TERM INT

until docker info >/dev/null 2>&1; do
  sleep 1
done

wait "$COMMAND_PID"
