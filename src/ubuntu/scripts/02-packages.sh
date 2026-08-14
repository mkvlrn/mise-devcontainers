#!/bin/sh
set -e

export DEBIAN_FRONTEND=noninteractive

# install base tools for a working system
apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    docker.io \
    docker-buildx \
    docker-compose-v2 \
    fish \
    git \
    htop \
    less \
    openssh-client \
    openssh-server \
    sudo \
    tzdata

# cleanup
apt-get clean
rm -rf \
    /var/lib/apt/lists/* \
    /var/cache/apt/*
