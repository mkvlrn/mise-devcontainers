#!/bin/sh
set -e

mkdir -p /run/sshd
ssh-keygen -A

# local devcontainer login only
passwd -d dev

cat >>/etc/ssh/sshd_config <<'EOF'

PermitRootLogin no
PasswordAuthentication yes
PermitEmptyPasswords yes
AllowUsers dev
UsePAM no
PermitUserEnvironment yes
EOF
