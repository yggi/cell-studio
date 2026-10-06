#!/bin/bash
# Cloud sessions only: make sure dependencies are there, so `npm test` and `npm run check` work at once.
set -euo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}"
npm install --no-audit --no-fund --loglevel=error
