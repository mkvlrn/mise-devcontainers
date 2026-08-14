#!/bin/sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

. "$SCRIPT_DIR/lib.sh"

# vars
RECREATE=false
REMOVE_EXISTING=""

# parse arguments
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

# create, start, or recreate devcontainer
if [ "$RECREATE" = true ]; then
    REMOVE_EXISTING="--remove-existing-container"
    echo "🔄 Recreating dev container..."
elif container_exists; then
    echo "▶️ Starting existing dev container..."
else
    echo "🚀 Creating dev container..."
fi

devcontainer up \
    --workspace-folder "$ROOT" \
    $REMOVE_EXISTING

# configure ssh target
SSH_PORT="$(get_ssh_port)"
[ -n "$SSH_PORT" ] || {
    echo "Error: could not determine SSH port" >&2
    exit 1
}
ensure_ssh_include
update_ssh_entry

# feedback
echo
echo "✓ Dev container is ready."
echo
echo "  SSH target: $CONTAINER"
echo
echo "Open or reconnect your editor using its Remote SSH support"
echo "and connect to the target above."
