# Artifacts

Agent-produced research, architecture docs, and design plans. Each is a standalone numbered markdown file capturing a distinct topic, decision, or discovery. Inspired by the [parlor](https://github.com/fikrikarim/parlor) project's conventions.

## Conventions

- Files are numbered sequentially: `NN-short-title.md`
- Every artifact must have a **Table of Contents** with anchor links to each major section
- Every artifact must have a **Date** and **Context** blockquote after the title
- Start from `_TEMPLATE.md` when creating a new artifact

## Diagrams

Excalidraw drawings live in `diagrams/` alongside artifacts. Two conventions:

1. **Standalone diagrams** — save `.excalidraw` files in `diagrams/` and embed in artifacts via `![[diagram-name.excalidraw]]`
2. **Inline diagrams** — embed an Excalidraw drawing directly in any note using the same embed syntax

Export to PNG/SVG before commit if you want stable diffs (`.excalidraw` files are JSON and hard to diff).
