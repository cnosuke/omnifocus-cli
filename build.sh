#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HELPERS="$SCRIPT_DIR/lib/helpers.js"
DIST="$SCRIPT_DIR/dist"
mkdir -p "$DIST"
for script in "$SCRIPT_DIR/scripts"/*.js; do
  name=$(basename "$script")
  cat "$HELPERS" "$script" > "$DIST/$name"
done
cp "$SCRIPT_DIR/of" "$DIST/of"
chmod +x "$DIST/of"
echo "Built $(ls "$DIST"/*.js | wc -l | tr -d ' ') scripts to dist/"
