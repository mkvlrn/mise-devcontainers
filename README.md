# mise-devcontainers

Ready-to-use development containers built around [mise](https://mise.jdx.dev/), available in multiple Linux flavors.

## Requirements

The host needs:

- Docker
- [Dev Container CLI](https://github.com/devcontainers/cli)
- `curl`
- an SSH client
- an editor with Remote SSH support, if desired

Dev Container editor extensions are **not required or recommended**. Containers are managed from the CLI and accessed through SSH.

## Install

From the root of your project:

```sh
curl -fsSL https://raw.githubusercontent.com/mkvlrn/mise-devcontainers/main/install.sh | sh -s -- --distro archlinux
```

Available flavors:

```text
archlinux
debian
alpine
```

This creates:

```text
.devcontainer/
├── devcontainer.json
├── down.sh
├── remove.sh
└── up.sh
```

The selected image is pinned to the current GHCR digest.

## Usage

Start the container:

```sh
.devcontainer/up.sh
```

When ready, the script prints its SSH target:

```text
mise-devcontainer-<distro>-<project>
```

Connect directly:

```sh
ssh mise-devcontainer-<distro>-<project>
```

Or use the same target with your editor's Remote SSH support.

Recreate the container:

```sh
.devcontainer/up.sh --recreate
```

Stop it while keeping it available for later:

```sh
.devcontainer/down.sh
```

Remove the container and its associated SSH target and image:

```sh
.devcontainer/remove.sh
```

## How it works

The Dev Container CLI creates and starts the container. Docker exposes SSH on a dynamic localhost port, and `up.sh` registers it as a normal SSH target.

```text
Dev Container CLI → creates the environment
Docker            → runs and isolates it
SSH               → provides access
mise              → manages project tools
Editor            → connects through SSH
```

SSH is bound only to the host loopback interface. Generated SSH entries are kept separately and included from the user's main SSH config.

## Why this approach?

Dev Container editor integration is fragmented. Official extensions are tied to Microsoft's VS Code distribution, while other editors and marketplaces require different solutions.

These aren't Features or Templates either, but complete, opinionated development environments.

Using SSH keeps the editor out of the equation: terminals, VSCodium, VS Code, JetBrains, Zed, and other SSH-capable tools can all access the same environment.

## What's included

All flavors provide:

- [mise](https://mise.jdx.dev/)
- Docker-in-Docker
- SSH
- Fish
- Git
- SSH agent forwarding
- host Git config and signing key
- non-root `dev` user with sudo
- useful CLI tools managed by mise
- projects mounted under `/code/<project>`

## Flavors

### Arch Linux

Rolling release with up-to-date system packages.

**Image:** `ghcr.io/mkvlrn/mise-devcontainer-archlinux`

### Debian Trixie

Debian Trixie slim: smaller and more conservative, with broad glibc compatibility.

**Image:** `ghcr.io/mkvlrn/mise-devcontainer-debian`

### Alpine Edge

Small Alpine image for those who don't mind musl compatibility considerations.

**Image:** `ghcr.io/mkvlrn/mise-devcontainer-alpine`

## mise

The image provides mise and a small global toolset. Project runtimes and tools stay with the project:

```toml
[tools]
node = "26"
pnpm = "11"
```

## Updating

Images use `current` plus timestamped tags. The installer pins `current` to its digest, so existing projects don't change when new images are published.

Run the installer again to intentionally update.

## Building locally

```sh
./build.sh --distro archlinux
```

Without cache:

```sh
./build.sh --distro archlinux --no-cache
```

Common build files are shared, with `distros/<flavor>/` providing distro-specific overrides.
