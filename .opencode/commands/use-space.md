---
description: Load a space into current context
---

Output `<!-- space: $ARGUMENTS -->` as the first line — this marker is used by the session sync script to associate this OpenCode session with the space.

Load the space named "$ARGUMENTS" from the `spaces/` directory. Read `spaces/$ARGUMENTS/INSTRUCTIONS.md` (required) and any `files/REFERENCE.md` or `files/RESOURCES.md` present. Adopt the space's context — apply their domain expertise, tone, principles, and default context for the rest of this conversation. Announce which space was loaded.

If `INSTRUCTIONS.md` frontmatter contains a `skills:` list, load each skill using the skill tool.

Then run `bun run scripts/spaces/sync-sessions.ts --space $ARGUMENTS` to update SESSIONS.md.

If "$ARGUMENTS" is empty, list available spaces from `spaces/README.md` instead.
