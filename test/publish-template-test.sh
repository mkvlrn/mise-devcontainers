#!/usr/bin/env bash
# shellcheck disable=SC2329
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT/scripts/publish-template.sh"

DISTROS=("alpine" "archlinux" "debian" "fedora" "ubuntu")
CANDIDATE_TAG="candidate-test-123"
IMAGE_VERSION="2026.9.5"
MOCK_DIGEST="sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

PASSED_TESTS=0
FAILED_TESTS=0

check() {
  local name="$1"
  shift
  if "$@"; then
    echo "✓ $name"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo "✗ $name" >&2
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

setup_fixture() {
  local fixture_dir
  fixture_dir="$(mktemp -d)"
  local mock_bin="$fixture_dir/bin"
  mkdir -p "$mock_bin"

  # Mock docker
  cat <<'EOF' >"$mock_bin/docker"
#!/usr/bin/env bash
if [[ "$*" == *"buildx imagetools inspect"* ]]; then
  if [ -n "${MOCK_DIGEST_MISMATCH:-}" ] && [[ "$*" == *":current"* ]]; then
    echo "Digest: sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  else
    echo "Digest: sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  fi
  exit 0
fi
exit 0
EOF
  chmod +x "$mock_bin/docker"

  # Mock devcontainer
  cat <<'EOF' >"$mock_bin/devcontainer"
#!/usr/bin/env bash
if [[ "$*" == *"templates publish"* ]]; then
  # Record the publish directory
  echo "$@" > "${FIXTURE_DIR}/published_call.txt"
  exit 0
fi
exit 0
EOF
  chmod +x "$mock_bin/devcontainer"

  # Mock oras
  cat <<'EOF' >"$mock_bin/oras"
#!/usr/bin/env bash
if [ -n "${MOCK_ORAS_FAIL:-}" ]; then
  exit 1
fi
# Extract destination and distro from arguments
out_dir=""
distro=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --output)
      out_dir="$2"
      shift 2
      ;;
    *)
      if [[ "$1" == *":"* ]]; then
        distro="$(basename "${1%%:*}")"
      fi
      shift
      ;;
  esac
done

if [ -n "$out_dir" ] && [ -n "$distro" ]; then
  # Create mock tgz archive with published template
  tmp_stage="$(mktemp -d)"
  mkdir -p "$tmp_stage/.devcontainer"
  cat <<INNER > "$tmp_stage/devcontainer-template.json"
{
  "id": "$distro",
  "version": "2025.1.0",
  "name": "published-$distro"
}
INNER
  cat <<INNER > "$tmp_stage/.devcontainer/devcontainer.json"
{
  "image": "ghcr.io/mkvlrn/mise-devcontainer-$distro:old@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
}
INNER
  tar -czf "$out_dir/devcontainer-template-$distro.tgz" -C "$tmp_stage" .
  rm -rf "$tmp_stage"
fi
exit 0
EOF
  chmod +x "$mock_bin/oras"

  echo "$fixture_dir"
}

write_template_fixture() {
  local target_dir="$1"
  local distro="$2"
  local version="${3:-$IMAGE_VERSION}"
  local tag="${4:-$CANDIDATE_TAG}"
  local id="${5:-$distro}"

  mkdir -p "$target_dir/.devcontainer"
  cat <<EOF >"$target_dir/devcontainer-template.json"
{
  "id": "$id",
  "version": "$version",
  "name": "mise-devcontainer-$distro"
}
EOF
  cat <<EOF >"$target_dir/.devcontainer/devcontainer.json"
{
  "name": "mise-devcontainer-$distro-\${localWorkspaceFolderBasename}",
  "image": "ghcr.io/mkvlrn/mise-devcontainer-$distro:$tag"
}
EOF
}

# Test 1: Full publication (all 5 changed)
test_full_publish() {
  local fixture
  fixture="$(setup_fixture)"
  export FIXTURE_DIR="$fixture"
  export PATH="$fixture/bin:$PATH"

  # Create downloaded templates for all distros
  for d in "${DISTROS[@]}"; do
    local dl_dir="$ROOT/.tmp/.publish-templates/template-$d"
    rm -rf "$dl_dir"
    write_template_fixture "$dl_dir" "$d"
  done

  "$SCRIPT" \
    --distros '["alpine","archlinux","debian","fedora","ubuntu"]' \
    --candidateTag "$CANDIDATE_TAG" \
    --imageVersion "$IMAGE_VERSION"

  # Verify all 5 are in publish collection and image is pinned
  for d in "${DISTROS[@]}"; do
    local coll_img
    coll_img="$(jq -r '.image' "$ROOT/.tmp/.publish-collection/$d/.devcontainer/devcontainer.json")"
    [ "$coll_img" = "ghcr.io/mkvlrn/mise-devcontainer-$d:current@$MOCK_DIGEST" ] || return 1
  done

  # Verify devcontainer publish was called
  [ -f "$fixture/published_call.txt" ] || return 1

  rm -rf "$fixture" "$ROOT/.tmp"
  return 0
}

