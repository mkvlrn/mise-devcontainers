# mise-devcontainers

Ready-to-use [Dev Containers](https://containers.dev/) built around [mise](https://mise.jdx.dev/), available in multiple Linux flavors.

They follow the Dev Container specification and can be used directly by compatible editors and tools. Optional helper scripts provide the same basic lifecycle from the command line, with SSH integration for editors and tools without native Dev Container support.

## Usage

Use the generated `.devcontainer/` normally with a Dev Container-compatible editor or tool. No helper scripts are required.

Alternatively, the included scripts provide a CLI-based workflow using the standard [Dev Container CLI](https://github.com/devcontainers/cli).

Because executable permissions are not currently preserved when applying a template, make the scripts executable once:

```sh
chmod +x .devcontainer/*.sh
```

Then:

```sh
# Create or start the container
.devcontainer/up.sh

# Recreate it from scratch
.devcontainer/up.sh --recreate

# Stop it
.devcontainer/down.sh

# Remove it
.devcontainer/remove.sh
```

`up.sh` also registers the container as an SSH target. Generated entries are kept under `~/.config/mise-devcontainers/ssh/`, with a single `Include` added to `~/.ssh/config`.

The target contains the distro, project name, and a short hash of the project path to avoid collisions:

```text
mise-devcontainer-archlinux-my-project-a1b2c3d4
```

This makes the same container available through regular `ssh`, Remote SSH editors, and other SSH-based tools without requiring native Dev Container integration.

`down.sh` stops the container while keeping it available for later. `remove.sh` removes the container, its generated SSH target, and its temporary image.

## Requirements

For normal Dev Container usage:

- Docker
- a Dev Container-compatible editor or tool

For the optional CLI/SSH workflow:

- [Dev Container CLI](https://github.com/devcontainers/cli)
- Git
- an SSH client
- an editor with Remote SSH support, if desired

## Templates

Available flavors:

```text
archlinux
debian
fedora
ubuntu
```

Templates are published as OCI artifacts to GHCR and can be applied with the Dev Container CLI:

```sh
devcontainer templates apply \
  -t ghcr.io/mkvlrn/mise-devcontainers/archlinux \
  -w .
```

Replace `archlinux` with the desired flavor.

The templates are also intended for discovery through the [Dev Container Templates](https://containers.dev/templates) collection.

## What's included

All flavors provide:

- [mise](https://mise.jdx.dev/)
- Docker-in-Docker
- SSH
- Fish
- Git
- SSH agent forwarding
- host Git configuration and signing key
- non-root `dev` user with sudo
- common CLI tools managed by mise
- projects mounted under `/code/<project>`

Project-specific runtimes and tools remain with the project and can be declared normally through mise:

```toml
[tools]
node = "26"
pnpm = "11"
```

## Flavors

### Arch Linux

Rolling release with up-to-date system packages.

**Image:** `ghcr.io/mkvlrn/mise-devcontainer-archlinux`

### Debian

Debian Trixie slim, with a smaller and more conservative base and broad glibc compatibility.

**Image:** `ghcr.io/mkvlrn/mise-devcontainer-debian`

### Fedora

Current Fedora rawhide release with a modern userspace and RPM/DNF package ecosystem.

**Image:** `ghcr.io/mkvlrn/mise-devcontainer-fedora`

### Ubuntu

Current Ubuntu LTS release.

**Image:** `ghcr.io/mkvlrn/mise-devcontainer-ubuntu`

## Publishing

CI detects affected distributions and builds candidate images only for those distributions. Each candidate goes through template creation and an actual Dev Container test before being promoted.

The resulting flow is:

```text
detect changes
    ↓
build candidate image
    ↓
create template
    ↓
test template
    ↓
promote image
    ↓
publish template
```

Published templates reference the image that passed the corresponding test.
