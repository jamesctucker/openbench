# Changelog

All notable changes to OpenBench are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **RTK → Headroom migration** — replaced RTK (Rust Token Killer) with Headroom for context compression:
  - Installed `headroom-ai[mcp]` via pip, registered MCP server with OpenCode
  - Uninstalled `rtk` binary via Homebrew, deleted `.opencode/plugins/rtk.ts`
  - Rewrote AGENTS.md Token Efficiency section (RTK → Headroom)
  - Updated README.md structure tree, Built on table, and Getting Started step
  - Replaced RTK install section in `scripts/setup` with Headroom section
- **README.md accuracy pass** — reconciled the README against current repo state after the cron-runner TypeScript migration and RTK integration:
  - Replaced all `python scheduled/cron-runner.py` commands with `bun run .opencode/cron/runner.ts` equivalents (Scheduled jobs section + crontab example)
  - Removed references to non-existent `feed-catchup.yaml` (prose + structure tree)
  - Replaced broken `semble search` CLI demo with MCP-tool invocation hint
  - Updated skills count from "~20" to "27"
  - Qualified Orchestrator Harness row as "(currently disabled)" in the comparison table
  - Added RTK to the "Built on" table and the Getting Started install step (`brew install rtk && rtk init -g --opencode`)
  - Rewrote the structure tree to reflect actual on-disk layout: removed `todos/` and phantom `cron-runner.py`; added `CHANGELOG.md`, `.nvmrc`, `package.json`, `pyproject.toml`, `requirements.txt`, `reader_persona.md`, `.husky/`, `tests/`, `memory/eval/`, and `.opencode/` subtree (`cron.config.yaml`, `cron/`, `plugins/`)
  - Verified `--dry-run` flag still supported by the TypeScript runner before re-listing it

## [0.2.0] — 2026-06-16

### Added

- **Agent 6 — CI & quality baseline** (#18–#22):
  - CI pipeline: GitHub Actions workflow with Python tests, lint, Node tests, and workspace validation (pytest + vitest + ruff) (#20)
  - Test suite: 85 pytest + 2 vitest covering lib, validate, token-compress, cron-runner, session-frontmatter, health-check, update-index (#18)
  - Developer tooling: `pyproject.toml` with ruff config, root `requirements.txt`, `.nvmrc`, Husky pre-push hook (#19)
  - Infrastructure: `.husky/` pre-push hook runs pytest + ruff before each push (#19)
  - Documentation: `CHANGELOG.md` with Keep a Changelog format, semantic versioning started at v0.1.0 (#21)
- **Agent 7 — Agent observability** (#23, #25, #26):
  - `memory-promoter` skill: scans `memory/staging/` for cross-referenced topics and promotes entries referenced 3+ times to wiki project notes (#23)
  - `agent-eval` harness: golden task set (8 tasks) with results tracking in `memory/eval/results/` and trend analysis (#25)
  - `session-trace` skill: produces structured timeline traces from session files with reasoning steps, decisions, tool calls, and artifact tracking (#26)

### Changed

- `.gitignore`: added `.pytest_cache/` exclusion

## [0.1.0] — 2026-06-15 (Phase 1 foundation)

> Retrospective: Phase 1 items were implemented in earlier commits before semantic versioning was established.
> This changelog entry captures the state of the workspace at the start of Phase 2.

### Added

- Session search indexer (`scripts/workspace/session-index.py`) with SQLite FTS5 (#13)
- Startup health check (`scripts/workspace/health-check.py`) (#14)
- OpenBench Cron scheduler (`scripts/workspace/cron-runner.py`) (#15)
- YAML frontmatter schema for sessions (`memory/.sessions-schema.yaml`) (#16)
- Memory index auto-updater (`scripts/workspace/update-index.py`)
- Token compressor skill (`scripts/workspace/token-compress.py`) (#6)
- Workspace structure validator (`scripts/workspace/validate.py`)
- Session frontmatter helper (`scripts/workspace/session-frontmatter.py`)
- Editing conventions (`AGENTS.md`, `.editorconfig`) (#17)
- Open source files: `LICENSE` (MIT), `SECURITY.md`, `CODE_OF_CONDUCT.md` (#1, #2, #3)
- GitHub templates: issue and PR templates (#12)
- Project documentation: `CONTRIBUTING.md`, `ARCHITECTURE.md`, `CLAUDE.md`, `llms.txt` (#7, #9, #10, #11)
- `README.md` rewrite with problem/philosophy/demo/comparison sections (#8)
- `.gitattributes` (#4)
- Skill ecosystem: `command-policy`, `token-compress`, plus 15+ existing skills (#5, #6)
- `session-search` skill (#13)
- Artifact AI authorship attribution convention (#47)
