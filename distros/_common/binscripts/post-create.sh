#!/bin/sh
set -e

# set fish completions
mkdir -p ~/.config/fish/completions
if command -v mise >/dev/null 2>&1; then
  mise completion fish >~/.config/fish/completions/mise.fish
fi
if command -v gh >/dev/null 2>&1; then
  gh completion -s fish >~/.config/fish/completions/gh.fish
fi
