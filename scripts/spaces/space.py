#!/usr/bin/env python3
"""Space Injector — load spaces as context blocks for OpenCode sessions.

Assembles INSTRUCTIONS.md + files/REFERENCE.md + files/RESOURCES.md from a space
directory into a single context block, ready to pipe into OpenCode or clipboard.

Usage:
  python scripts/spaces/space.py list                  # list available spaces
  python scripts/spaces/space.py load <name>           # output combined context block
  python scripts/spaces/space.py load <name> --copy    # copy to clipboard (macOS/Linux)
"""
import argparse
import platform
import subprocess
import sys
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent.parent.parent
SPACES_DIR = WORKSPACE / "spaces"


def get_space_names() -> list[str]:
    """Return a list of available space directory names."""
    if not SPACES_DIR.is_dir():
        return []
    return [
        d.name
        for d in sorted(SPACES_DIR.iterdir())
        if d.is_dir() and not d.name.startswith("_") and (d / "INSTRUCTIONS.md").is_file()
    ]


def list_spaces() -> None:
    spaces = get_space_names()
    if not spaces:
        print("No spaces found.", file=sys.stderr)
        return
    for s in spaces:
        print(f"  {s}")


def load_space(name: str) -> str | None:
    """Load and assemble a space's context block. Returns None if not found."""
    space_dir = SPACES_DIR / name
    if not space_dir.is_dir():
        return None

    instructions_md = space_dir / "INSTRUCTIONS.md"
    if not instructions_md.is_file():
        return None

    blocks: list[str] = []

    blocks.append(instructions_md.read_text())

    files_dir = space_dir / "files"
    if files_dir.is_dir():
        reference_md = files_dir / "REFERENCE.md"
        if reference_md.is_file():
            blocks.append(f"\n<!-- reference -->\n\n{reference_md.read_text()}")

        resources_md = files_dir / "RESOURCES.md"
        if resources_md.is_file():
            blocks.append(f"\n<!-- resources -->\n\n{resources_md.read_text()}")

    result = "".join(blocks)
    if not result.endswith("\n"):
        result += "\n"
    return result


def copy_to_clipboard(text: str) -> None:
    system = platform.system()
    try:
        if system == "Darwin":
            proc = subprocess.run(["pbcopy"], input=text.encode(), check=True)
        elif system == "Linux":
            proc = subprocess.run(
                ["xclip", "-selection", "clipboard"], input=text.encode(), check=True
            )
        else:
            print(f"Clipboard not supported on {system}", file=sys.stderr)
            sys.exit(1)
    except FileNotFoundError as e:
        print(f"Clipboard command not found: {e.filename}", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Load spaces as context blocks for OpenCode.")
    parser.add_argument("command", choices=["list", "load"], help="Command to run")
    parser.add_argument("name", nargs="?", help="Space name (required for 'load')")
    parser.add_argument("--copy", action="store_true", help="Copy output to clipboard")
    args = parser.parse_args()

    if args.command == "list":
        spaces = get_space_names()
        if not spaces:
            print("No spaces found.", file=sys.stderr)
            sys.exit(1)
        for s in spaces:
            print(f"  {s}")
    elif args.command == "load":
        if not args.name:
            print("Usage: space.py load <name>", file=sys.stderr)
            sys.exit(1)
        output = load_space(args.name)
        if output is None:
            print(
                f"Space '{args.name}' not found. Available spaces:",
                file=sys.stderr,
            )
            list_spaces()
            sys.exit(1)
        if args.copy:
            copy_to_clipboard(output)
            print(f"Copied space '{args.name}' to clipboard ({len(output)} chars)")
        else:
            print(output, end="")


if __name__ == "__main__":
    main()
