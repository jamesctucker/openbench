"""Workspace utilities — single import surface for all scripts.

Every consumer imports from lib only:

    from lib import WORKSPACE, parse, extract_wikilinks

Underlying implementations live in frontmatter and vault.
"""

from frontmatter import (
    ParseError,
    ParseErrorKind,
    ParseResult,
    parse,
    parse_detailed,
)
from vault import (
    VAULT,
    VAULT_DIRS,
    WORKSPACE,
    BrokenLink,
    WikilinkIndex,
    check_wikilinks,
    extract_wikilinks,
    walk_markdown,
)

__all__ = [
    "BrokenLink",
    "ParseError",
    "ParseErrorKind",
    "ParseResult",
    "VAULT",
    "VAULT_DIRS",
    "WikilinkIndex",
    "WORKSPACE",
    "check_wikilinks",
    "extract_wikilinks",
    "parse",
    "parse_detailed",
    "walk_markdown",
]
