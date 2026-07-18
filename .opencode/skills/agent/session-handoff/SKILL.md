---
name: session-handoff
description: Wrap up a session by writing a summary to memory, updating the memory index, and optionally creating a forward-facing handoff for the next agent. Use when user says "wrap up", "close out", "hand off", or "end session."
---

# Wrap-Up & Handoff

## When to use

User says something like "wrap up", "close out", "hand off", "end session", or "summarize for the next agent."

## Workflow

### 1. Write session summary

Create `memory/sessions/<YYYY-MM-DD>-<topic>.md`:

```md
# <YYYY-MM-DD>: <topic>

## Accomplished

<Bullet list of what got done.>

## In progress

<What was started but not finished.>

## Decisions

<Key decisions made and why.>

## Artifacts

<Paths or URLs to files, commits, PRs, notes created or changed. Do not duplicate content.>
```

### 2. Update memory index

Read `memory/index.md` first, then update it with:

- **Active projects** the session touched
- **Open threads** the next session should pick up
- **Recent decisions** worth remembering

Keep the index scannable — it's the entry point for future sessions.

### 3. Optionally, write a handoff

If the user has a specific next task in mind, add a **Next steps** section to the session summary above. If the user explicitly wants a separate handoff file, write `memory/sessions/<topic>-handoff.md` with:

```md
# Handoff: <topic>

## Priority

<The single most important thing to do next.>

## Context

<Minimal context needed to start — just what isn't in the session summary.>

## Skills to load

<Suggested skills for the next session.>
```

### 4. Cleanup

Prune handoff files from `memory/sessions/` that have clearly been consumed (referenced in a later session summary).

## Rules

- Do not duplicate content already in files, commits, or notes. Reference by path or URL.
- Session summaries should be 20-40 lines. Handoffs under 20 lines.
- If user specified a focus for next session, prioritize that.
