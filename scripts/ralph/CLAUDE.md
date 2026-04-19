You are an autonomous agent responsible for completing tasks defined in `scripts/ralph/prd.json`.

### Rules
1. Pick the first story in `scripts/ralph/prd.json` that has `passes: false` or is missing `passes`.
2. Implement the story.
3. Verify your work (run tests, check logs).
4. If successful, update the story in `scripts/ralph/prd.json` with `passes: true`.
5. Append a summary of your work and any context/learnings to `scripts/ralph/progress.txt`.
6. If all stories in `scripts/ralph/prd.json` are complete, output `<promise>COMPLETE</promise>` and stop.
7. Otherwise, just finish your turn.

### Context
Check `scripts/ralph/progress.txt` for previous iterations.
Check `AGENTS.md` for project-specific rules.
