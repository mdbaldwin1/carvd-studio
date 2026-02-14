#!/bin/bash
# Vercel Ignored Build Step
# Exit 0 = skip build, Exit 1 = proceed with build
# See: https://vercel.com/docs/projects/overview#ignored-build-step

# Only build on main branch
if [ "$VERCEL_GIT_COMMIT_REF" != "main" ]; then
  echo "Skip: not main branch ($VERCEL_GIT_COMMIT_REF)"
  exit 0
fi

# Try to read current website version (handles both repo root and packages/website as cwd)
CURR=""
if [ -f "packages/website/package.json" ]; then
  CURR=$(node -p "JSON.parse(require('fs').readFileSync('packages/website/package.json','utf-8')).version" 2>/dev/null)
elif [ -f "package.json" ]; then
  CURR=$(node -p "JSON.parse(require('fs').readFileSync('package.json','utf-8')).version" 2>/dev/null)
fi

if [ -z "$CURR" ]; then
  echo "Build: could not read current version"
  exit 1
fi

# Try to read previous version from git history
PREV=$(git show HEAD~1:packages/website/package.json 2>/dev/null | node -p "try{JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')).version}catch{''}" 2>/dev/null || echo "")

if [ "$CURR" = "$PREV" ]; then
  echo "Skip: website v$CURR unchanged"
  exit 0
fi

echo "Build: website v${PREV:-<none>} -> v$CURR"
exit 1
