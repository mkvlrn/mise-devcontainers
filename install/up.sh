#!/bin/sh
set -e

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="$(basename "$ROOT")"
CONFIG="$ROOT/.devcontainer/devcontainer.json"

RECREATE=false
REMOVE_EXISTING=""

SSH_CONFIG_DIR="$HOME/.config/mise-devcontainers"
SSH_CONFIG="$SSH_CONFIG_DIR/ssh_config"
SSH_USER_CONFIG="$HOME/.ssh/config"

# -----------------------------------------------------------------------------
# Project
# -----------------------------------------------------------------------------

# Read the distro name from the image configured in devcontainer.json.
get_distro() {
    sed -n \
        's#.*"image"[[:space:]]*:[[:space:]]*"ghcr.io/mkvlrn/mise-devcontainer-\([^:"]*\).*#\1#p' \
        "$CONFIG"
}

# Read the workspace path resolved by the Dev Container CLI.
get_workspace_folder() {
    devcontainer read-configuration --workspace-folder "$ROOT" |
        grep '"workspaceFolder"' |
        sed 's/.*"workspaceFolder"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/'
}

# -----------------------------------------------------------------------------
# Arguments
# -----------------------------------------------------------------------------

parse_args() {
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
}

# -----------------------------------------------------------------------------
# Container
# -----------------------------------------------------------------------------

# Create, start, or recreate the project's devcontainer.
start_container() {
    if [ "$RECREATE" = true ]; then
        REMOVE_EXISTING="--remove-existing-container"
        echo "🔄 Recreating dev container..."
    elif docker container inspect "$CONTAINER" >/dev/null 2>&1; then
        echo "▶️ Starting existing dev container..."
    else
        echo "🚀 Creating dev container..."
    fi

    devcontainer up \
        --workspace-folder "$ROOT" \
        $REMOVE_EXISTING
}

# -----------------------------------------------------------------------------
# SSH
# -----------------------------------------------------------------------------

# Return the host port Docker assigned to the container's SSH port.
get_ssh_port() {
    docker port "$CONTAINER" 22/tcp |
        sed -n 's/.*:\([0-9][0-9]*\)$/\1/p'
}

# Make the mise-devcontainers SSH configuration visible to the user's SSH
# client without otherwise modifying their existing configuration.
ensure_ssh_include() {
    mkdir -p "$SSH_CONFIG_DIR" "$HOME/.ssh"
    touch "$SSH_CONFIG" "$SSH_USER_CONFIG"

    SSH_INCLUDE="Include $SSH_CONFIG"

    if ! grep -Fqx "$SSH_INCLUDE" "$SSH_USER_CONFIG"; then
        printf '\n%s\n' "$SSH_INCLUDE" >>"$SSH_USER_CONFIG"
    fi
}

# Remove the previous SSH entry for this container, if one exists.
remove_ssh_entry() {
    awk -v host="$CONTAINER" '
        $1 == "Host" && $2 == host { skip = 1; next }
        skip && $1 == "Host" { skip = 0 }
        !skip { print }
    ' "$SSH_CONFIG" >"${SSH_CONFIG}.tmp"

    mv "${SSH_CONFIG}.tmp" "$SSH_CONFIG"
}

# Register the running container as a normal SSH host.
update_ssh_entry() {
    remove_ssh_entry

    cat >>"$SSH_CONFIG" <<EOF

Host $CONTAINER
    HostName 127.0.0.1
    Port $SSH_PORT
    User dev
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
EOF
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

parse_args "$@"

DISTRO="$(get_distro)"

[ -n "$DISTRO" ] || {
    echo "Error: could not determine distro from devcontainer.json" >&2
    exit 1
}

CONTAINER="mise-devcontainer-${DISTRO}-${PROJECT}"
WORKSPACE_FOLDER="$(get_workspace_folder)"

start_container

SSH_PORT="$(get_ssh_port)"

[ -n "$SSH_PORT" ] || {
    echo "Error: could not determine SSH port" >&2
    exit 1
}

ensure_ssh_include
update_ssh_entry

echo
echo "✓ Dev container is ready."
echo
echo "  SSH target: $CONTAINER"
echo
echo "Open or reconnect your editor using its Remote SSH support"
echo "and connect to the target above."
