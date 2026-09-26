#!/bin/sh
set -e

# mise lifecycle
mise self-update -y || true
mise cache clear || true
mise prune -y || true
mise install || true
mise completion zsh >~/.config/zsh/completions/_mise
mise settings set all_compile false
mise settings set libc musl
