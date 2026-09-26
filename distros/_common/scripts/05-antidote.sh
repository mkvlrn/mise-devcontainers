#!/bin/sh
set -e

# install latest Antidote
rm -rf /usr/local/share/antidote
git clone --depth=1 https://github.com/mattmc3/antidote.git /usr/local/share/antidote
chmod -R a+rX /usr/local/share/antidote
