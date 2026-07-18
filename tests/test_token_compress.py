"""Tests for scripts/workspace/token-compress.py."""

from test_helpers import load_module


class TestStripAnsi:
    def test_removes_ansi_codes(self, scripts_dir):
        tc = load_module("token_compress", scripts_dir / "token-compress.py")
        result = tc.strip_ansi("\x1b[31mred\x1b[0m")
        assert result == "red"

    def test_passes_plain_text(self, scripts_dir):
        tc = load_module("token_compress", scripts_dir / "token-compress.py")
        result = tc.strip_ansi("hello world")
        assert result == "hello world"


class TestFoldWhitespace:
    def test_collapses_excessive_blank_lines(self, scripts_dir):
        tc = load_module("token_compress", scripts_dir / "token-compress.py")
        lines = ["a", "", "", "", "", "b"]
        result = tc.fold_whitespace(lines)
        assert result == ["a", "", "", "b"]

    def test_keeps_up_to_two_blanks(self, scripts_dir):
        tc = load_module("token_compress", scripts_dir / "token-compress.py")
        lines = ["a", "", "b"]
        result = tc.fold_whitespace(lines)
        assert result == ["a", "", "b"]


class TestDedupConsecutive:
    def test_dedup_many_repeats(self, scripts_dir):
        tc = load_module("token_compress", scripts_dir / "token-compress.py")
        lines = ["a\n", "b\n", "b\n", "b\n", "b\n", "c\n"]
        result = tc.dedup_consecutive(lines)
        assert result == ["a\n", "b (x4)\n", "c\n"]

    def test_two_repeats_kept(self, scripts_dir):
        tc = load_module("token_compress", scripts_dir / "token-compress.py")
        lines = ["a\n", "b\n", "b\n"]
        result = tc.dedup_consecutive(lines)
        assert result == ["a\n", "b\n", "b\n"]

    def test_blank_lines_dedup(self, scripts_dir):
        tc = load_module("token_compress", scripts_dir / "token-compress.py")
        lines = ["a\n", "\n", "\n", "\n", "b\n"]
        result = tc.dedup_consecutive(lines)
        assert "(blank line x3)" in "".join(result)


class TestCompressPaths:
    def test_long_path_compressed(self, scripts_dir):
        tc = load_module("token_compress", scripts_dir / "token-compress.py")
        result = tc.compress_paths("/home/user/projects/openbench/scripts/test.py")
        assert ".../" in result

    def test_short_path_unchanged(self, scripts_dir):
        tc = load_module("token_compress", scripts_dir / "token-compress.py")
        result = tc.compress_paths("/usr/bin/python3")
        assert result == "/usr/bin/python3"


class TestCollapseHex:
    def test_long_hex_truncated(self, scripts_dir):
        tc = load_module("token_compress", scripts_dir / "token-compress.py")
        result = tc.collapse_hex("value = 0xdeadbeefcafebabe12345678")
        assert "0xdeadbeef..." in result

    def test_long_hash_truncated(self, scripts_dir):
        tc = load_module("token_compress", scripts_dir / "token-compress.py")
        result = tc.collapse_hex("commit abcdef0123456789abcdef0123456789")
        assert "abcdef01..." in result


class TestTruncateTraces:
    def test_truncates_long_traceback(self, scripts_dir):
        tc = load_module("token_compress", scripts_dir / "token-compress.py")
        lines = [
            "Traceback (most recent call last):\n",
            "  File \"test.py\", line 10, in foo\n",
            "  File \"test.py\", line 11, in bar\n",
            "  File \"test.py\", line 12, in baz\n",
            "  File \"test.py\", line 13, in qux\n",
            "  File \"test.py\", line 14, in quux\n",
            "  File \"test.py\", line 15, in corge\n",
            "  File \"test.py\", line 16, in grault\n",
            "ValueError: something broke\n",
        ]
        result = tc.truncate_traces(lines)
        output = "".join(result)
        assert "frames omitted" in output


class TestShortenRepeatedPattern:
    def test_shortens_repeated_lines(self, scripts_dir):
        tc = load_module("token_compress", scripts_dir / "token-compress.py")
        lines = [
            "INFO: processing [item-1] start\n",
            "INFO: processing [item-1] starting\n",
            "INFO: processing [item-1] beginning\n",
            "INFO: processing [item-1] commencing\n",
            "INFO: processing [item-1] initiating\n",
            "INFO: processing [item-1] kicking off\n",
            "INFO: processing [item-1] getting going\n",
        ]
        result = tc.shorten_repeated_pattern(lines)
        output = "".join(result)
        assert "similar lines omitted" in output


class TestCompress:
    def test_full_pipeline(self, scripts_dir):
        tc = load_module("token_compress", scripts_dir / "token-compress.py")
        text = "normal line\n\x1b[31mred\x1b[0m\n\n\n\n\nrepeated\nrepeated\nrepeated\nrepeated\nrepeated\n"
        result = tc.compress(text)
        assert "\x1b" not in result

    def test_empty_text(self, scripts_dir):
        tc = load_module("token_compress", scripts_dir / "token-compress.py")
        assert tc.compress("") == ""

    def test_plain_text_passes(self, scripts_dir):
        tc = load_module("token_compress", scripts_dir / "token-compress.py")
        text = "hello\nworld\n"
        assert tc.compress(text) == text
