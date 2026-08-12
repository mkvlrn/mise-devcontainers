#!/bin/sh
set -e

# set fish completions
if command -v glab >/dev/null 2>&1; then
    glab completion -s fish >~/.config/fish/completions/glab.fish
fi
if command -v mise >/dev/null 2>&1; then
    mise completion fish >~/.config/fish/completions/mise.fish
fi
if command -v pnpm >/dev/null 2>&1; then
    pnpm completion fish >~/.config/fish/completions/pnpm.fish
fi
if command -v gh >/dev/null 2>&1; then
    gh completion -s fish >~/.config/fish/completions/gh.fish
fi
