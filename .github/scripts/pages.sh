#!/usr/bin/env bash
# Writes the gh-pages branch: the app at its root, a PR's preview in pr-<n>/.
#
#   pages.sh main <dist>         the app: everything at the root but the pr-<n>/ folders becomes <dist>
#   pages.sh preview <n> <dist>  PR <n>'s preview: pr-<n>/ becomes <dist>
#   pages.sh remove <n>          PR <n> closed: pr-<n>/ goes
#
# PAGES_REMOTE is the repository to push to (with a token in it); MESSAGE the commit's message.
# gh-pages stays one commit (no history of builds): each write is a fresh commit pushed with a lease on the
# commit it was made from, so two writers never overwrite each other: the one that loses fetches and writes again.
set -euo pipefail

mode=${1:?usage: pages.sh main <dist> | preview <n> <dist> | remove <n>}
case $mode in
  main) dist=$(realpath "${2:?dist}") ;;
  preview) n=${2:?PR number} dist=$(realpath "${3:?dist}") ;;
  remove) n=${2:?PR number} ;;
  *) echo "unknown mode: $mode" >&2; exit 2 ;;
esac
if [ -n "${n:-}" ] && ! [[ $n =~ ^[0-9]+$ ]]; then echo "not a PR number: $n" >&2; exit 2; fi
remote=${PAGES_REMOTE:?PAGES_REMOTE: the repository to push to}
message=${MESSAGE:-"Pages: $mode ${n:-}"}
export GIT_AUTHOR_NAME="github-actions[bot]" GIT_AUTHOR_EMAIL="41898282+github-actions[bot]@users.noreply.github.com"
export GIT_COMMITTER_NAME=$GIT_AUTHOR_NAME GIT_COMMITTER_EMAIL=$GIT_AUTHOR_EMAIL

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
git init -q "$work"
cd "$work"

for attempt in 1 2 3 4 5; do
  # the branch as it is now (or nothing, the first time)
  find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
  rm -f .git/index
  if git fetch -q --depth 1 "$remote" gh-pages 2>/dev/null; then
    base=$(git rev-parse FETCH_HEAD)
    git read-tree -u --reset FETCH_HEAD
  else
    base=''
  fi

  case $mode in
    main)
      find . -mindepth 1 -maxdepth 1 ! -name .git ! \( -type d -name 'pr-[0-9]*' \) -exec rm -rf {} +
      cp -a "$dist"/. .
      ;;
    preview)
      rm -rf "pr-$n"
      mkdir "pr-$n"
      cp -a "$dist"/. "pr-$n"/
      ;;
    remove) rm -rf "pr-$n" ;;
  esac
  touch .nojekyll # (serve folders that start with _ as they are)

  git add -A
  tree=$(git write-tree)
  if [ -n "$base" ] && [ "$tree" = "$(git rev-parse "$base^{tree}")" ]; then
    echo "gh-pages already has this: nothing to push"
    exit 0
  fi
  commit=$(git commit-tree "$tree" -m "$message")
  # (the lease: gh-pages must still be the commit this was made from; '' = must not exist yet)
  if git push -q --force-with-lease="refs/heads/gh-pages:$base" "$remote" "$commit:refs/heads/gh-pages"; then
    echo "gh-pages: $message"
    exit 0
  fi
  echo "gh-pages moved while writing (attempt $attempt): again from the new one" >&2
  sleep $((attempt * 2))
done
echo "gave up after 5 attempts" >&2
exit 1
