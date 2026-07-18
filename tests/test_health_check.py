"""Tests for scripts/workspace/health-check.py."""

import pytest
from test_helpers import load_module


@pytest.fixture
def hc(scripts_dir):
    return load_module("health_check", scripts_dir / "health-check.py")


class TestRun:
    def test_successful_command(self, hc):
        rc, stdout, stderr = hc.run(["echo", "hello"])
        assert rc == 0
        assert stdout == "hello"

    def test_failing_command(self, hc):
        rc, stdout, stderr = hc.run(["false"])
        assert rc != 0

    def test_missing_command(self, hc):
        rc, stdout, stderr = hc.run(["this-command-does-not-exist-12345"])
        assert rc != 0
        assert "not found" in stderr.lower() or rc == 127


class TestCheckGit:
    def test_git_found(self, hc):
        result = hc.check_git()
        assert result["tool"] == "git"
        assert result["status"] == "ok"


class TestCheckPython:
    def test_python_found(self, hc):
        result = hc.check_python()
        assert result["tool"] == "python"
        assert result["status"] == "ok"
        assert "version" in result["details"]


class TestCheckNode:
    def test_node_found(self, hc):
        result = hc.check_node()
        assert result["tool"] == "node"


class TestCheckMcpServers:
    def test_no_config(self, hc, tmp_path):
        hc.OPECODE_CONFIG = tmp_path / "nonexistent.json"
        results = hc.check_mcp_servers()
        assert len(results) == 1
        assert results[0]["status"] == "error"

    def test_invalid_config(self, hc, tmp_path):
        config_path = tmp_path / "opencode.json"
        config_path.write_text("not json")
        hc.OPECODE_CONFIG = config_path
        results = hc.check_mcp_servers()
        assert results[0]["status"] == "error"


class TestWriteReport:
    def test_writes_report(self, hc, tmp_path):
        hc.STAGING_DIR = tmp_path
        checks = [
            {"tool": "git", "status": "ok", "details": {"version": "2.40"}},
            {"tool": "python", "status": "warn", "details": {"warning": "old"}},
        ]
        report_path = hc.write_report(checks, quick=True)
        assert report_path.exists()
        content = report_path.read_text()
        assert "Health Check" in content
        assert "git" in content
        assert "ok" in content
        assert "warn" in content
