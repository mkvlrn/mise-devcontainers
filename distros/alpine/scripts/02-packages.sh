#!/bin/sh

set -e

# install base tools for a working system
apk add --no-cache \
  bash \
  ca-certificates \
  curl \
  docker \
  docker-cli-compose \
  fish \
  gcompat \
  git \
  htop \
  less \
  libatomic \
  libstdc++ \
  openssh-client \
  shadow \
  sudo \
  tzdata

# normalizing fish location
ln -s /usr/bin/fish /bin/fish
