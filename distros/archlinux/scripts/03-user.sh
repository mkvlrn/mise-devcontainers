#!/bin/sh
set -e

# set defaults
USERNAME="dev"
USER_UID="1000"
USER_GID="$USER_UID"

# create dev user
groupadd -g "$USER_GID" "$USERNAME"
useradd -m -s /bin/fish -u "$USER_UID" -g "$USER_GID" "$USERNAME"
usermod -aG docker "$USERNAME"

# configure passwordless sudo
echo "$USERNAME ALL=(ALL) NOPASSWD: ALL" >"/etc/sudoers.d/$USERNAME"
chmod 0440 "/etc/sudoers.d/$USERNAME"

# prepare .ssh
mkdir -p "/home/$USERNAME/.ssh"
chown "$USERNAME:$USERNAME" "/home/$USERNAME/.ssh"
chmod 700 "/home/$USERNAME/.ssh"
