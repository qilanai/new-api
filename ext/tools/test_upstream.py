"""Exercise the CLI against real disposable Git histories."""

import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


TOOL = Path(__file__).with_name("upstream.py").resolve()
RULES = ".agents/rules/fork.md"
DOCUMENT = """# Fork rules
## 11. 触碰上游文件清单
| 文件 | 改动摘要 | 原因 | 引入提交 | 退出条件 |
| --- | --- | --- | --- | --- |
| `core.txt` | Custom behavior | Business need | fixture | Keep |
| `assets/brand/` | Brand assets | Business need | fixture | Keep |
| `web/src/i18n/locales/*.json` | Translations | Business need | fixture | Keep |
## 12. Pending
"""


class UpstreamTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="fork-tool-test-")
        self.addCleanup(self.temporary.cleanup)
        self.repo = Path(self.temporary.name)
        self.env = {
            **os.environ,
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": os.devnull,
            "GIT_AUTHOR_NAME": "Fixture",
            "GIT_AUTHOR_EMAIL": "fixture@localhost",
            "GIT_COMMITTER_NAME": "Fixture",
            "GIT_COMMITTER_EMAIL": "fixture@localhost",
            "PYTHONDONTWRITEBYTECODE": "1",
        }
        self.git("init", "-b", "main")
        self.write("core.txt", "one\ntwo\nthree\nfour\nfive\nsix\nseven\neight\n")
        self.write("other.txt", "original\n")
        self.commit("upstream base")
        self.git("branch", "upstream")
        self.git("checkout", "-b", "develop")
        self.write(RULES, DOCUMENT)
        self.commit("fork inventory")

    def git(self, *args):
        return subprocess.run(
            ["git", *args], cwd=self.repo, env=self.env,
            text=True, capture_output=True, check=True,
        ).stdout

    def write(self, path, text):
        target = self.repo / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8")

    def commit(self, message):
        self.git("add", "-A")
        self.git("commit", "-m", message)

    def run_cli(self, *args):
        return subprocess.run(
            [sys.executable, "-B", str(TOOL), *args, "--upstream", "upstream"],
            cwd=self.repo, env=self.env, text=True, capture_output=True,
        )

    def stub_verification(self, exit_code):
        # Stub the external toolchain boundary; the Git history and merge are real.
        commands = self.repo / ".git/test-bin"
        commands.mkdir()
        self.verify_cwd = self.repo / ".git/verification-cwd"
        self.verify_content = self.repo / ".git/verification-content"
        shell = commands / "bash"
        shell.write_text(
            '#!/bin/sh\npwd > "$FORK_VERIFY_CWD"\n'
            'cat core.txt > "$FORK_VERIFY_CONTENT"\n'
            f'exit {exit_code}\n'
        )
        shell.chmod(0o755)
        self.env.update(
            PATH=str(commands) + os.pathsep + self.env["PATH"],
            FORK_VERIFY_CWD=str(self.verify_cwd),
            FORK_VERIFY_CONTENT=str(self.verify_content),
        )

    def test_inventory_accepts_registered_and_extension_paths(self):
        for path in (
            "core.txt", "assets/brand/logo.svg", "web/src/i18n/locales/en.json",
            "ext/service/report.go", "web/src/features/ext-report/index.tsx",
            "web/src/routes/_authenticated/ext/report/index.tsx",
        ):
            self.write(path, "fork content\n")
        self.commit("custom features")
        # An unmerged upstream-only path must not be classified as a fork edit.
        self.git("checkout", "upstream")
        self.write("upstream-only.txt", "new upstream feature\n")
        self.commit("upstream feature")
        self.git("checkout", "develop")
        result = self.run_cli("check")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("Existing upstream files changed: 1", result.stdout)
        self.assertNotIn("upstream-only.txt", result.stdout)

    def test_working_tree_includes_untracked_staged_and_unstaged_changes(self):
        self.write("unstaged.txt", "new\n")
        self.write("staged.txt", "new\n")
        self.git("add", "staged.txt")
        self.write("other.txt", "changed\n")
        self.assertEqual(self.run_cli("check").returncode, 0)
        result = self.run_cli("check", "--working-tree")
        self.assertEqual(result.returncode, 1, result.stdout)
        for path in ("unstaged.txt", "staged.txt", "other.txt"):
            self.assertIn(f"UNREGISTERED: {path}", result.stdout)

    def test_deleting_an_unregistered_upstream_file_fails(self):
        self.git("rm", "other.txt")
        self.commit("delete upstream file")
        result = self.run_cli("check")
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn("UNREGISTERED: other.txt", result.stdout)

    def test_working_tree_uses_updated_inventory_with_aligned_columns(self):
        self.write("other.txt", "registered customization\n")
        updated = DOCUMENT.replace(
            "## 12. Pending",
            "| `other.txt`    | Change | Reason | fixture | Keep |\n## 12. Pending",
        )
        self.write(RULES, updated)
        result = self.run_cli("check", "--working-tree")
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertIn("Registered: other.txt", result.stdout)

    def test_renaming_into_extension_still_reports_old_upstream_path(self):
        (self.repo / "ext").mkdir()
        self.git("mv", "other.txt", "ext/other.txt")
        self.commit("move upstream file")
        result = self.run_cli("check")
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn("UNREGISTERED: other.txt", result.stdout)

    def test_missing_inventory_fails_closed(self):
        self.write(RULES, "# No inventory\n")
        result = self.run_cli("check", "--working-tree")
        self.assertEqual(result.returncode, 2, result.stdout)
        self.assertIn("Missing section 11", result.stdout)

    def test_trial_merges_both_sides_without_touching_current_work(self):
        content = (self.repo / "core.txt").read_text()
        self.write("core.txt", content.replace("one\n", "fork\n"))
        self.commit("fork customization")
        self.git("checkout", "upstream")
        self.write("core.txt", content.replace("eight\n", "upstream\n"))
        self.write("upstream-only.txt", "new feature\n")
        self.commit("upstream customization")
        self.git("checkout", "develop")
        self.write("core.txt", "uncommitted user work\n")
        self.write("staged.txt", "staged user work\n")
        self.git("add", "staged.txt")
        self.write("untracked.txt", "untracked user work\n")
        self.stub_verification(0)
        hook = self.repo / ".git/hooks/post-checkout"
        self.env["FORK_HOOK_MARKER"] = str(self.repo / ".git/hook-ran")
        hook.write_text('#!/bin/sh\ntouch "$FORK_HOOK_MARKER"\n')
        hook.chmod(0o755)
        before = {args: self.git(*args) for args in (
            ("status", "--porcelain"), ("diff",), ("diff", "--cached"),
            ("for-each-ref",), ("worktree", "list", "--porcelain"),
        )}
        result = self.run_cli("trial", "--verify")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("## Files changed by both sides\n\n- core.txt", result.stdout)
        self.assertIn("Quality checks: passed", result.stdout)
        self.assertEqual(
            self.verify_content.read_text(),
            content.replace("one\n", "fork\n").replace("eight\n", "upstream\n"),
        )
        self.assertNotIn("UNREGISTERED: upstream-only.txt", result.stdout)
        for args, output in before.items():
            self.assertEqual(self.git(*args), output)
        self.assertFalse(Path(self.env["FORK_HOOK_MARKER"]).exists())
        self.assertEqual((self.repo / "untracked.txt").read_text(), "untracked user work\n")

    def test_trial_conflicts_fail_and_cleanup_worktree(self):
        self.write("core.txt", "fork version\n")
        self.commit("fork change")
        self.git("checkout", "upstream")
        self.write("core.txt", "upstream version\n")
        self.commit("upstream change")
        self.git("checkout", "develop")
        before = self.git("worktree", "list", "--porcelain")
        result = self.run_cli("trial")
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn("Conflict: core.txt", result.stdout)
        self.assertIn("verification was not run", result.stdout)
        self.assertEqual(self.git("worktree", "list", "--porcelain"), before)
        self.assertEqual(self.git("status", "--porcelain"), "")

    def test_trial_rejects_unregistered_changes_and_writes_report(self):
        self.write("other.txt", "fork change\n")
        self.commit("unregistered change")
        report = self.repo / ".git/report.md"
        result = self.run_cli("trial", "--report", str(report))
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn("UNREGISTERED: other.txt", report.read_text())
        self.assertIn("Result: FAILED", report.read_text())
        self.assertIn("Builds and tests were not run", report.read_text())

    def test_verification_failure_is_reported_and_worktree_is_removed(self):
        self.stub_verification(17)
        before = self.git("worktree", "list", "--porcelain")
        result = self.run_cli("trial", "--verify")
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn("Quality checks: FAILED", result.stdout)
        self.assertNotEqual(Path(self.verify_cwd.read_text().strip()), self.repo)
        self.assertFalse(Path(self.verify_cwd.read_text().strip()).exists())
        self.assertEqual(self.git("worktree", "list", "--porcelain"), before)

    def test_invalid_revision_fails_without_creating_a_worktree(self):
        before = self.git("worktree", "list", "--porcelain")
        result = self.run_cli("trial", "--head=--not-a-revision")
        self.assertEqual(result.returncode, 2, result.stdout)
        self.assertIn("ERROR:", result.stdout)
        self.assertEqual(self.git("worktree", "list", "--porcelain"), before)

    def test_quality_checks_continue_after_one_module_fails(self):
        commands = self.repo / ".git/toolchain"
        commands.mkdir()
        log = self.repo / ".git/toolchain.log"
        go = commands / "go"
        go.write_text(
            '#!/bin/sh\nprintf "%s\\n" "$*" >> "$FORK_COMMAND_LOG"\n'
            'case "$*" in "-C . test ./...") exit 7 ;; esac\n'
        )
        go.chmod(0o755)
        gofmt = commands / "gofmt"
        gofmt.write_text("#!/bin/sh\nexit 0\n")
        gofmt.chmod(0o755)
        self.env.update(
            PATH=str(commands) + os.pathsep + self.env["PATH"],
            FORK_COMMAND_LOG=str(log),
        )
        result = subprocess.run(
            ["bash", str(TOOL.with_name("verify.sh")), "backend"],
            cwd=self.repo, env=self.env, text=True, capture_output=True,
        )
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("FAIL: Go tests (.)", result.stderr)
        self.assertIn("PASS: Go tests (relaykit)", result.stdout)
        self.assertIn("PASS: Go tests (tokenkit)", result.stdout)
        self.assertIn("-C relaykit test ./...", log.read_text())
        self.assertIn("-C tokenkit test ./...", log.read_text())


if __name__ == "__main__":
    unittest.main()
