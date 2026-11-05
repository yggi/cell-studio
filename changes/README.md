# Changes not yet released

A pull request with a change a user would notice adds one file here, `changes/<issue-number-or-short-slug>.md`, in place of a line under *Unreleased* in [CHANGELOG.md](../CHANGELOG.md): a new file never conflicts with another pull request's.
Its first line is the section's heading as the changelog writes it: `### Added`, `### Changed`, `### Removed`, `### Fixed` or `### Developer`.
Then comes the entry, one or more bullets, written exactly as it will read in the changelog; say there whether it could affect saved `.cells` pieces.
`npm run changelog -- check` checks every entry (it runs in `npm run verify` and in the docs-only check), and a release gathers them under its heading and deletes them (`npm run changelog -- gather X.Y.Z`).
This file is not an entry.
