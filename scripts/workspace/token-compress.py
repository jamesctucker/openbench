#!/usr/bin/env python3
"""Token Compressor — compress large tool outputs to save tokens.

Applies 7 rules in order:
  1. Strip ANSI escape codes
  2. Fold whitespace (collapse blank line runs to max 2)
  3. Dedup consecutive identical lines (show count)
  4. Compress long absolute paths to .../basename
  5. Collapse hex dumps and hashes (show first 8 chars)
  6. Truncate error/stack traces (first 3, last 2 frames)
  7. Shorten repeated similar lines (>5 consecutive with same prefix)

Usage:
  cat output.txt | python scripts/workspace/token-compress.py
  python scripts/workspace/token-compress.py < output.txt
"""
import re
import sys

ANSI_RE = re.compile(r"\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])")
HEX_RE = re.compile(r"\b0x[0-9a-fA-F]{12,}\b")
HASH_RE = re.compile(r"\b[0-9a-fA-F]{16,}\b")
PATH_RE = re.compile(r"(/[a-zA-Z0-9._~@+=-]+){3,}(/[a-zA-Z0-9._~@+=-]+)")
TRACE_FRAME_RE = re.compile(r"^\s*(at\s|File\s|\[.*:\d+\])")
STACK_TRACE_MARKERS = (
    "Traceback (most recent call last):",
    "Error:",
    "Exception:",
)
SIMILAR_PREFIX_LEN = 25


def strip_ansi(line: str) -> str:
    return ANSI_RE.sub("", line)


def fold_whitespace(lines: list[str]) -> list[str]:
    result: list[str] = []
    blank_count = 0
    for line in lines:
        if not line.strip():
            blank_count += 1
            if blank_count <= 2:
                result.append(line)
        else:
            blank_count = 0
            result.append(line)
    return result


def dedup_consecutive(lines: list[str]) -> list[str]:
    result: list[str] = []
    i = 0
    while i < len(lines):
        count = 1
        while i + count < len(lines) and lines[i] == lines[i + count]:
            count += 1
        if count > 2:
            has_newline = lines[i].endswith("\n")
            stripped = lines[i].rstrip()
            if not stripped:
                label = f"(blank line x{count})"
            else:
                label = f"{stripped} (x{count})"
            result.append(label + ("\n" if has_newline else ""))
        elif count == 2:
            result.append(lines[i])
            result.append(lines[i])
        else:
            result.append(lines[i])
        i += count
    return result


def compress_paths(line: str) -> str:
    def replacer(m: re.Match) -> str:
        parts = m.group(0).split("/")
        if len(parts) > 4:
            return f".../{parts[-2]}/{parts[-1]}"
        return m.group(0)

    return PATH_RE.sub(replacer, line)


def collapse_hex(line: str) -> str:
    line = HEX_RE.sub(lambda m: f"0x{m.group(0)[2:10]}...", line)
    line = HASH_RE.sub(lambda m: f"{m.group(0)[:8]}...", line)
    return line


def truncate_traces(lines: list[str]) -> list[str]:
    result: list[str] = []
    in_trace = False
    frame_lines: list[str] = []

    for line in lines:
        stripped = line.strip()
        if not in_trace and any(stripped.startswith(m) for m in STACK_TRACE_MARKERS):
            in_trace = True
            frame_lines = [line]
            continue

        if in_trace:
            if TRACE_FRAME_RE.match(line) or not stripped:
                frame_lines.append(line)
                continue
            if len(frame_lines) > 6:
                result.append(frame_lines[0])
                result.extend(frame_lines[1:4])
                result.append(f"... ({len(frame_lines) - 6} frames omitted)\n")
                result.extend(frame_lines[-2:])
            else:
                result.extend(frame_lines)
            in_trace = False
            frame_lines = []
            result.append(line)
            continue

        result.append(line)

    if in_trace and frame_lines:
        if len(frame_lines) > 6:
            result.append(frame_lines[0])
            result.extend(frame_lines[1:4])
            result.append(f"... ({len(frame_lines) - 6} frames omitted)\n")
            result.extend(frame_lines[-2:])
        else:
            result.extend(frame_lines)

    return result


def shorten_repeated_pattern(lines: list[str]) -> list[str]:
    if len(lines) < 6:
        return lines

    def prefix(s: str) -> str:
        stripped = s.strip()
        return stripped[:SIMILAR_PREFIX_LEN]

    result: list[str] = []
    i = 0
    while i < len(lines):
        if i + 5 < len(lines):
            p = prefix(lines[i])
            similar = 1
            for j in range(i + 1, min(i + 100, len(lines))):
                if prefix(lines[j]) == p:
                    similar += 1
                else:
                    break
            if similar > 5:
                result.append(lines[i])
                result.append(lines[i + 1])
                result.append(f"... ({similar - 4} similar lines omitted)\n")
                result.append(lines[i + similar - 2])
                result.append(lines[i + similar - 1])
                i += similar
                continue
        result.append(lines[i])
        i += 1
    return result


def compress(text: str) -> str:
    lines = text.splitlines(keepends=True)
    lines = [strip_ansi(l) for l in lines]
    lines = fold_whitespace(lines)
    lines = dedup_consecutive(lines)
    lines = [compress_paths(l) for l in lines]
    lines = [collapse_hex(l) for l in lines]
    lines = truncate_traces(lines)
    lines = shorten_repeated_pattern(lines)
    return "".join(lines)


def main() -> int:
    text = sys.stdin.read()
    sys.stdout.write(compress(text))
    return 0


if __name__ == "__main__":
    sys.exit(main())
