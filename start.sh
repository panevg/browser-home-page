#!/bin/bash
# Builds the page (if needed) and serves it at http://localhost:2783
cd "$(dirname "$0")" || exit 1

[ -d node_modules ] || npm install || exit 1
[ -d dist ] || npm run build || exit 1

exec npm run preview -- --host 127.0.0.1
