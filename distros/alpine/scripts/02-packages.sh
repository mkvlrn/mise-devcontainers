#!/bin/sh
set -e

apk add --no-cache \
    curl \
    docker \
    docker-cli-compose \
    fish \
    git \
    htop \
    less \
    openssh-client \
    sudo \
    tzdata
