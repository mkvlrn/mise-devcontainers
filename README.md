# mise-devcontainers

Ready-to-use devcontainer images built around [mise](https://mise.jdx.dev/), with multiple Linux flavors and a small installer to drop them into any project.

The goal is simple: a comfortable, reproducible development environment without stuffing every project's `devcontainer.json` with setup logic.

## What's included

All flavors share the same development environment:

- [mise](https://mise.jdx.dev/) for managing project runtimes and tools
- Docker-in-Docker
- Fish as the interactive shell
- Git and SSH setup
- SSH agent forwarding
- host Git config and signing key
- a non-root `dev` user with sudo access
- a small set of useful CLI tools managed by mise
- project files mounted under `/code/<project>`

The distro-specific parts are kept separate, while the rest of the environment is shared.

## Flavors

### Arch Linux

Rolling release and the most up-to-date system packages.

**Image:** `mkvlrn/mise-devcontainer-archlinux`

[Docker Hub](https://hub.docker.com/r/mkvlrn/mise-devcontainer-archlinux)

### Debian Trixie

Based on Debian Trixie slim. Smaller and more conservative than Arch while retaining broad glibc compatibility.

**Image:** `mkvlrn/mise-devcontainer-debian`

[Docker Hub](https://hub.docker.com/r/mkvlrn/mise-devcontainer-debian)

### Alpine Edge

Small Alpine-based image for those who prefer Alpine and don't mind musl compatibility considerations.

**Image:** `mkvlrn/mise-devcontainer-alpine`

[Docker Hub](https://hub.docker.com/r/mkvlrn/mise-devcontainer-alpine)

## Install

From the root of your project:

```sh
curl -fsSL https://raw.githubusercontent.com/mkvlrn/mise-devcontainers/main/install.sh | sh -s -- --distro archlinux
```

Replace `archlinux` with the flavor you want:

```text
archlinux
debian
alpine
```

The installer creates:

```text
.devcontainer/
├── devcontainer.json
└── start.sh
```

It resolves the current image digest from Docker Hub and pins it in `devcontainer.json`, so the project gets the exact image that was current when it was installed.

## Start

```sh
.devcontainer/start.sh
```

This creates the devcontainer if necessary, starts it, and drops you into Fish inside the container.

To rebuild the container:

```sh
.devcontainer/start.sh --recreate
```

## mise

The image provides mise and a small global toolset, but project runtimes belong to the project.

Add a `mise.toml` to your repository as usual:

```toml
[tools]
node = "26"
pnpm = "11"
```

When the project is opened inside the container, mise handles its runtime and tool versions normally.

## Updating

Images use a `current` tag and are also published with timestamped versions.

The generated `devcontainer.json` pins `current` to its digest, so upstream image changes won't silently change an existing development environment.

Run the installer again when you intentionally want to move the project to the current image.

## Building locally

```sh
./build.sh --distro archlinux
```

To bypass the build cache:

```sh
./build.sh --distro archlinux --no-cache
```

Images share common build files, with files under `distros/<flavor>/` overriding the defaults where necessary.

## Requirements

On the host:

- Docker
- [Dev Container CLI](https://github.com/devcontainers/cli)
- `curl` for installation

## Repository

https://github.com/mkvlrn/mise-devcontainers
