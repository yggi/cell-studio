@AGENTS.md

## Claude Code

- The `profile` skill (`.claude/skills/profile/SKILL.md`) measures main-thread load; use it for any performance claim.
- Never `pkill -f "<pattern>"` when the pattern also appears in the command line itself; it kills the shell. Use the PID or a port check.
- In cloud sessions the GitHub wiki isn't reachable; project memory is `docs/` ([decision 001](docs/decisions/001-no-wiki.md)).
