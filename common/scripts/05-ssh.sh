#!/bin/sh
set -e

mkdir -p /run/sshd

# local devcontainer login only
passwd -d dev

cat >>/etc/ssh/sshd_config <<'EOF'

PermitRootLogin no
PasswordAuthentication yes
PermitEmptyPasswords yes
AllowUsers dev
EOF
