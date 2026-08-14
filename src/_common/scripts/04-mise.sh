#!/bin/sh
set -e

# install latest mise
su -l dev -c "curl https://mise.run | sh"

# install base tools listed in ~/.config/mise/config.toml
su -l dev -c "env MISE_GITHUB_TOKEN='$MISE_GITHUB_TOKEN' PATH='/home/dev/.local/bin:\$PATH' mise install"
