# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

ROOT="$(cd "$(dirname "$0")" && pwd)"

# -----------------------------------------------------------------------------
# Validation
# -----------------------------------------------------------------------------

# Exit with an error message.
error() {
    echo "Error: $*" >&2
    exit 1
}

# Require a distro argument.
require_distro() {
    [ -n "$DISTRO" ] || error "--distro is required"
}

# Require a distro directory.
require_distro_dir() {
    [ -d "$1" ] || error "distro '$DISTRO' does not exist"
}

# -----------------------------------------------------------------------------
# Image
# -----------------------------------------------------------------------------

# Set image references for the selected distro.
set_image_vars() {
    IMAGE="mkvlrn/mise-devcontainer-${DISTRO}"
    IMAGE_REF="ghcr.io/${IMAGE}"
}

# -----------------------------------------------------------------------------
# Build
# -----------------------------------------------------------------------------

# Merge common files with distro-specific overrides.
prepare_overlay() {
    COMMON_DIR="$1"
    DISTRO_DIR="$2"
    OUTPUT_DIR="$3"

    rm -rf "$OUTPUT_DIR"
    mkdir -p "$OUTPUT_DIR"
    cp -a "$COMMON_DIR/." "$OUTPUT_DIR/"
    cp -a "$DISTRO_DIR/." "$OUTPUT_DIR/"
    find "$OUTPUT_DIR" -name .gitkeep -delete
}
