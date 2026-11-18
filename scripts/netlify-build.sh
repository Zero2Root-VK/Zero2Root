#!/usr/bin/env bash
set -Eeuo pipefail

SITE_DIR="site"
ASTRO_BRANCH="prototype/astro-knowledge-explorer-main"
BUILD_BRANCH="${BRANCH:-unknown}"
IS_ASTRO_PROTOTYPE=false

# Netlify Deploy Previews expose REVIEW_ID and CONTEXT. Use the dedicated
# prototype PR as a guarded fallback when BRANCH is absent or reports the
# base branch instead of the PR head branch.
if [[ "${BRANCH:-}" == "$ASTRO_BRANCH" ]]; then
  IS_ASTRO_PROTOTYPE=true
elif [[ "${CONTEXT:-}" == "deploy-preview" && "${REVIEW_ID:-}" == "5" ]]; then
  IS_ASTRO_PROTOTYPE=true
  BUILD_BRANCH="$ASTRO_BRANCH"
fi

echo "Netlify build context: CONTEXT=${CONTEXT:-unknown}, BRANCH=${BRANCH:-unknown}, REVIEW_ID=${REVIEW_ID:-unknown}"

if [[ "$IS_ASTRO_PROTOTYPE" == "true" ]]; then
  echo "Building isolated Astro/Starlight prototype for $BUILD_BRANCH"
  npm --prefix astro-prototype install --no-audit --no-fund
  npm --prefix astro-prototype run build
  rm -rf "$SITE_DIR"
  mkdir -p "$SITE_DIR"
  cp -R astro-prototype/dist/. "$SITE_DIR/"
  printf '{"engine":"astro-starlight","branch":"%s","commit":"%s","built_at":"%s"}\n' \
    "$BUILD_BRANCH" "${COMMIT_REF:-unknown}" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    > "$SITE_DIR/prototype-build.json"
elif [[ "${BRANCH:-}" == prototype/astro-knowledge-explorer* ]]; then
  echo "Refusing to silently publish MkDocs for an unexpected Astro prototype branch: ${BRANCH}" >&2
  exit 12
else
  echo "Building existing MkDocs site for ${BRANCH:-unknown branch}"
  pip install -r requirements.txt
  mkdocs build
  python remove_duplicate_banner.py
  printf '{"engine":"mkdocs","branch":"%s","commit":"%s","built_at":"%s"}\n' \
    "${BRANCH:-unknown}" "${COMMIT_REF:-unknown}" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    > "$SITE_DIR/prototype-build.json"
fi
