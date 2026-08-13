#!/bin/sh
set -e

dockerd >/dev/null 2>&1 &
DOCKERD_PID=$!

trap 'kill "$DOCKERD_PID"' TERM INT

until docker info >/dev/null 2>&1; do
    sleep 1
done

/usr/sbin/sshd

exec "$@"
