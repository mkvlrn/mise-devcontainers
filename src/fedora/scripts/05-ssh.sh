#!/bin/sh
set -e

sed -i 's/^UsePAM yes$/UsePAM no/' /etc/ssh/sshd_config.d/50-redhat.conf
