#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' 'Node.js is missing. In the Linux terminal run: sudo apt install nodejs npm' >&2
  exit 1
fi
printf '%s\n' 'Preparing Bad Fodder. Keep this terminal open while testing.'
node tools/runtime/build.cjs
BADFODDER_OPEN_BROWSER=1 node tools/runtime/serve.cjs
