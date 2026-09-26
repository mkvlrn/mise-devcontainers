#!/bin/sh

set -e

# install base tools for a working system
apk add --no-cache \
  bash \
  ca-certificates \
  curl \
  docker \
  docker-cli-compose \
  gcompat \
  git \
  htop \
  less \
  libatomic \
  libstdc++ \
  openssh-client \
  shadow \
  sudo \
  tzdata \
  zsh

# normalize zsh location for the configured login shell
ZSH_PATH="$(command -v zsh)"
if [ "$ZSH_PATH" != /bin/zsh ] && [ ! -e /bin/zsh ]; then
  ln -s "$ZSH_PATH" /bin/zsh
fi
