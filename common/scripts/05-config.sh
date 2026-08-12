#!/bin/sh
set -e

# copy user configuration
cp -r /tmp/.config /home/dev/.config

# set ownership
chown -R dev:dev /home/dev/.config
