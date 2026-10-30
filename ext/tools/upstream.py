#!/usr/bin/env python3
"""Audit fork changes and trial an upstream merge without changing any branch."""

import argparse
import fnmatch
from pathlib import Path
import re
import subprocess
import sys
import tempfile


RULES = ".agents/rules/fork.md"


def git(repo, *args, check=True):
    result = subprocess.run(
        ["git", "-C", str(repo), *args], capture_output=True, text=True
    )
    if check and result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result


def resolve_commit(repo, ref):
    return git(
        repo, "rev-parse", "--verify", "--end-of-options", f"{ref}^{{commit}}"
    ).stdout.strip()


def changed_paths(repo, base, head=None):
    revisions = [base] if head is None else [base, head]
    output = git(
        repo, "diff", "--no-renames", "--name-only", "-z", *revisions, "--"
    ).stdout
    paths = set(filter(None, output.split("\0")))
    if head is None:
        untracked = git(repo, "ls-files", "--others", "--exclude-standard", "-z")
        paths.update(filter(None, untracked.stdout.split("\0")))
    return paths


def is_extension(path):
    return (
        path == RULES
        or path.startswith("ext/")
        or path.startswith("web/src/routes/_authenticated/ext/")
        or re.match(r"^web/src/features/ext-[^/]+/", path) is not None
    )


def inventory(repo, base, head, report):
    document = (
        (repo / RULES).read_text(encoding="utf-8")
        if head is None
        else git(repo, "show", f"{head}:{RULES}").stdout
    )
    section = re.search(r"^## 11\.[^\n]*\n(.*?)(?=^## |\Z)", document, re.M | re.S)
    if not section:
        raise RuntimeError(f"Missing section 11 inventory in {RULES}")
    registered = re.findall(r"^\|\s*`([^`]+)`\s*\|", section.group(1), re.M)
    if not registered:
        raise RuntimeError(f"No registered paths in {RULES} section 11")

    paths = sorted(
        path for path in changed_paths(repo, base, head) if not is_extension(path)
    )
    tree = git(repo, "ls-tree", "-r", "--name-only", "-z", base)
    upstream_paths = set(tree.stdout.split("\0"))
    matched = set()
    missing = []
    modified = len(set(paths) & upstream_paths)
    report.append(
        f"Existing upstream files changed: {modified}; "
        f"new files outside extensions: {len(paths) - modified}."
    )
    report.append("")
    for path in paths:
        matches = [
            pattern for pattern in registered
            if fnmatch.fnmatchcase(
                path, pattern + "*" if pattern.endswith("/") else pattern
            )
        ]
        matched.update(matches)
        if not matches:
            missing.append(path)
        report.append(f"- {'Registered' if matches else 'UNREGISTERED'}: {path}")
    if not paths:
        report.append("No changes outside the extension directories.")
    stale = sorted(set(registered) - matched)
    if stale:
        report.extend(["", "Review unused inventory entries: " + ", ".join(stale)])
    if modified > 15:
        report.extend(["", "Maintenance debt exceeds 15 upstream files; prioritize reducing it next iteration."])
    report.append("")
    return not missing


