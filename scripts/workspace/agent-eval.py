#!/usr/bin/env python3
"""Agent Evaluation Harness — golden task set for agentic quality.

Runs a suite of golden tasks that the workspace agent should complete
correctly. Each task has a deterministic check. Results are recorded
to memory/eval/results/ for weekly pass/fail tracking.

Usage:
  python scripts/workspace/agent-eval.py           # run all tasks
  python scripts/workspace/agent-eval.py --verbose  # detailed output
  python scripts/workspace/agent-eval.py --history  # show last 12 weeks
"""

import argparse
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from lib import WORKSPACE
RESULTS_DIR = WORKSPACE / "memory" / "eval" / "results"
SESSIONS_INDEX = WORKSPACE / "scripts" / "workspace" / "session-index.py"
VALIDATE_SCRIPT = WORKSPACE / "scripts" / "workspace" / "validate.py"


def check_license() -> tuple[bool, str]:
    license_path = WORKSPACE / "LICENSE"
    if not license_path.is_file():
        return False, "LICENSE file not found"
    text = license_path.read_text()
    if "MIT" in text:
        return True, "LICENSE found with MIT text"
    return False, "LICENSE found but does not contain MIT"


def check_validate_script() -> tuple[bool, str]:
    if not VALIDATE_SCRIPT.is_file():
        return False, f"validate.py not found at {VALIDATE_SCRIPT.relative_to(WORKSPACE)}"
    result = subprocess.run(
        ["python3", str(VALIDATE_SCRIPT), "--quiet"],
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode == 0:
        return True, "validate.py passed"
    errors = result.stderr.strip() or result.stdout.strip()
    return False, f"validate.py failed:\n{errors[:500]}"


def check_session_search() -> tuple[bool, str]:
    if not SESSIONS_INDEX.is_file():
        return False, f"session-index.py not found at {SESSIONS_INDEX.relative_to(WORKSPACE)}"
    result = subprocess.run(
        ["python3", str(SESSIONS_INDEX), "search", "session", "--limit", "1"],
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode == 0 and result.stdout.strip():
        return True, "session search returned results for 'session'"
    detail = result.stderr.strip() or result.stdout.strip() or "no output"
    return False, f"session search failed: {detail[:300]}"


def check_gitattributes() -> tuple[bool, str]:
    path = WORKSPACE / ".gitattributes"
    if not path.is_file():
        return False, ".gitattributes not found"
    return True, ".gitattributes found"


def check_editorconfig() -> tuple[bool, str]:
    path = WORKSPACE / ".editorconfig"
    if not path.is_file():
        return False, ".editorconfig not found"
    return True, ".editorconfig found"


GOLDEN_TASKS: list[dict] = [
    {"name": "license-exists", "description": "LICENSE exists with MIT text", "check": check_license},
    {"name": "validate-passes", "description": "validate.py exits 0", "check": check_validate_script},
    {"name": "session-search-works", "description": "session-index.py returns results", "check": check_session_search},
    {"name": "gitattributes-exists", "description": ".gitattributes exists", "check": check_gitattributes},
    {"name": "editorconfig-exists", "description": ".editorconfig exists", "check": check_editorconfig},
]


def get_week_tag(dt: datetime | None = None) -> str:
    if dt is None:
        dt = datetime.now(timezone.utc)
    iso = dt.isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"


def run_all_tasks(verbose: bool) -> list[dict]:
    results: list[dict] = []
    print("=== Agent Evaluation Harness ===\n")
    for task in GOLDEN_TASKS:
        name = task["name"]
        try:
            passed, detail = task["check"]()
        except Exception as e:
            passed, detail = False, str(e)
        results.append({
            "name": name,
            "description": task["description"],
            "passed": passed,
            "detail": detail,
        })
        icon = "PASS" if passed else "FAIL"
        print(f"  [{icon}] {name}")
        if verbose or not passed:
            print(f"         {detail}")
    return results


def write_results(results: list[dict]) -> Path:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc)
    week = get_week_tag(now)
    passed = sum(1 for r in results if r["passed"])
    total = len(results)

    results_path = RESULTS_DIR / f"{week}.md"
    lines = [
        f"# Agent Eval — {week}",
        "",
        f"**Run at:** {now.strftime('%Y-%m-%dT%H:%M:%SZ')}",
        f"**Score:** {passed}/{total} ({passed / total * 100:.0f}% pass)",
        "",
        "| Task | Status | Detail |",
        "|------|--------|--------|",
    ]
    for r in results:
        status = "PASS" if r["passed"] else "FAIL"
        detail = r["detail"].replace("\n", " ").strip()
        lines.append(f"| {r['name']} | {status} | {detail} |")
    lines.append("")

    results_path.write_text("\n".join(lines) + "\n")
    return results_path


def show_history(weeks: int = 12) -> None:
    if not RESULTS_DIR.is_dir():
        print("No eval history found.")
        return
    files = sorted(RESULTS_DIR.glob("*-W*.md"), reverse=True)[:weeks]
    if not files:
        print("No eval history found.")
        return
    print("=== Eval History (last {} weeks) ===\n".format(len(files)))
    print(f"{'Week':<16} {'Score':<10} {'Trend':<10}")
    print("-" * 36)
    scores: list[tuple[str, float]] = []
    for f in files:
        text = f.read_text()
        m = re.search(r"\*\*Score:\*\* (\d+)/(\d+)", text)
        if m:
            pct = int(m.group(1)) / int(m.group(2)) * 100
            scores.append((f.stem, pct))
    for i, (week, pct) in enumerate(scores):
        trend = "↑" if i > 0 and pct > scores[i - 1][1] else ("↓" if i > 0 and pct < scores[i - 1][1] else "→")
        print(f"{week:<16} {pct:>5.0f}%      {trend:<10}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Agent golden task evaluator.")
    parser.add_argument("--verbose", "-v", action="store_true", help="Detailed output")
    parser.add_argument("--history", action="store_true", help="Show eval history")
    args = parser.parse_args()

    if args.history:
        show_history()
        return 0

    results = run_all_tasks(args.verbose)
    report_path = write_results(results)
    print(f"\nResults: {report_path.relative_to(WORKSPACE)}")

    passed = sum(1 for r in results if r["passed"])
    total = len(results)
    print(f"Score: {passed}/{total} ({passed / total * 100:.0f}% pass)")

    if passed < total:
        failing = [r["name"] for r in results if not r["passed"]]
        print(f"Failed tasks: {', '.join(failing)}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
