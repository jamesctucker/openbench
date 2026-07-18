# OpenBench

A personal workspace for building projects, storing documents, and running agentic AI workflows with OpenCode.

## What's in here

- `wiki/` — PARA knowledge management vault (human-written)
- `memory/` — agent session summaries, staging, and reviews (agent-written)
- `work/` — independently versioned project repos (each subdir is its own git repo)
- `artifacts/` — research, architecture docs, design plans
- `spaces/` — reusable domain consultant prompts
- `scripts/` — tooling (MCP servers, workspace scripts, sandbox wrappers)
- `scheduled/` — cron job YAMLs for automated agent tasks
- `.opencode/` — OpenCode config, skills, plugins, cron runner

## Setup

```bash
git clone <this-repo>
cd openbench
bash scripts/setup
```

Requires: `git`, `bun`. The setup script installs workspace deps, OpenCode deps, MCP server deps, and Python workspace deps. It also offers to install `remindctl` (macOS Reminders CLI) and `headroom` (context compression) optionally.

Next: edit `AGENTS.md` to match your project tracking setup, edit `.opencode/opencode.json` to enable/disable MCP servers, and start OpenCode in the repo root.

## Integrations

MCP servers configured in `.opencode/opencode.json`:

- **Granola** — meeting notes and voice memo integration (remote MCP, no setup)
- **Sunsama** — daily planning and task management (remote MCP, no setup). The `executive-function` skill pairs well with Sunsama.
- **Readwise** — highlights and Reader access (remote MCP, no setup)
- **Semble** — semantic code search across `work/` repos (local server, `uvx`)
- **Headroom** — context compression (local server, save 60-95% on tool output tokens)

See `AGENTS.md` for the full directory map and agent conventions.
