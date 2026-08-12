#!/bin/sh
set -e

# install base tools for a working system
pacman -S --noconfirm \
    docker \
    docker-buildx \
    docker-compose \
    fish \
    htop \
    less \
    openssh \
    git \
    sudo \
    tzdata
