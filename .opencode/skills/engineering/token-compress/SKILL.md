---
name: token-compress
description: Compress large tool outputs by deduplicating lines, folding whitespace, truncating error traces, and more. Use when tool output exceeds ~200 lines or contains repetitive content.
---

# Token Compression

Compress large tool outputs to save tokens while preserving essential information. Compounds every session.

## When to Apply

Apply compression when:
- Tool output exceeds ~200 lines
- Output contains repeated lines or blocks
- Output has long error traces or stack traces
- Output contains whitespace-heavy formatting
- Output has repetitive patterns (hex dumps, long paths, similar lines)

## Automatic Compression

For quick compression of text, pass the content through the `token-compress.py` script:

```
echo "<long-output>" | python scripts/workspace/token-compress.py
```

Or pipe a tool's output:

```
python scripts/workspace/token-compress.py < output.txt
```

## Rules Applied

The `scripts/workspace/token-compress.py` script applies these 7 rules in order:

1. **Strip ANSI escape codes** — remove color/formatting sequences
2. **Fold whitespace** — collapse runs of blank lines to at most 2
3. **Dedup consecutive identical lines** — collapse repeated lines to a single line with a `(xN)` count
4. **Compress paths** — truncate long absolute paths to `.../basename` when the same prefix repeats across lines
5. **Collapse hex dumps and hashes** — show first 8 characters, then `...`
6. **Truncate error and stack traces** — keep first 3 frames, last 2 frames, middle replaced with `... (N frames omitted)`
7. **Shorten repeated similar lines** — if > 5 consecutive lines follow the same pattern, show first 2 + `...<count omitted>` + last 2

## Manual Compression

If the script is unavailable, apply these rules mentally when summarizing output:

- Drop consecutive blank lines
- Replace `file repeated N more times` with a count
- Show only the first and last N lines of error traces
- Truncate paths to basenames
