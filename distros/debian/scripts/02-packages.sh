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
  libatomic1

# add fish apt repo and install fish
echo 'deb http://download.opensuse.org/repositories/shells:/fish:/release:/4/Debian_13/ /' | tee /etc/apt/sources.list.d/shells:fish:release:4.list
curl -fsSL https://download.opensuse.org/repositories/shells:fish:release:4/Debian_13/Release.key | gpg --dearmor | tee /etc/apt/trusted.gpg.d/shells_fish_release_4.gpg >/dev/null
apt-get update
apt-get install -y --no-install-recommends fish

# cleanup
apt-get clean
rm -rf \
  /var/lib/apt/lists/* \
  /var/cache/apt/*
