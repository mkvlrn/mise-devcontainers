#!/bin/sh
set -e

export DEBIAN_FRONTEND=noninteractive

# install base tools for a working system
apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  docker.io \
  docker-cli \
  docker-buildx \
  docker-compose \
  git \
  gnupg \
  htop \
  less \
  openssh-client \
  sudo \
  tzdata \
  libatomic1 \
  zsh

# cleanup
apt-get clean
rm -rf \
  /var/lib/apt/lists/* \
  /var/cache/apt/*
