#!/bin/sh
set -e

# configure makepkg
sed -i '/^OPTIONS=/d;/^MAKEFLAGS=/d' /etc/makepkg.conf
cat <<'EOF' >>/etc/makepkg.conf
OPTIONS=(strip docs !libtool !staticlibs emptydirs zipman purge !debug lto)
MAKEFLAGS="--jobs=$(nproc)"
EOF

# get latest ALA sync
timestamp="$(curl -fsSL https://archive.archlinux.org/repos/last/lastsync)"
snapshot="$(date -d "@$timestamp" '+%Y/%m/%d')"

# update mirrors
printf '%s\n' \
    "Server = https://archive.archlinux.org/repos/$snapshot/\$repo/os/\$arch" \
    >/etc/pacman.d/mirrorlist
pacman -Syu --noconfirm
