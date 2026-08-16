#!/bin/sh
set -e

# ssh setup
mkdir -p /home/dev/.ssh
ssh-add -L >/home/dev/.ssh/authorized_keys
chown dev:dev /home/dev/.ssh
chown dev:dev /home/dev/.ssh/authorized_keys
chmod 700 /home/dev/.ssh
chmod 600 /home/dev/.ssh/authorized_keys

# mise lifecycle
mise self-update -y || true
mise cache clear || true
mise prune -y || true
mise install || true
