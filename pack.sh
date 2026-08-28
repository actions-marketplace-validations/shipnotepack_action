#!/usr/bin/env bash
# ShipNote pack — runs on the caller's GitHub runner.
# Uses the vendored packer next to this script. Does not download JS at runtime.
set -euo pipefail

ACTION_DIR="${SHIPNOTE_ACTION_DIR:-$(cd "$(dirname "$0")" && pwd)}"
PACK_CLI="${ACTION_DIR}/pack-cli.js"

if ! command -v node >/dev/null 2>&1; then
  echo "node is required on the runner" >&2
  exit 1
fi
if [ ! -f "$PACK_CLI" ]; then
  echo "missing pack-cli.js next to pack.sh (expected vendored packer in ${ACTION_DIR})" >&2
  exit 1
fi

REPO_NAME="${GITHUB_REPOSITORY##*/}"
PRODUCT="${SHIPNOTE_PRODUCT:-$REPO_NAME}"
[ -n "$PRODUCT" ] || PRODUCT="Release"
TAG="${SHIPNOTE_VERSION:-${GITHUB_REF_NAME:-}}"
if [ -z "$TAG" ]; then
  TAG="$(git describe --tags --exact-match HEAD 2>/dev/null || true)"
fi
if [ -z "$TAG" ]; then
  echo "No tag or version. Set SHIPNOTE_VERSION or run on a tag." >&2
  exit 1
fi

PREV="$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || true)"
NOTES_FILE=""
NOTES_KIND="git log"
for f in CHANGELOG.md changelog.md CHANGELOG.txt History.md HISTORY.md NEWS.md CHANGES.md RELEASES.md; do
  if [ -f "$f" ]; then
    NOTES_FILE="$f"
    NOTES_KIND="CHANGELOG"
    break
  fi
done

if [ -n "$NOTES_FILE" ]; then
  cp "$NOTES_FILE" /tmp/shipnote-log.txt
  GH_URL="https://shipnotepack.com/?gh=https://github.com/${GITHUB_REPOSITORY}/blob/${TAG}/${NOTES_FILE}"
elif [ -n "$PREV" ]; then
  git log --oneline "${PREV}..HEAD" > /tmp/shipnote-log.txt
  GH_URL="https://shipnotepack.com/?gh=https://github.com/${GITHUB_REPOSITORY}/compare/${PREV}...${TAG}"
else
  git log --oneline -n 40 > /tmp/shipnote-log.txt
  GH_URL="https://shipnotepack.com/?gh=https://github.com/${GITHUB_REPOSITORY}"
fi

SUMMARY="${GITHUB_STEP_SUMMARY:-}"
emit() {
  if [ -n "$SUMMARY" ]; then
    tee -a "$SUMMARY"
  else
    cat
  fi
}

{
  echo "# ShipNote pack for ${PRODUCT} ${TAG}"
  echo ""
  echo "Built on your runner from ${NOTES_KIND} since ${PREV:-the start}. ShipNote did not see this log."
  echo ""
  echo "Open the site if you want to edit tone or copy panels: ${GH_URL}"
  echo ""
} | emit

node "$PACK_CLI" \
  --product "$PRODUCT" \
  --version "$TAG" \
  --tone technical \
  --git-log /tmp/shipnote-log.txt \
  | emit

node "$PACK_CLI" \
  --product "$PRODUCT" \
  --version "$TAG" \
  --tone technical \
  --git-log /tmp/shipnote-log.txt \
  --channel github \
  > /tmp/shipnote-github.md

if [ "${SHIPNOTE_CREATE_DRAFT_RELEASE:-true}" = "true" ]; then
  if ! command -v gh >/dev/null 2>&1; then
    echo "gh is required to open a draft Release. The job summary still has the pack."
  elif [ -z "${GH_TOKEN:-${GITHUB_TOKEN:-}}" ]; then
    echo "No GH_TOKEN. Skipping draft Release. The job summary still has the pack."
  elif gh release view "$TAG" >/dev/null 2>&1; then
    echo "Release $TAG already exists — not overwriting notes."
  else
    TITLE="$(node "$PACK_CLI" --product "$PRODUCT" --version "$TAG" --tone technical --git-log /tmp/shipnote-log.txt --json | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const j=JSON.parse(s); process.stdout.write((j.version?j.version+" — ":"")+(j.title||"Release"));})')"
    gh release create "$TAG" --draft --title "$TITLE" --notes-file /tmp/shipnote-github.md
    echo "Opened a draft GitHub Release for $TAG. Edit it, then publish."
  fi
fi

echo "Open this to edit the pack in the browser:"
echo "$GH_URL"
if [ -n "$SUMMARY" ]; then
  echo "SHIPNOTE_URL=$GH_URL" >> "$SUMMARY"
fi
