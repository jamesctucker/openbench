#!/usr/bin/env python3
"""Session frontmatter helper — validate and query session YAML frontmatter.

Reads session files from memory/sessions/, parses optional YAML frontmatter,
validates against the schema at memory/.sessions-schema.yaml, and supports
query-by-field for downstream tooling (yq/jq integration).

Usage:
  python scripts/workspace/session-frontmatter.py --validate    validate all sessions
  python scripts/workspace/session-frontmatter.py --list        list sessions with frontmatter
  python scripts/workspace/session-frontmatter.py --tag NAME    list sessions tagged NAME
  python scripts/workspace/session-frontmatter.py --project P   list sessions linked to project P
  python scripts/workspace/session-frontmatter.py --topic T     list sessions covering topic T
  python scripts/workspace/session-frontmatter.py --entity E    list sessions mentioning entity E
  python scripts/workspace/session-frontmatter.py --json        output as JSON (combine with --tag etc.)
"""

import argparse
import json
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("Error: pyyaml is required. Install with: pip install -r scripts/workspace/requirements.txt", file=sys.stderr)
    sys.exit(1)

from lib import WORKSPACE, parse
SESSIONS_DIR = WORKSPACE / "memory" / "sessions"
SCHEMA_PATH = WORKSPACE / "memory" / ".sessions-schema.yaml"

SESSION_FILE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$")


def load_schema() -> dict:
    if not SCHEMA_PATH.is_file():
        return {}
    try:
        return yaml.safe_load(SCHEMA_PATH.read_text()) or {}
    except yaml.YAMLError:
        return {}


def collect_sessions() -> list[dict]:
    results = []
    if not SESSIONS_DIR.is_dir():
        return results

    for f in sorted(SESSIONS_DIR.iterdir()):
        if not f.is_file() or f.suffix != ".md":
            continue
        if not SESSION_FILE_RE.match(f.name):
            continue

        content = f.read_text()
        fm, _body = parse(content)
        results.append({
            "file": str(f.relative_to(WORKSPACE)),
            "name": f.name,
            "frontmatter": fm,
            "has_frontmatter": fm is not None,
        })

    return results


# JSON Schema → Python type mapping
_SCHEMA_TYPE_MAP = {
    "string": str,
    "integer": int,
    "number": (int, float),
    "boolean": bool,
    "array": list,
    "object": dict,
}


def validate_field_type(value, schema_prop: dict, path: str, errors: list[str]):
    if schema_prop.get("type") == "array":
        if not isinstance(value, list):
            errors.append(f"{path}: expected array, got {type(value).__name__}")
            return
        item_schema = schema_prop.get("items", {})
        item_type = item_schema.get("type")
        item_pattern = item_schema.get("pattern")
        for i, item in enumerate(value):
            expected_type = _SCHEMA_TYPE_MAP.get(item_type)
            if expected_type and not isinstance(item, expected_type):
                errors.append(f"{path}[{i}]: expected {item_type}, got {type(item).__name__}")
            if item_pattern and isinstance(item, str) and not re.match(item_pattern, item):
                errors.append(f"{path}[{i}]: does not match pattern /{item_pattern}/")


def validate_session(session: dict, schema: dict) -> list[str]:
    errors = []
    rel = session["file"]
    fm = session["frontmatter"]

    if not session["has_frontmatter"]:
        return []

    schema_props = schema.get("properties", {})
    for field, value in fm.items():
        if field not in schema_props:
            errors.append(f"{rel}: unknown field '{field}'")
            continue
        validate_field_type(value, schema_props[field], f"{rel}.{field}", errors)

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Session frontmatter helper — validate and query")
    parser.add_argument("--validate", action="store_true", help="Validate all session frontmatter against schema")
    parser.add_argument("--list", action="store_true", help="List sessions and their frontmatter")
    parser.add_argument("--tag", metavar="NAME", help="Filter by tag")
    parser.add_argument("--project", metavar="NAME", help="Filter by linked project")
    parser.add_argument("--topic", metavar="NAME", help="Filter by topic")
    parser.add_argument("--entity", metavar="NAME", help="Filter by entity")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    schema = load_schema()
    sessions = collect_sessions()

    if not sessions:
        print("No session files found.", file=sys.stderr)
        return 1

    if args.validate:
        if not schema:
            print("Warning: schema not found at memory/.sessions-schema.yaml; skipping validation.", file=sys.stderr)
            return 0

        all_errors = []
        validated_count = 0
        for s in sessions:
            if s["has_frontmatter"]:
                validated_count += 1
                errors = validate_session(s, schema)
                all_errors.extend(errors)

        print(f"Checked {len(sessions)} session file(s) ({validated_count} with frontmatter).")

        if all_errors:
            for e in all_errors:
                print(f"  ERROR: {e}", file=sys.stderr)
            print(f"\n{len(all_errors)} validation error(s).", file=sys.stderr)
            return 1

        print("All frontmatter valid.")
        return 0

    if args.tag:
        sessions = [s for s in sessions if s["has_frontmatter"] and args.tag in (s["frontmatter"].get("tags") or [])]
    if args.project:
        sessions = [s for s in sessions if s["has_frontmatter"] and args.project in (s["frontmatter"].get("linked_projects") or [])]
    if args.topic:
        sessions = [s for s in sessions if s["has_frontmatter"] and any(args.topic.lower() in (t or "").lower() for t in (s["frontmatter"].get("topics") or []))]
    if args.entity:
        sessions = [s for s in sessions if s["has_frontmatter"] and any(args.entity.lower() in (e or "").lower() for e in (s["frontmatter"].get("entities") or []))]

    if args.json or args.list or args.tag or args.project or args.topic or args.entity:
        output = []
        for s in sessions:
            entry = {"file": s["file"], "name": s["name"]}
            if s["has_frontmatter"]:
                entry["frontmatter"] = s["frontmatter"]
            output.append(entry)

        if args.json:
            print(json.dumps(output, indent=2))
        else:
            for s in output:
                fm_str = ""
                if s.get("frontmatter"):
                    fm_str = json.dumps(s["frontmatter"], ensure_ascii=False)
                print(f"  {s['file']}  {fm_str}")
        return 0

    parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
