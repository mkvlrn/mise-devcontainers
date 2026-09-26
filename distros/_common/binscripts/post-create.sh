#!/bin/sh
set -e

# set zsh completions
if command -v mise >/dev/null 2>&1; then
  mise completion zsh >~/.config/zsh/completions/_mise
fi
if command -v gh >/dev/null 2>&1; then
  gh completion -s zsh >~/.config/zsh/completions/_gh
fi
