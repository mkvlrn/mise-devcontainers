# mise-devcontainers

Ready-to-use development containers built around [mise](https://mise.jdx.dev/), available in multiple Linux flavors.

The containers are managed with the Dev Container CLI and accessed through SSH, keeping editor integration optional.

## Requirements

The host needs:

- Docker
- [Dev Container CLI](https://github.com/devcontainers/cli)
- an SSH client
- an editor with Remote SSH support, if desired

## Install

From the root of a project:

```sh
devcontainer templates apply \
  -t ghcr.io/mkvlrn/mise-devcontainers/archlinux \
  -w .
```

Available flavors:

```text
archlinux
debian
fedora
ubuntu
```

This creates a `.devcontainer/` containing the container configuration and helper scripts.

## Usage

Start or create the container:

```sh
.devcontainer/up.sh
```

When ready, it is registered as an SSH target:

```text
mise-devcontainer-<distro>-<project>
```

Connect directly:

```sh
ssh mise-devcontainer-<distro>-<project>
```

or use the same target with any editor supporting Remote SSH.

Recreate the container:

```sh
.devcontainer/up.sh --recreate
```

Stop it:

```sh
.devcontainer/down.sh
```

Remove it, its SSH entry, and its temporary image:

```sh
.devcontainer/remove.sh
```

## How it works

The Dev Container CLI creates the environment, Docker runs it, and SSH provides editor-independent access.

SSH is exposed only on a dynamically assigned localhost port. The helper scripts maintain separate SSH configuration entries and include them from the user's normal SSH configuration.

Each container provides:

- [mise](https://mise.jdx.dev/)
- Docker-in-Docker
- SSH
- Fish
- Git
- SSH agent forwarding
- host Git configuration and signing key
- a non-root `dev` user with sudo
- common CLI tools managed by mise
- projects mounted under `/code/<project>`

Project-specific runtimes and tools remain in the project's mise configuration.

## Images

```text
ghcr.io/mkvlrn/mise-devcontainer-archlinux
ghcr.io/mkvlrn/mise-devcontainer-debian
ghcr.io/mkvlrn/mise-devcontainer-fedora
ghcr.io/mkvlrn/mise-devcontainer-ubuntu
```

CI builds and tests candidate images and templates before promoting images and publishing the corresponding Dev Container Templates. Published configurations pin the selected image to its tested digest.
