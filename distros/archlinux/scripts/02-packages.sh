#!/bin/sh
set -e

# install base tools for a working system
pacman -S --noconfirm \
  docker \
  docker-buildx \
  docker-compose \
  htop \
  less \
  openssh \
  git \
  sudo \
  tzdata \
  zsh

# cleanup
pacman -Scc --noconfirm
rm -rf \
  /var/cache/pacman/pkg/* \
  /home/dev/.cache/*
