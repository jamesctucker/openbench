---
name: space-loader
description: Load a space's full context into the conversation. Use when the user invokes a space by name (e.g., "as flip-advisor", "consult gg-board-strategist", "use the board strategist space") or asks to work with a space.
---

# Space Loader

Load a named space from `spaces/<name>/` into the current conversation context.

## When to load this skill

- User says "as flip-advisor", "consult gg-board-strategist", "use the [name] space"
- User asks to work with a space by name or role
- User references a space's expertise area and wants that lens applied

## Available spaces

| Name | Directory | Role |
|------|-----------|------|
| flip-advisor | `spaces/flip-advisor/` | Government auctions and liquidation reselling |
| gg-board-strategist | `spaces/gg-board-strategist/` | Nonprofit board strategy and sponsorship copy editing |

Check `spaces/README.md` for the full list — new spaces may have been added since this table.

## Loading workflow

1. **Identify the space** from the user's request. Match partial names or role descriptions to the closest space.
2. **Read the space files** in order:
   - `spaces/<name>/INSTRUCTIONS.md` — always required; identity, expertise, style, default context, declared skills
   - `spaces/<name>/files/REFERENCE.md` — load when doing hands-on work in the space's domain (deal evaluation, copy editing, etc.)
   - `spaces/<name>/files/RESOURCES.md` — load only when the user needs cited sources or external references
3. **Emit the space marker**: output `<!-- space: <name> -->` as the first line of your announcement. This marker is used by `scripts/spaces/sync-sessions.ts` to associate the OpenCode session with this space for session history tracking.
4. **Adopt the space**: after reading, speak and act from that space's perspective for the rest of the conversation. Apply their tone, principles, and expertise.
5. **Announce the switch**: tell the user you've loaded the space, e.g., "Loaded flip-advisor space. I'll be advising with that lens from here."
6. **Load declared skills**: if `INSTRUCTIONS.md` frontmatter contains a `skills:` list, load each skill using the skill tool.
7. **Run session sync**: run `bun run scripts/spaces/sync-sessions.ts --space <name>` to update `SESSIONS.md` with any new OpenCode sessions for this space.

## Progressive disclosure

Don't load all files at once unless the task clearly needs all of them. Start with INSTRUCTIONS.md, then pull files/REFERENCE.md or files/RESOURCES.md as the conversation deepens.

## Unloading

If the user says "drop the space", "back to normal", or switches to an unrelated task, revert to your default behavior. No files need to be "unloaded" — just stop applying the space's lens.
