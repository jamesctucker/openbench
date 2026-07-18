# Agent Eval — Quality Baseline

This directory tracks the agent evaluation harness results. The harness (`scripts/workspace/agent-eval.py`) runs a set of golden tasks to verify the workspace is functional and discoverable.

## Structure

- `results/YYYY-Wnn.md` — Weekly evaluation results with per-task pass/fail and score trend

## Golden tasks

| Task | What it checks |
|------|---------------|
| `license-exists` | `LICENSE` exists and contains MIT text |
| `validate-passes` | `validate.py` exits 0 |
| `session-search-works` | session-index.py returns results for "session" |
| `gitattributes-exists` | `.gitattributes` exists |
| `editorconfig-exists` | `.editorconfig` exists |

## Usage

```bash
python scripts/workspace/agent-eval.py        # run all tasks
python scripts/workspace/agent-eval.py --history  # view weekly trends
```
