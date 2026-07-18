"""Tests for scripts/workspace/lib.py and scripts/workspace/frontmatter.py."""

from frontmatter import parse, parse_detailed
from test_helpers import load_module


class TestParseFrontmatter:
    """Tests the consolidated frontmatter module (scripts/workspace/frontmatter.py)."""

    def test_valid_frontmatter(self):
        content = """---
name: test
value: 42
---
Body here."""
        fm, body = parse(content)
        assert fm == {"name": "test", "value": 42}
        assert body.strip() == "Body here."

    def test_missing_frontmatter(self):
        content = "# No frontmatter\nBody here."
        fm, body = parse(content)
        assert fm is None
        assert body == content

        result = parse_detailed(content)
        assert result.frontmatter is None
        assert result.error is None  # absence is not an error

    def test_malformed_frontmatter(self):
        content = "---\nname: test\n"
        fm, body = parse(content)
        assert fm is None  # common case: returns None
        assert body == content  # entire content is body

        result = parse_detailed(content)
        assert result.error is not None
        assert "MALFORMED" in result.error.kind.name

    def test_invalid_yaml(self):
        content = "---\n: invalid yaml\n---\nBody"
        fm, body = parse(content)
        assert fm is None
        assert body.strip() == "Body"

        result = parse_detailed(content)
        assert result.error is not None
        assert result.error.kind.name == "INVALID_YAML"

    def test_not_a_mapping(self):
        content = "---\n[list, not, dict]\n---\nBody"
        fm, body = parse(content)
        assert fm is None
        assert body.strip() == "Body"

        result = parse_detailed(content)
        assert result.error is not None
        assert result.error.kind.name == "NOT_A_MAPPING"

    def test_empty_frontmatter(self):
        content = "---\n{}\n---\nBody"
        fm, body = parse(content)
        assert fm == {}
        assert body.strip() == "Body"

    def test_strips_surrounding_whitespace(self):
        content = "---\ntags: [a, b]\n---\n\n# Session\n\nBody"
        fm, _body = parse(content)
        assert fm == {"tags": ["a", "b"]}


class TestWorkspace:
    def test_workspace_path_exists(self, scripts_dir):
        lib = load_module("lib", scripts_dir / "lib.py")
        assert lib.WORKSPACE.exists()
        assert (lib.WORKSPACE / "scripts" / "workspace").is_dir()

    def test_workspace_is_absolute(self, scripts_dir):
        lib = load_module("lib", scripts_dir / "lib.py")
        assert lib.WORKSPACE.is_absolute()
