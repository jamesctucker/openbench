---
name: wtf
description: Diagnose a failed command and suggest a fix. Use when user says "wtf", "wtf just happened", "why did that fail", or runs /wtf after a command error.
---

# WTF — Command Failure Diagnostics

Diagnose what went wrong with a failing command and tell the user how to fix it.

## When to Apply

Load this skill when the user:
- Says "wtf" or "/wtf"
- Asks "why did that fail" or "what went wrong"
- Pastes an error and wants help understanding it
- Runs a command that errored and wants a quick diagnosis

## Workflow

1. **Gather context.** If the user just ran a command and it failed, the error may already be in context. If not, check what you can (git status, recent file changes, process state) before asking. Ask the user to paste the command + error only if you can't find it.

2. **Reproduce if possible.** If the command is safe and non-destructive, try running it yourself to see the full error output. If it's destructive or you can't run it (e.g., requires specific env, network access, or interactive input), skip this step.

3. **Diagnose.** Analyze the error:
   - Read the error message literally — most errors say exactly what's wrong
   - Check for common categories:
     - **Missing dependency**: command not found, module not found, package not installed
     - **Permission denied**: file perms, sudo needed, wrong ownership
     - **Path issues**: file not found, wrong directory, symlink broken
     - **Type/syntax error**: wrong argument, malformed input, version mismatch
     - **Network/auth**: connection refused, timeout, bad credentials, CORS
     - **Resource limits**: out of memory, disk full, port in use
   - Check relevant config files, env vars, and project state if the error is ambiguous

4. **Explain and fix.** Give:
   - **What happened** — one sentence, plain language
   - **Why** — root cause if not obvious from the error text
   - **How to fix** — exact command(s) to run, or exact change to make
   - If multiple fixes are possible, rank by likelihood

5. **Verify.** If you ran the command and it failed, try your fix and confirm it works.

## Tone

- Direct, no fluff
- Explain like you're talking to a colleague who's annoyed — quick, accurate, actionable
- Don't patronize; do explain *why* something failed
- If the error is obvious from the message, say so briefly — don't pad it out
- If you can't diagnose it, say so and suggest where to look next

## Examples

### Example 1: Missing command

> **User**: wtf — `eslint: command not found`

**What**: `eslint` isn't installed or isn't on your PATH.
**Fix**: `npm install -D eslint` (or `npx eslint` to run without installing globally).

### Example 2: Permission denied

> **User**: wtf — `EACCES: permission denied, mkdir '/usr/local/lib/node_modules/foo'`

**What**: npm is trying to write to a system directory.
**Fix**: Don't use `sudo npm install -g`. Instead: `mkdir ~/.npm-global && npm config set prefix '~/.npm-global'`, then add `~/.npm-global/bin` to your PATH.

### Example 3: Vague error

> **User**: wtf — build fails with `error TS2307: Cannot find module './utils'`

**What**: TypeScript can't resolve `./utils` — the file is missing, has the wrong extension, or the import path is wrong.
**Fix**: Check that `src/utils.ts` (or `.js`) exists and the import path matches the actual file location relative to the importing file.