#!/usr/bin/env bash
set -Eeuo pipefail

SITE_DIR="site"
ASTRO_BRANCH="prototype/astro-knowledge-explorer-main"

if [[ "${BRANCH:-}" == "$ASTRO_BRANCH" ]]; then
  echo "Building isolated Astro/Starlight prototype for $BRANCH"
  npm --prefix astro-prototype install --no-audit --no-fund
  npm --prefix astro-prototype run build
  rm -rf "$SITE_DIR"
  mkdir -p "$SITE_DIR"
  cp -R astro-prototype/dist/. "$SITE_DIR/"
else
  echo "Building existing MkDocs site for ${BRANCH:-unknown branch}"
  pip install -r requirements.txt
  mkdocs build
  python remove_duplicate_banner.py
fi
