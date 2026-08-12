FROM archlinux:base@sha256:b0deabeb3d283da2c7f7dbf0eea051b7b2cd0554e0b737cc457fd21683bdcdd1

COPY ./common/.config/ /tmp/.config/
COPY --chmod=755 ./common/scripts/00-config.sh /tmp/scripts/
RUN /tmp/scripts/00-config.sh

COPY --chmod=755 ./distros/archlinux/scripts/01-base.sh /tmp/scripts/
RUN /tmp/scripts/01-base.sh

COPY --chmod=755 ./distros/archlinux/scripts/02-packages.sh /tmp/scripts/
RUN /tmp/scripts/02-packages.sh

COPY --chmod=755 ./distros/archlinux/scripts/03-user.sh /tmp/scripts/
RUN /tmp/scripts/03-user.sh
RUN ls -ld /home/dev && id dev

COPY --chmod=755 ./distros/archlinux/scripts/04-mise.sh /tmp/scripts/
RUN --mount=type=secret,id=mise_github_token,env=MISE_GITHUB_TOKEN \
    /tmp/scripts/04-mise.sh

RUN rm -rf /tmp/*

COPY --chmod=755 ./common/binscripts/ /usr/local/bin/
COPY --chmod=755 ./distros/archlinux/binscripts/ /usr/local/bin/

ENTRYPOINT [ "docker-in-docker.sh" ]
CMD ["sleep", "infinity"]