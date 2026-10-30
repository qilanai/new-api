#!/usr/bin/env bash
# Run from the checkout to verify (including a disposable sync worktree).
set -euo pipefail

mode="${1:-all}"
case "$mode" in
  all|backend|frontend) ;;
  *) echo 'Usage: bash ext/tools/verify.sh [all|backend|frontend]' >&2; exit 2 ;;
esac
cd "$(git rev-parse --show-toplevel)"
failed=0

run_check() {
  local label="$1"
  shift
  printf '\n>>> %s\n' "$label"
  if "$@"; then
    printf 'PASS: %s\n' "$label"
  else
    printf 'FAIL: %s\n' "$label" >&2
    failed=1
  fi
}

check_gofmt() {
  local output
  output="$(git ls-files --cached --others --exclude-standard -z -- '*.go' | xargs -0 gofmt -l)" || return 1
  if [[ -n "$output" ]]; then
    printf '%s\n' "$output"
    return 1
  fi
}

if [[ "$mode" == all || "$mode" == backend ]]; then
  run_check 'Go formatting' check_gofmt
  # The root binary embeds this directory; the frontend check builds real assets.
  if [[ ! -f web/dist/index.html ]]; then
    mkdir -p web/dist
    touch web/dist/index.html
  fi
  for module in . relaykit tokenkit; do
    run_check "Go vet ($module)" env GOWORK=off go -C "$module" vet ./...
    run_check "Go build ($module)" env GOWORK=off go -C "$module" build ./...
  done
  if [[ -z "${TEST_MYSQL_DSN:-}" || -z "${TEST_POSTGRES_DSN:-}" ]]; then
    echo 'Database matrix is incomplete: set TEST_MYSQL_DSN and TEST_POSTGRES_DSN to enable both engines.'
  fi
  # Keep checking independent modules even when one module's tests fail.
  for module in . relaykit tokenkit; do
    run_check "Go tests ($module)" env GOWORK=off go -C "$module" test ./...
  done
fi

if [[ "$mode" == all || "$mode" == frontend ]]; then
  if bun install --cwd web --frozen-lockfile; then
    for task in typecheck lint format:check copyright:check test build; do
      run_check "Frontend $task" bun run --cwd web "$task"
    done
  else
    echo 'FAIL: Frontend dependency installation' >&2
    failed=1
  fi
fi

exit "$failed"
