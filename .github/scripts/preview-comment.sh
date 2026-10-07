#!/usr/bin/env bash
# Keeps one comment on PR <n> that says where its preview is (or that it's gone): found by a hidden marker
# and edited, so a PR pushed to ten times still has one comment.
#
#   preview-comment.sh <n> up <sha>   the preview of <sha> is at …/pr-<n>/
#   preview-comment.sh <n> removed    the PR closed and the preview went
#
# Needs GH_TOKEN (pull-requests: write) and GITHUB_REPOSITORY; the gh CLI is on every GitHub runner.
set -euo pipefail

n=${1:?PR number}
state=${2:?up or removed}
repo=${GITHUB_REPOSITORY:?}
marker='<!-- cell-studio:pr-preview -->'

# the Pages address: as the repository's Pages settings say (a custom domain too), else the default one
owner=${repo%%/*}
pages=$(gh api "repos/$repo/pages" --jq .html_url 2>/dev/null || echo "https://${owner,,}.github.io/${repo#*/}/")
url="${pages%/}/pr-$n/"

case $state in
  up)
    sha=${3:?commit}
    body="$marker
**Preview** of ${sha:0:7}: $url

Updated on every push (live a minute or two after the run, once Pages has published it); removed when the PR closes. Settings it keeps (\`?latency=\`, \`?lookahead=\`, \`?perf\`, the engine, the library's layout) and its saved pieces are its own, not the app's: open a piece of yours there as a \`.cells\` file."
    ;;
  removed)
    body="$marker
~~Preview~~: removed when the PR closed."
    ;;
  *) echo "unknown state: $state" >&2; exit 2 ;;
esac

id=$(gh api --paginate "repos/$repo/issues/$n/comments" \
  --jq ".[] | select(.user.login == \"github-actions[bot]\" and (.body | contains(\"$marker\"))) | .id" | head -n1)
if [ -n "$id" ]; then
  gh api -X PATCH "repos/$repo/issues/comments/$id" -f body="$body" > /dev/null
elif [ "$state" = up ]; then
  gh api -X POST "repos/$repo/issues/$n/comments" -f body="$body" > /dev/null
fi
echo "$url"
