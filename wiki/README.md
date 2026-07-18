# Wiki — PARA Vault

Knowledge management using the PARA method. Humans write here; agents write to `memory/`.

## Structure

- **0 Inbox** — captured items awaiting sorting
- **1 Projects** — active, paused, and completed project top notes (with YAML frontmatter)
- **2 Areas** — ongoing responsibilities (no finish line)
- **3 Resources** — topical reference material
- **4 Archives** — inactive material kept for reference

## Project top notes

Every project in `1 Projects/` should have a top note with YAML frontmatter:

```yaml
---
status: active | paused | completed
priority: low | medium | high | urgent
tags: []
next-action: ""
---
```

Index of all projects: `1 Projects/projects.md`.

## Conventions

- `0 Inbox/00 Scratchpad.md` is the human scratchpad — agents must never write to it.
- Wiki notes use Markdown + wikilinks.
- For agent session context, see `memory/`, not here.
