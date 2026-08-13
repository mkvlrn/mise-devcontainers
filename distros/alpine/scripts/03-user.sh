#!/bin/sh
set -e

# set defaults
USERNAME="dev"
USER_UID="1000"
USER_GID="$USER_UID"

# create dev user
addgroup -g "$USER_GID" "$USERNAME"
adduser \
    -D \
    -u "$USER_UID" \
    -G "$USERNAME" \
    -s /usr/bin/fish \
    "$USERNAME"
addgroup "$USERNAME" docker

# configure passwordless sudo
echo "$USERNAME ALL=(ALL) NOPASSWD: ALL" >"/etc/sudoers.d/$USERNAME"
chmod 0440 "/etc/sudoers.d/$USERNAME"

# prepare .ssh
mkdir -p "/home/$USERNAME/.ssh"
chmod 700 "/home/$USERNAME/.ssh"

# set ownership of home
chown -R "$USERNAME:$USERNAME" "/home/$USERNAME"
