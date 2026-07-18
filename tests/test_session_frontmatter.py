"""Tests for scripts/workspace/session-frontmatter.py."""

import pytest
from test_helpers import load_module


@pytest.fixture
def sfm(scripts_dir):
    return load_module("session_frontmatter", scripts_dir / "session-frontmatter.py")


class TestLoadSchema:
    def test_missing_schema(self, sfm, tmp_path):
        sfm.SCHEMA_PATH = tmp_path / "nonexistent.yaml"
        assert sfm.load_schema() == {}

    def test_invalid_yaml(self, sfm, tmp_path):
        schema_path = tmp_path / ".sessions-schema.yaml"
        schema_path.write_text(": not valid yaml")
        sfm.SCHEMA_PATH = schema_path
        assert sfm.load_schema() == {}


class TestCollectSessions:
    def test_no_sessions_dir(self, sfm, tmp_path):
        sfm.SESSIONS_DIR = tmp_path / "nonexistent"
        assert sfm.collect_sessions() == []

    def test_skips_non_matching_files(self, sfm, tmp_path):
        sessions_dir = tmp_path / "memory" / "sessions"
        sessions_dir.mkdir(parents=True)
        (sessions_dir / "random-file.md").write_text("# Random")
        sfm.SESSIONS_DIR = sessions_dir
        assert sfm.collect_sessions() == []

    def test_collects_session_with_frontmatter(self, sfm, tmp_path):
        sessions_dir = tmp_path / "memory" / "sessions"
        sessions_dir.mkdir(parents=True)
        sf = sessions_dir / "2026-06-15-test-session.md"
        sf.write_text("""---
tags: [test]
---
# 2026-06-15: Test Session
Body""")
        sfm.SESSIONS_DIR = sessions_dir
        sfm.WORKSPACE = tmp_path
        results = sfm.collect_sessions()
        assert len(results) == 1
        assert results[0]["has_frontmatter"]


class TestValidateFieldType:
    def test_validates_array_items(self, sfm):
        errors = []
        schema_prop = {"type": "array", "items": {"type": "string"}}
        sfm.validate_field_type(["a", "b"], schema_prop, "test", errors)
        assert len(errors) == 0

    def test_rejects_non_array(self, sfm):
        errors = []
        schema_prop = {"type": "array", "items": {"type": "string"}}
        sfm.validate_field_type("not-a-list", schema_prop, "test", errors)
        assert len(errors) == 1


class TestValidateSession:
    def test_no_frontmatter_skips(self, sfm):
        session = {"file": "test.md", "has_frontmatter": False, "frontmatter": None}
        assert sfm.validate_session(session, {}) == []

    def test_unknown_field(self, sfm):
        session = {"file": "test.md", "has_frontmatter": True, "frontmatter": {"unknown_field": "val"}}
        schema = {"properties": {"known": {"type": "string"}}}
        errors = sfm.validate_session(session, schema)
        assert len(errors) == 1
        assert "unknown" in errors[0].lower()
