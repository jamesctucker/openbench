---
name: obsidian-audit
description: Scan the Obsidian vault for broken wikilinks, orphaned notes, missing frontmatter, stale last-reviewed dates, and projects not indexed in projects.md. Run before making structural changes or periodically to prevent silent decay.
---

# Obsidian Vault Audit

Run the audit script and interpret its findings. The script is at `scripts/obsidian-audit` and checks five categories.

## Usage

```bash
scripts/obsidian-audit
```

## What it checks

| Check | What it finds |
|-------|---------------|
| Broken wikilinks | `[[Link]]` where no `.md` file exists in the vault |
| Orphaned project notes | Files in `wiki/1 Projects/` not linked from any other note |
| Missing frontmatter | Project `00 Top Note.md` files missing required keys (`status`, `priority`, `next-action`) |
| Stale last-reviewed | `last-reviewed` in frontmatter > 60 days old |
| Unindexed projects | Directories in `1 Projects/` not listed in `projects.md` |

## Interpreting results

- **Readwise imports** (`wiki/3 Resources/Readwise/`): Broken wikilinks here (author names, tag references like `[[favorite]]`, `[[capacities]]`, `[[starred]]`) are expected — Readwise auto-imports these references but the target notes don't exist in the vault. Known pre-existing issue.
- **`projects.md` orphaned**: Expected — it's the project index, nothing links to it by design.
- **True orphans**: Notes in `1 Projects/` that aren't linked from any other note and aren't `projects.md`. These should either be linked into relevant index notes or archived.

## When to run

- Before restructuring PARA folders
- Periodically (monthly, or before review-memory)
- When the user reports "I can't find a note" or notices stale wikilinks
