#!/bin/sh
set -e

# mise lifecycle
mise self-update -y || true
mise cache clear || true
mise prune -y || true
mise install || true
mise completion fish >~/.config/fish/completions/mise.fish
mise settings set all_compile false
mise settings set libc musl
