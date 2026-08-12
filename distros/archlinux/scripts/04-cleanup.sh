#!/bin/sh
set -e

pacman -Scc --noconfirm

rm -rf \
    /var/cache/pacman/pkg/* \
    /home/dev/.cache/* \
    /tmp/*
