# mise-devcontainers

[![mise](https://mise-versions.jdx.dev/badge.svg)](https://mise.jdx.dev)
[![license](https://img.shields.io/github/license/mkvlrn/mise-devcontainers?style=flat)](https://github.com/mkvlrn/mise-devcontainers/blob/main/LICENSE)

Ready-to-use [Dev Containers](https://containers.dev/) built around [mise](https://mise.jdx.dev/), available for Alpine, Arch Linux, Debian, Fedora, and Ubuntu.

Each distro is provided as a prebuilt container image and a [Dev Container Template](https://containers.dev/templates). The images provide the common development environment, while the templates add the project-facing Dev Container configuration.

Project-specific runtimes and tools remain with the project through its mise configuration.

## requirements

- Docker or a compatible container runtime
- the [Dev Container CLI](https://github.com/devcontainers/cli)
- an SSH agent exposed through `SSH_AUTH_SOCK` with at least one key loaded

Check the agent with:

```sh
ssh-add -L
```

The agent is forwarded for Git authentication and commit signing. Private keys never enter the container.

If `MISE_GITHUB_TOKEN` is set on the host, it is forwarded into the container for mise's GitHub-backed operations.

## templates

Templates are published as OCI artifacts and available through the [Dev Container Templates](https://containers.dev/templates) collection:

- `alpine`
- `archlinux`
- `debian`
- `fedora`
- `ubuntu`

Apply a template to a project with the Dev Container CLI:

```sh
devcontainer templates apply \
  -t ghcr.io/mkvlrn/mise-devcontainers/archlinux \
  -w .
```

Replace `archlinux` with the desired distro.

This creates the project's `.devcontainer/` directory. Once applied, the container can be used with any compatible editor or Dev Container tool.

The template should be applied with the CLI rather than an editor's template creation flow. In particular, VS Code's **New Dev Container from Template** workflow resolves the template from an intermediate container where the host `SSH_AUTH_SOCK` is unavailable, preventing the required SSH agent mount from being created.

## usage

Use the generated `.devcontainer/` normally with any compatible Dev Container tool or editor.

The templates also include helper scripts for standalone CLI usage. Make them executable once:

```sh
chmod +x .devcontainer/*.sh
```

```sh
# Create or start
.devcontainer/up.sh

# Recreate
.devcontainer/up.sh --recreate

# Open a shell
.devcontainer/shell.sh

# Stop
.devcontainer/down.sh

# Remove
.devcontainer/remove.sh
```

`down.sh` stops the container while keeping it available. `remove.sh` removes the container and temporary image.

## git

Git includes system-wide defaults and SSH commit signing through the forwarded agent.

Set your identity inside the container:

```sh
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

If multiple keys are loaded in the agent, set `user.signingKey` to select one explicitly.

## included

All distros provide:

- [mise](https://mise.jdx.dev/)
- Docker-in-Docker
- Fish
- Git with SSH signing
- SSH agent forwarding
- non-root `dev` user with sudo
- common CLI tools managed by mise
- projects mounted under `/code/<project>`

Project-specific runtimes remain with the project:

```toml
[tools]
node = "26"
pnpm = "11"
```

## distros

| Distro     | Base                       | Image                                        |
| ---------- | -------------------------- | -------------------------------------------- |
| Alpine     | Edge                       | `ghcr.io/mkvlrn/mise-devcontainer-alpine`    |
| Arch Linux | Rolling                    | `ghcr.io/mkvlrn/mise-devcontainer-archlinux` |
| Debian     | Trixie slim                | `ghcr.io/mkvlrn/mise-devcontainer-debian`    |
| Fedora     | Rawhide                    | `ghcr.io/mkvlrn/mise-devcontainer-fedora`    |
| Ubuntu     | Latest release (`rolling`) | `ghcr.io/mkvlrn/mise-devcontainer-ubuntu`    |

## why multiple distros?

The development environment is intentionally kept consistent across multiple Linux distributions. This makes it possible to use the same tooling and workflow while choosing a familiar base, matching a project's deployment environment more closely, or testing against different userspaces and package ecosystems.

The distro should be a choice, not a constraint imposed by the development environment.

## license

[MIT](https://github.com/mkvlrn/mise-devcontainers/blob/main/LICENSE)