def trial(repo, head, upstream, verify, report):
    base = git(repo, "merge-base", head, upstream).stdout.strip()
    overlap = sorted(changed_paths(repo, base, head) & changed_paths(repo, base, upstream))
    report.extend(["## Files changed by both sides", "", *[f"- {path}" for path in overlap]])
    if not overlap:
        report.append("None.")
    report.extend(["", "## Inventory before merge", ""])
    inventory(repo, base, head, report)

    # Suppress local hooks and rerere writes in this disposable trial only.
    options = ["-c", "core.hooksPath=/dev/null", "-c", "rerere.enabled=false"]
    with tempfile.TemporaryDirectory(prefix="new-api-upstream-") as temporary:
        checkout = Path(temporary) / "checkout"
        git(repo, *options, "worktree", "add", "--detach", str(checkout), head)
        try:
            result = git(
                checkout, *options,
                "-c", "user.name=Fork sync trial", "-c", "user.email=fork-sync@localhost",
                "-c", "merge.autoStash=false",
                "merge", "--no-commit", "--no-ff", "--no-edit", upstream,
                check=False,
            )
            report.extend(["## Merge result", "", result.stdout.strip(), result.stderr.strip(), ""])
            if result.returncode:
                conflicts = git(checkout, "diff", "--name-only", "--diff-filter=U", "-z").stdout
                report.extend(f"- Conflict: {path}" for path in conflicts.split("\0") if path)
                report.append("Merge failed; verification was not run.")
                return 1 if result.returncode == 1 else 2

            report.extend(["## Inventory after merge", ""])
            # Compare the merged working tree directly to the target upstream.
            # HEAD still points to the pre-merge fork commit (--no-commit).
            valid = inventory(checkout, upstream, None, report)
            if not verify:
                report.append("Builds and tests were not run. Use --verify to run the quality checks.")
                return 0 if valid else 1
            print("Running quality checks in the disposable worktree...", flush=True)
            checks = subprocess.run(
                ["bash", str(Path(__file__).resolve().with_name("verify.sh")), "all"],
                cwd=checkout,
            )
            report.append(f"Quality checks: {'passed' if checks.returncode == 0 else 'FAILED'}.")
            return 0 if valid and checks.returncode == 0 else 1
        finally:
            git(repo, *options, "worktree", "remove", "--force", str(checkout))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    subcommands = parser.add_subparsers(dest="command", required=True)
    for name in ("check", "trial"):
        command = subcommands.add_parser(name)
        command.add_argument("--upstream", default="upstream/main", help="local upstream branch, tag, or commit")
        command.add_argument("--head", default="HEAD", help="committed fork revision (default: HEAD)")
        command.add_argument("--fetch", action="store_true", help="first fetch upstream branches, without tags")
        command.add_argument("--report", type=Path, help="write the Markdown report to this file")
        if name == "check":
            command.add_argument("--working-tree", action="store_true", help="include staged, unstaged, and untracked files instead of committed HEAD")
        else:
            command.add_argument("--verify", action="store_true", help="also run Go and frontend quality checks in the trial worktree")
    args = parser.parse_args()
    if args.command == "check" and args.working_tree and args.head != "HEAD":
        parser.error("--working-tree can only be used with --head HEAD")

    title = "Fork inventory check" if args.command == "check" else "Upstream merge trial"
    report = [f"# {title}", ""]
    status = 2
    try:
        repo = Path(git(Path.cwd(), "rev-parse", "--show-toplevel").stdout.strip())
        if args.fetch:
            git(repo, "fetch", "--no-tags", "upstream")
        head = resolve_commit(repo, args.head)
        upstream = resolve_commit(repo, args.upstream)
        report.extend([f"Fork commit: {head}", "", f"Upstream commit: {upstream}", ""])
        if args.command == "trial":
            report.append("Only committed fork changes are included; the current working tree is left untouched.")
            status = trial(repo, head, upstream, args.verify, report)
        else:
            base = git(repo, "merge-base", head, upstream).stdout.strip()
            report.extend([f"Comparison base: {base}", ""])
            valid = inventory(repo, base, None if args.working_tree else head, report)
            status = 0 if valid else 1
    except (RuntimeError, OSError) as error:
        report.extend(["", f"ERROR: {error}"])
    report.extend(["", f"Result: {'passed' if status == 0 else 'FAILED'}.", ""])
    output = "\n".join(report)
    print(output)
    if args.report:
        try:
            args.report.write_text(output, encoding="utf-8")
        except OSError as error:
            print(f"ERROR: cannot write report: {error}", file=sys.stderr)
            return 2
    return status


if __name__ == "__main__":
    sys.exit(main())
