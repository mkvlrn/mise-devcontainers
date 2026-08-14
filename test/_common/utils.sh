FAILED=""

check() {
    LABEL="$1"
    shift

    if "$@"; then
        echo "✓ $LABEL"
    else
        echo "✗ $LABEL" >&2
        FAILED="${FAILED}${FAILED:+
}$LABEL"
    fi
}

report_results() {
    if [ -n "$FAILED" ]; then
        echo >&2
        echo "Failed tests:" >&2
        printf '%s\n' "$FAILED" >&2
        exit 1
    fi

    echo
    echo "==> Tests passed!"
}
