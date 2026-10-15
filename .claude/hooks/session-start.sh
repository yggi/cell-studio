#!/bin/bash
# When a session starts, resumes or compacts: points git at the pre-push hook (.githooks/pre-push; `npm install` sets
# it too), and in a cloud session installs the dependencies, so `npm test` and `npm run check` work at once, fetches
# `origin/main` and the session's own branch, and says in one line how the checkout stands (branch-status.sh). Its
# stdout goes into the agent's context.
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 1
git config core.hooksPath .githooks
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

log=$(mktemp)
installed=1
npm install --no-audit --no-fund --loglevel=error >"$log" 2>&1 || installed=
if [ ! -d node_modules/@yggi/cells ]; then
  # The language is a dependency from a public repository (`github:yggi/cells#vX.Y.Z` in package.json), which npm
  # fetches as a tarball over HTTPS: no access is needed, so a failed fetch is the network or the session's proxy.
  # Without it nothing compiles, checks or tests.
  tail -5 "$log"
  echo 'session-start: node_modules/@yggi/cells is missing, so nothing here compiles, checks or tests.'
  echo 'session-start: yggi/cells is public, so a failed fetch of it means the network or the proxy, not access (the lines above are npm'"'"'s).'
  echo 'session-start: the fix: run `npm ci` again; if it fails the same way, check the proxy ($HTTPS_PROXY) and that github.com and codeload.github.com are reachable.'
elif [ -z "$installed" ]; then
  tail -20 "$log"
  echo 'session-start: npm install failed; run it by hand before npm run verify'
fi
rm -f "$log"

# A cloud checkout may hold only its own branch. The explicit refspec makes origin/main exist even then. Failing to
# fetch is reported (branch-status.sh says origin/main is unknown), not fatal.
timeout 30 git fetch -q origin main:refs/remotes/origin/main 2>/dev/null
branch=$(git symbolic-ref -q --short HEAD)
[ -n "$branch" ] && timeout 30 git fetch -q origin "$branch:refs/remotes/origin/$branch" 2>/dev/null
sh "$(dirname "$0")/branch-status.sh"
exit 0
