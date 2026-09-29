#!/usr/bin/env bash
#MISE description="Open a PR that rebuilds all distro images"

set -euo pipefail

if [[ -n "$(git status --porcelain)" ]]; then
  echo "working tree has uncommitted changes; refusing to create rebuild PR" >&2
  exit 1
fi

git fetch origin main
branch="rebuild-all-$(date -u +%Y%m%d-%H%M%S)"
git switch --create "$branch" origin/main

date -u +%Y-%m-%dT%H:%M:%SZ >.rebuild-all

git add .rebuild-all
git commit -m "chore: rebuild all distros"
git push --set-upstream origin "$branch"
gh pr create --base main --head "$branch" --title "chore: rebuild all distros" --body "Trigger a full rebuild of all distro images and templates."
git switch main
git branch --delete --force "$branch"
