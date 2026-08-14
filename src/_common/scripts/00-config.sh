#!/bin/sh
set -e

# copy user configuration
mkdir -p /home/dev/.config
cp -a /tmp/.config/. /home/dev/.config/
