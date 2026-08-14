#!/bin/sh
set -e

# install base tools for a working system
dnf install -y \
    curl \
    docker-buildx \
    docker-cli \
    docker-compose \
    fish \
    git \
    htop \
    less \
    moby-engine \
    openssh-clients \
    openssh-server \
    shadow-utils \
    sudo \
    tzdata \
    iptables-nft \
    runc

# prioritize nft iptables for dockerd
alternatives --set iptables /usr/bin/iptables-nft

# cleanup
dnf clean all
rm -rf /var/cache/dnf