# Test 2: Partial publication (only debian changed, 4 restored via ORAS)
test_partial_publish() {
  local fixture
  fixture="$(setup_fixture)"
  export FIXTURE_DIR="$fixture"
  export PATH="$fixture/bin:$PATH"

  # Only debian downloaded
  rm -rf "$ROOT/.tmp/.publish-templates"
  local dl_dir="$ROOT/.tmp/.publish-templates/template-debian"
  write_template_fixture "$dl_dir" "debian"

  "$SCRIPT" \
    --distros '["debian"]' \
    --candidateTag "$CANDIDATE_TAG" \
    --imageVersion "$IMAGE_VERSION"

  # Verify debian has pinned current digest
  local debian_img
  debian_img="$(jq -r '.image' "$ROOT/.tmp/.publish-collection/debian/.devcontainer/devcontainer.json")"
  [ "$debian_img" = "ghcr.io/mkvlrn/mise-devcontainer-debian:current@$MOCK_DIGEST" ] || return 1

  # Verify alpine was restored from ORAS with its old image
  local alpine_id
  alpine_id="$(jq -r '.id' "$ROOT/.tmp/.publish-collection/alpine/devcontainer-template.json")"
  [ "$alpine_id" = "alpine" ] || return 1

  rm -rf "$fixture" "$ROOT/.tmp"
  return 0
}

# Test 3: Digest mismatch rejects publication
test_digest_mismatch() {
  local fixture
  fixture="$(setup_fixture)"
  export FIXTURE_DIR="$fixture"
  export PATH="$fixture/bin:$PATH"
  export MOCK_DIGEST_MISMATCH="true"

  for d in "${DISTROS[@]}"; do
    local dl_dir="$ROOT/.tmp/.publish-templates/template-$d"
    write_template_fixture "$dl_dir" "$d"
  done

  if "$SCRIPT" \
    --distros '["alpine","archlinux","debian","fedora","ubuntu"]' \
    --candidateTag "$CANDIDATE_TAG" \
    --imageVersion "$IMAGE_VERSION" >/dev/null 2>&1; then
    rm -rf "$fixture" "$ROOT/.tmp"
    return 1
  fi

  rm -rf "$fixture" "$ROOT/.tmp"
  return 0
}

# Test 4: ORAS failure fails and mentions recovery
test_oras_failure() {
  local fixture
  fixture="$(setup_fixture)"
  export FIXTURE_DIR="$fixture"
  export PATH="$fixture/bin:$PATH"
  export MOCK_ORAS_FAIL="true"

  rm -rf "$ROOT/.tmp/.publish-templates"
  write_template_fixture "$ROOT/.tmp/.publish-templates/template-debian" "debian"

  local output
  output="$("$SCRIPT" --distros '["debian"]' --candidateTag "$CANDIDATE_TAG" --imageVersion "$IMAGE_VERSION" 2>&1 || true)"

  if [[ "$output" != *".rebuild-all"* ]]; then
    rm -rf "$fixture" "$ROOT/.tmp"
    return 1
  fi

  rm -rf "$fixture" "$ROOT/.tmp"
  return 0
}

# Test 5: Metadata version mismatch rejects publication
test_metadata_mismatch() {
  local fixture
  fixture="$(setup_fixture)"
  export FIXTURE_DIR="$fixture"
  export PATH="$fixture/bin:$PATH"

  for d in "${DISTROS[@]}"; do
    local dl_dir="$ROOT/.tmp/.publish-templates/template-$d"
    write_template_fixture "$dl_dir" "$d"
  done
  # Tamper with ubuntu version
  write_template_fixture "$ROOT/.tmp/.publish-templates/template-ubuntu" "ubuntu" "wrong-version"

  if "$SCRIPT" \
    --distros '["alpine","archlinux","debian","fedora","ubuntu"]' \
    --candidateTag "$CANDIDATE_TAG" \
    --imageVersion "$IMAGE_VERSION" >/dev/null 2>&1; then
    rm -rf "$fixture" "$ROOT/.tmp"
    return 1
  fi

  rm -rf "$fixture" "$ROOT/.tmp"
  return 0
}

# Test 6: Invalid arguments rejected
test_invalid_args() {
  # Empty distros
  if "$SCRIPT" --distros '[]' --candidateTag "$CANDIDATE_TAG" --imageVersion "$IMAGE_VERSION" >/dev/null 2>&1; then
    return 1
  fi
  # Unknown distro
  if "$SCRIPT" --distros '["unknown"]' --candidateTag "$CANDIDATE_TAG" --imageVersion "$IMAGE_VERSION" >/dev/null 2>&1; then
    return 1
  fi
  # Duplicate distros
  if "$SCRIPT" --distros '["alpine","alpine"]' --candidateTag "$CANDIDATE_TAG" --imageVersion "$IMAGE_VERSION" >/dev/null 2>&1; then
    return 1
  fi
  return 0
}

echo "Running publish-template tests..."
check "full publish stages all 5 and pins digests" test_full_publish
check "partial publish restores unchanged templates via oras" test_partial_publish
check "digest mismatch blocks publication" test_digest_mismatch
check "oras failure blocks publication and mentions .rebuild-all" test_oras_failure
check "metadata mismatch blocks publication" test_metadata_mismatch
check "invalid arguments rejected" test_invalid_args

echo
if [ "$FAILED_TESTS" -eq 0 ]; then
  echo "==> All publish-template tests passed! ($PASSED_TESTS/$PASSED_TESTS)"
  exit 0
else
  echo "==> $FAILED_TESTS test(s) failed!" >&2
  exit 1
fi
