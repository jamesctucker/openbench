# /work

External project repos that benefit from OpenBench's skills, spaces, and infra, while remaining independently versioned.

Pull repos in here when you want to work on them using this workspace's tools and context. Each subdirectory is its own git repo — no submodules, no nesting.

**Convention:** `/work/<repo>/` (shorter names preferred; repos are independently versioned)

This file is tracked; everything else in this directory is gitignored.

## Current repos

| Repo | Description | AGENTS.md |
|------|-------------|-----------|
| `mrets/` | Rails 7 API backend (M-RETS / WREGIS registries) | [AGENTS.md](mrets/AGENTS.md) |
| `mrets-react/` | React 18 SPA frontend | [AGENTS.md](mrets-react/AGENTS.md) |
| `mrets_integration_tests/` | Cypress 15 E2E test suite | [AGENTS.md](mrets_integration_tests/AGENTS.md) |

> See [`memory/work-repos.md`](../memory/work-repos.md) for persistent agent context about these repos.
