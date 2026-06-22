# Claude Project Context

This repository uses `.claude/` as the authoritative project context for Claude sessions.

At the start of a new Claude session, read these files in order:

1. `.claude/system.md`
2. `.claude/policy.md`
3. `.claude/rule.md`

For later tasks in the same session, reuse the already-loaded context unless one of these files changed, the task depends on details not yet inspected, or there is uncertainty that requires re-checking the source.

Use those files as the source of project architecture, engineering policy, and collaboration rules.

When facts are unclear or missing, search the repository source, configuration, tests, deployment files, and existing docs first. If evidence is still missing or contradictory, ask the user for confirmation before treating assumptions as facts.
