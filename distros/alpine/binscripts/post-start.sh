#!/bin/sh
set -e

# set fish completions
if command -v glab >/dev/null 2>&1; then
  glab completion -s fish >~/.config/fish/completions/glab.fish
fi
if command -v mise >/dev/null 2>&1; then
  # mise lifecycle
  mise self-update -y || true
  mise cache clear || true
  mise prune -y || true
  mise install || true
  mise completion fish >~/.config/fish/completions/mise.fish
  mise settings set all_compile false
  mise settings set libc musl
fi
if command -v pnpm >/dev/null 2>&1; then
  pnpm completion fish >~/.config/fish/completions/pnpm.fish
fi
if command -v gh >/dev/null 2>&1; then
  gh completion -s fish >~/.config/fish/completions/gh.fish
fi
