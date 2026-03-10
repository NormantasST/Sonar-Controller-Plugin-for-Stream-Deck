---
name: code-review
description: "Review unpushed commits for bugs, readability, and code quality. Use when: reviewing commits before push, auditing changes before merging, checking code quality of recent work, pre-push review."
argument-hint: "Describe focus area (e.g. 'security', 'readability', 'all') or leave blank for full review"
---

# Code Review — Unpushed Commits

## When to Use

- Before pushing a branch or commits to remote
- Reviewing recent work for bugs, typos, and readability
- Auditing changes between local HEAD and origin

## Procedure

1. **Identify the review scope**
   - Run `git branch --show-current` to confirm the active branch
   - Run `git log --oneline origin/<branch>..HEAD` to list unpushed commits
   - If no unpushed commits, inform the user and stop

2. **Gather the diff**
   - Run `git diff origin/<branch>..HEAD --stat` for a file-level summary
   - Run `git diff origin/<branch>..HEAD` for the full diff
   - Read the full current version of each changed file for complete context

3. **Review for bugs** — Check each changed file for:
   - Logic errors (off-by-one, incorrect conditions, missing early returns)
   - Null/undefined safety (missing `??`, `?.`, or nullability guards)
   - Values unconditionally overwritten that should be conditional (e.g. `=` vs `??=`)
   - Missing entries in maps, enums, or lookup tables that should be exhaustive
   - Stray syntax artifacts (extra characters, unclosed brackets)
   - Broken type contracts (wrong types, missing fields in interfaces)

4. **Review for readability** — Check for:
   - Typos in identifiers and comments
   - Duplicated logic that can be collapsed
   - Inconsistent naming conventions
   - Indentation / formatting inconsistencies
   - Dead code or unreachable branches

5. **Present findings** as a structured report:
   - Use a table with columns: Severity, Issue, Line (with link)
   - Group by: Bugs first, then Typos, then Readability
   - For each issue, show the problematic code and the suggested fix
   - Keep suggestions minimal — only fix what's wrong, don't refactor unrelated code

6. **Ask** whether the user wants any or all fixes applied

## Review Principles

- **Only review changed code.** Don't critique pre-existing patterns outside the diff.
- **Be specific.** Every finding must reference a file and line number.
- **Minimal fixes.** Suggest the smallest change that resolves each issue.
- **No over-engineering.** Don't propose abstractions, extra error handling, or refactors beyond what's needed.
