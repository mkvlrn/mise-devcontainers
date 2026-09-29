#!/bin/sh
set -e

# install latest Antidote
rm -rf /home/dev/.antidote
git clone --depth=1 https://github.com/mattmc3/antidote.git /home/dev/.antidote
chown -R dev:dev /home/dev/.antidote
