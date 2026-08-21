LABEL org.opencontainers.image.source="https://github.com/mkvlrn/mise-devcontainers"

COPY .config/ /tmp/.config/
COPY --chmod=755 scripts/00-config.sh /tmp/scripts/
RUN /tmp/scripts/00-config.sh

COPY --chmod=755 scripts/01-base.sh /tmp/scripts/
RUN /tmp/scripts/01-base.sh

COPY --chmod=755 scripts/02-packages.sh /tmp/scripts/
RUN /tmp/scripts/02-packages.sh

COPY --chmod=755 scripts/03-user.sh /tmp/scripts/
RUN /tmp/scripts/03-user.sh

COPY --chmod=755 scripts/04-mise.sh /tmp/scripts/
RUN --mount=type=secret,id=mise_github_token,env=MISE_GITHUB_TOKEN \
  /tmp/scripts/04-mise.sh

COPY --chmod=755 scripts/05-ssh.sh /tmp/scripts/
RUN /tmp/scripts/05-ssh.sh

RUN rm -rf /tmp/*

COPY --chmod=755 binscripts/ /usr/local/bin/
COPY --chmod=644 gitconfig /etc/gitconfig

ENTRYPOINT [ "docker-in-docker.sh" ]
CMD ["sleep", "infinity"]
