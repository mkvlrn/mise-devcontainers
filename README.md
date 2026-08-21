# mise-devcontainers

Ready-to-use [Dev Containers](https://containers.dev/) built around [mise](https://mise.jdx.dev/), available in Arch Linux, Debian, Fedora, and Ubuntu.

They follow the Dev Container specification and work with compatible editors and tools. Optional helper scripts provide the same lifecycle from the command line and expose the container over SSH for tools without native Dev Container support.

## Requirements

- Docker
- an SSH agent exposed through `SSH_AUTH_SOCK`
- at least one key loaded in the agent
- a Dev Container-compatible editor or tool

Check your agent with:

```sh
ssh-add -L
```

The agent is forwarded into the container for SSH authentication and Git commit signing. Private SSH keys are not mounted into the container.

The optional CLI/SSH workflow additionally requires the [Dev Container CLI](https://github.com/devcontainers/cli), Git, and an SSH client.

## Templates

Templates are published as OCI artifacts and available through the [Dev Container Templates](https://containers.dev/templates) collection.

Available distros:

```text
archlinux
debian
fedora
ubuntu
```

They can also be applied directly with the Dev Container CLI:

```sh
devcontainer templates apply \
  -t ghcr.io/mkvlrn/mise-devcontainers/archlinux \
  -w .
```

Replace `archlinux` with the desired distro.

## Usage

Use the generated `.devcontainer/` normally with any compatible Dev Container editor or tool.

### CLI and SSH

The templates also include helper scripts for managing the container directly.

Because executable permissions are not preserved when applying a template, make them executable once:

```sh
chmod +x .devcontainer/*.sh
```

Then:

```sh
# Create or start
.devcontainer/up.sh

# Recreate
.devcontainer/up.sh --recreate

# Stop
.devcontainer/down.sh

# Remove
.devcontainer/remove.sh
```

`up.sh` also registers the container as an SSH target. Entries are stored under `~/.config/mise-devcontainers/ssh/`, with a single `Include` added to `~/.ssh/config`.

Targets include the distro, project name, and a short hash of the project path:

```text
mise-devcontainer-archlinux-my-project-a1b2c3d4
```

The container can then be used through regular SSH, Remote SSH editors, and other SSH-based tools.

`down.sh` keeps the container available for later. `remove.sh` removes the container, generated SSH target, and temporary image.

## Git

Git includes system-wide defaults and uses the forwarded SSH agent for commit signing.

Configure your identity inside the container:

```sh
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

Git will refuse to commit until these are set.

If multiple keys are loaded in your agent, set `user.signingKey` to select a specific signing key.

## What's included

All distros provide:

- [mise](https://mise.jdx.dev/)
- Docker-in-Docker
- SSH
- Fish
- Git with system-wide defaults and SSH signing
- SSH agent forwarding
- non-root `dev` user with sudo
- common CLI tools managed by mise
- projects mounted under `/code/<project>`

Project-specific runtimes and tools remain with the project:

```toml
[tools]
node = "26"
pnpm = "11"
```

## Distros

| Distro     | Base        | Image                                        |
| ---------- | ----------- | -------------------------------------------- |
| Arch Linux | Rolling     | `ghcr.io/mkvlrn/mise-devcontainer-archlinux` |
| Debian     | Trixie slim | `ghcr.io/mkvlrn/mise-devcontainer-debian`    |
| Fedora     | Rawhide     | `ghcr.io/mkvlrn/mise-devcontainer-fedora`    |
| Ubuntu     | Current LTS | `ghcr.io/mkvlrn/mise-devcontainer-ubuntu`    |

## Publishing

CI builds only affected distros. Each candidate image is used to create and test its actual Dev Container template before the image is promoted and the template published, ensuring published templates reference the image that passed testing.
