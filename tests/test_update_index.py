"""Tests for scripts/workspace/update-index.py."""

import pytest
from test_helpers import load_module


@pytest.fixture
def ui(scripts_dir):
    return load_module("update_index", scripts_dir / "update-index.py")


class TestExtractSection:
    def test_extracts_section_by_heading(self, ui):
        content = "## Active projects\n- project A\n- project B\n\n## Open threads\n- thread 1"
        result = ui.extract_section(content, "Active projects")
        assert "project A" in result
        assert "thread 1" not in result

    def test_returns_empty_for_missing(self, ui):
        assert ui.extract_section("# No matches", "Missing") == ""

    def test_prefix_match(self, ui):
        content = "## Recent decisions (2026-06-15)\n- decision 1"
        result = ui.extract_section(content, "Recent decisions", prefix_match=True)
        assert "decision 1" in result


class TestExtractAllDatedSections:
    def test_finds_multiple_dated_sections(self, ui):
        content = """## Recent decisions (2026-06-15)
- dec 1

## Recent decisions (2026-06-14)
- dec 2"""
        results = ui.extract_all_dated_sections(content, "Recent decisions")
        assert len(results) == 2

    def test_returns_empty_for_no_matches(self, ui):
        assert ui.extract_all_dated_sections("# Nothing", "Missing") == []


class TestExtractDecisionsFromSessions:
    def test_extracts_from_session_files(self, ui, tmp_path):
        session_file = tmp_path / "2026-06-15-test.md"
        session_file.write_text("## Decisions\n- decision 1\n- decision 2")
        decisions = ui.extract_decisions_from_sessions([session_file])
        assert "2026-06-15" in decisions
        assert len(decisions["2026-06-15"]) >= 2


class TestIsKnownHeading:
    def test_known_headings(self, ui):
        for section in ui.KNOWN_SECTIONS:
            assert ui._is_known_heading(section)

    def test_unknown_heading(self, ui):
        assert not ui._is_known_heading("Random heading")

    def test_dated_known_heading(self, ui):
        assert ui._is_known_heading("Recent decisions (2026-06-15)")
