#!/bin/sh
set -e

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="$(basename "$ROOT")"
CONFIG="$ROOT/.devcontainer/devcontainer.json"

SSH_CONFIG_DIR="$HOME/.config/mise-devcontainers/ssh"
SSH_USER_CONFIG="$HOME/.ssh/config"
SSH_INCLUDE='Include ~/.config/mise-devcontainers/ssh/*.conf'

# -----------------------------------------------------------------------------
# Project
# -----------------------------------------------------------------------------

# Read the distro name from the image configured in devcontainer.json.
DISTRO="$(
  sed -n \
    's#.*"image"[[:space:]]*:[[:space:]]*"ghcr.io/mkvlrn/mise-devcontainer-\([^:"]*\).*#\1#p' \
    "$CONFIG"
)"

[ -n "$DISTRO" ] || {
  echo "Error: could not determine distro from devcontainer.json" >&2
  exit 1
}

# Use the absolute project path to distinguish projects with the same directory
# name in different locations.
PROJECT_HASH="$(
  printf '%s' "$ROOT" |
    git hash-object --stdin |
    cut -c1-8
)"

SSH_TARGET="mise-devcontainer-${DISTRO}-${PROJECT}-${PROJECT_HASH}"
SSH_CONFIG="$SSH_CONFIG_DIR/$SSH_TARGET.conf"

# -----------------------------------------------------------------------------
# Arguments
# -----------------------------------------------------------------------------

RECREATE=false

for arg in "$@"; do
  case "$arg" in
  --recreate)
    RECREATE=true
    ;;
  *)
    echo "Error: unknown option: $arg" >&2
    exit 1
    ;;
  esac
done

# -----------------------------------------------------------------------------
# Container
# -----------------------------------------------------------------------------

# Let the Dev Container CLI manage the Docker container identity. Its successful
# output contains the ID of the container it created or started.
if [ "$RECREATE" = true ]; then
  echo "🔄 Recreating dev container..."

  devcontainer up \
    --workspace-folder "$ROOT" \
    --remove-existing-container
else
  echo "🚀 Creating or starting dev container..."

  devcontainer up \
    --workspace-folder "$ROOT"
fi

CONTAINER_ID="$(
  docker ps -q \
    --filter "label=devcontainer.local_folder=$ROOT" \
    --filter "label=devcontainer.config_file=$CONFIG" |
    head -n 1
)"

[ -n "$CONTAINER_ID" ] || {
  echo "Error: could not determine container ID" >&2
  exit 1
}

# -----------------------------------------------------------------------------
# SSH
# -----------------------------------------------------------------------------

# Read the host port Docker assigned to the container's SSH port.
SSH_PORT="$(
  docker port "$CONTAINER_ID" 22/tcp |
    sed -n 's/.*:\([0-9][0-9]*\)$/\1/p'
)"

[ -n "$SSH_PORT" ] || {
  echo "Error: could not determine SSH port" >&2
  exit 1
}

# Make generated SSH targets visible to the user's normal SSH client.
mkdir -p "$SSH_CONFIG_DIR" "$HOME/.ssh"
touch "$SSH_USER_CONFIG"

if ! grep -Fqx "$SSH_INCLUDE" "$SSH_USER_CONFIG"; then
  printf '\n%s\n' "$SSH_INCLUDE" >>"$SSH_USER_CONFIG"
fi

# Register this project under a stable, collision-resistant SSH target.
cat >"$SSH_CONFIG" <<EOF
Host $SSH_TARGET
    HostName 127.0.0.1
    Port $SSH_PORT
    User dev
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
EOF

# -----------------------------------------------------------------------------
# Feedback
# -----------------------------------------------------------------------------

echo
echo "✓ Dev container is ready."
echo
echo "  SSH target: $SSH_TARGET"
echo
echo "Open or reconnect your editor using its Remote SSH support"
echo "and connect to the target above."
