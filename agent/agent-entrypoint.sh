#!/usr/bin/env bash
# DCYFR Agent Entrypoint
# ======================
# Runs inside the agent container. Receives task parameters via environment
# variables, clones the target repository, implements the requested task,
# runs quality gates, and opens a draft pull request.
#
# Required environment variables:
#   GITHUB_TOKEN or GITHUB_TOKEN_FILE
#                      — Personal access token (or fine-grained token) with:
#                          contents: write, pull-requests: write, issues: write
#   AGENT_TASK_ID      — OpenSpec task identifier (e.g. "1.3.1")
#   AGENT_TASK_DESC    — One-line description of the task
#   AGENT_REPO         — owner/repo (e.g. "dcyfr/workspace")
#   AGENT_BASE_BRANCH  — Target branch for the PR (default: main)
#   AGENT_CONTRACT_ID  — Delegation contract ID (for status reporting)
#
# Optional environment variables:
#   AGENT_BRANCH_PREFIX  — Branch name prefix (default: dcyfr-agent)
#   AGENT_MAX_TIME_S     — Self-imposed time limit in seconds (default: 1800)
#   AGENT_SKIP_PUSH      — Set to "1" to skip git push (dry-run mode)

set -euo pipefail

# ── Helpers ────────────────────────────────────────────────────────────────

log() {
  local level="${1}"
  shift
  echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"level\":\"${level}\",\"msg\":\"$*\",\"contract\":\"${AGENT_CONTRACT_ID:-unknown}\"}"
}

die() {
  log "ERROR" "$*"
  exit 1
}

# ── Validate required environment ──────────────────────────────────────────

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  : "${GITHUB_TOKEN_FILE:?GITHUB_TOKEN or GITHUB_TOKEN_FILE is required}"
  [[ -r "${GITHUB_TOKEN_FILE}" ]] || die "GITHUB_TOKEN_FILE is not readable: ${GITHUB_TOKEN_FILE}"
  GITHUB_TOKEN="$(<"${GITHUB_TOKEN_FILE}")"
  export GITHUB_TOKEN
fi

: "${GITHUB_TOKEN:?GITHUB_TOKEN is required}"
: "${AGENT_TASK_ID:?AGENT_TASK_ID is required}"
: "${AGENT_TASK_DESC:?AGENT_TASK_DESC is required}"
: "${AGENT_REPO:?AGENT_REPO is required}"
: "${AGENT_CONTRACT_ID:?AGENT_CONTRACT_ID is required}"

BASE_BRANCH="${AGENT_BASE_BRANCH:-main}"
BRANCH_PREFIX="${AGENT_BRANCH_PREFIX:-dcyfr-agent}"
MAX_TIME_S="${AGENT_MAX_TIME_S:-1800}"
SKIP_PUSH="${AGENT_DRY_RUN:-${AGENT_SKIP_PUSH:-0}}"
ISSUE_NUMBER="${AGENT_ISSUE_NUMBER:-}"
MAX_RETRY="${AGENT_QUALITY_RETRIES:-2}"  # max additional attempts after first failure

# Derive a git-safe branch name from the task ID and a timestamp
TASK_SLUG="${AGENT_TASK_ID//[^a-zA-Z0-9-]/-}"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
WORK_BRANCH="${BRANCH_PREFIX}/${TASK_SLUG}-${TIMESTAMP}"
REPO_DIR="/workspace/repo"

log "INFO" "Agent starting — repo=${AGENT_REPO} task=${AGENT_TASK_ID} base=${BASE_BRANCH} branch=${WORK_BRANCH}"

# ── Configure git identity ──────────────────────────────────────────────────

git config --global user.email "agent@dcyfr.ai"
git config --global user.name "DCYFR Agent"
git config --global credential.helper store
echo "https://oauth2:${GITHUB_TOKEN}@github.com" > ~/.git-credentials
chmod 600 ~/.git-credentials

# Authenticate gh CLI
echo "${GITHUB_TOKEN}" | gh auth login --with-token

# ── Clone repository ────────────────────────────────────────────────────────

log "INFO" "Cloning ${AGENT_REPO}..."
git clone \
  --depth=1 \
  --branch "${BASE_BRANCH}" \
  "https://github.com/${AGENT_REPO}.git" \
  "${REPO_DIR}"

cd "${REPO_DIR}"
git checkout -b "${WORK_BRANCH}"

log "INFO" "Clone complete — working on branch ${WORK_BRANCH}"

# ── Install dependencies ────────────────────────────────────────────────────

log "INFO" "Installing dependencies..."
if [[ -f "package-lock.json" ]]; then
  npm ci --prefer-offline --ignore-scripts 2>&1 | tail -5
elif [[ -f "yarn.lock" ]]; then
  yarn install --frozen-lockfile 2>&1 | tail -5
else
  npm install --prefer-offline --ignore-scripts 2>&1 | tail -5
fi
log "INFO" "Dependencies installed"

# ── Execute agent task ──────────────────────────────────────────────────────
#
# The actual implementation code is expected to be provided via one of:
#   1. AGENT_SCRIPT_B64 — base64-encoded shell/node script to execute
#   2. AGENT_PATCH_B64  — base64-encoded unified diff to apply
#   3. A mounted script at /agent/task.sh
#
# For Phase 1 the dispatcher injects AGENT_SCRIPT_B64.

log "INFO" "Executing task: ${AGENT_TASK_DESC}"
IMPL_EXIT=0

if [[ -n "${AGENT_SCRIPT_B64:-}" ]]; then
  TMPSCRIPT="$(mktemp /tmp/agent-task-XXXXXX.sh)"
  # Decode the script — content is expected to be plain shell/node with no
  # embedded instructions (validated by ContentPolicyMiddleware before dispatch)
  echo "${AGENT_SCRIPT_B64}" | base64 --decode > "${TMPSCRIPT}"
  chmod +x "${TMPSCRIPT}"
  timeout "${MAX_TIME_S}" bash -e "${TMPSCRIPT}" || IMPL_EXIT=$?
  rm -f "${TMPSCRIPT}"
elif [[ -n "${AGENT_PATCH_B64:-}" ]]; then
  TMPPATCH="$(mktemp /tmp/agent-patch-XXXXXX.diff)"
  echo "${AGENT_PATCH_B64}" | base64 --decode > "${TMPPATCH}"
  git apply "${TMPPATCH}" || IMPL_EXIT=$?
  rm -f "${TMPPATCH}"
elif [[ -f "/agent/task.sh" ]]; then
  timeout "${MAX_TIME_S}" bash -e /agent/task.sh || IMPL_EXIT=$?
else
  die "No task implementation found. Set AGENT_SCRIPT_B64, AGENT_PATCH_B64, or mount /agent/task.sh"
fi

if [[ "${IMPL_EXIT}" -ne 0 ]]; then
  die "Task implementation exited with code ${IMPL_EXIT}"
fi

log "INFO" "Task implementation complete"

# ── Quality gates ────────────────────────────────────────────────────────────

run_quality_gates() {
  GATE_EXIT=0
  TS_STATUS="⏭️ skipped"
  TS_OUTPUT=""
  LINT_STATUS="⏭️ skipped"
  LINT_OUTPUT=""
  TEST_STATUS="⏭️ skipped"
  TEST_OUTPUT=""

  log "INFO" "Running quality gates..."

  # Try lint auto-fix first to reduce gate failures
  npm run lint:fix --if-present 2>/dev/null || true

  # TypeScript check
  if TS_OUTPUT="$(npm run typecheck --if-present 2>&1)"; then
    TS_STATUS="✅ passed"
    log "INFO" "TypeScript: PASS"
  else
    TS_STATUS="❌ failed"
    GATE_EXIT=1
    log "WARN" "TypeScript: FAIL"
  fi

  # Lint check
  if LINT_OUTPUT="$(npm run lint --if-present 2>&1)"; then
    LINT_STATUS="✅ passed"
    log "INFO" "Lint: PASS"
  else
    LINT_STATUS="⚠️ warning"
    log "WARN" "Lint: has warnings"
  fi

  # Tests
  if TEST_OUTPUT="$(npm run test:run --if-present 2>&1)"; then
    TEST_STATUS="✅ passed"
    log "INFO" "Tests: PASS"
  else
    TEST_STATUS="❌ failed"
    GATE_EXIT=1
    log "WARN" "Tests: FAIL"
  fi

  return ${GATE_EXIT}
}

# Run quality gates with retry
ATTEMPT=0
run_quality_gates || GATE_EXIT=$?

while [[ "${GATE_EXIT}" -ne 0 && "${ATTEMPT}" -lt "${MAX_RETRY}" ]]; do
  ATTEMPT=$((ATTEMPT + 1))
  log "WARN" "Quality gate failure — retry attempt ${ATTEMPT}/${MAX_RETRY}"
  # Give the implementation another chance via re-running the task script
  if [[ -n "${AGENT_SCRIPT_B64:-}" ]]; then
    TMPSCRIPT="$(mktemp /tmp/agent-retry-XXXXXX.sh)"
    echo "${AGENT_SCRIPT_B64}" | base64 --decode > "${TMPSCRIPT}"
    chmod +x "${TMPSCRIPT}"
    timeout "${MAX_TIME_S}" bash -e "${TMPSCRIPT}" || true
    rm -f "${TMPSCRIPT}"
  fi
  GATE_EXIT=0
  run_quality_gates || GATE_EXIT=$?
done

if [[ "${GATE_EXIT}" -ne 0 ]]; then
  log "WARN" "Quality gates still failing after ${ATTEMPT} retries — PR will be marked with gate-failures"
fi

# ── Commit changes ────────────────────────────────────────────────────────────

if git diff --quiet && git diff --cached --quiet; then
  die "No changes detected after task execution — nothing to commit"
fi

log "INFO" "Committing changes..."
git add -A
git commit -m "feat(agent): ${AGENT_TASK_DESC}

Task-ID: ${AGENT_TASK_ID}
Contract: ${AGENT_CONTRACT_ID}
Agent: dcyfr-agent/1.0.0
Quality-Gates: $(if [[ ${GATE_EXIT} -eq 0 ]]; then echo PASSED; else echo FAILED; fi)
Retry-Attempts: ${ATTEMPT}"

# ── Push branch ──────────────────────────────────────────────────────────────

if [[ "${SKIP_PUSH}" == "1" ]]; then
  log "INFO" "AGENT_SKIP_PUSH=1 — skipping push (dry-run mode)"
  exit 0
fi

log "INFO" "Pushing branch ${WORK_BRANCH}..."
git push origin "${WORK_BRANCH}"

# ── Create draft pull request ─────────────────────────────────────────────────

CLOSES_LINE=""
if [[ -n "${ISSUE_NUMBER}" ]]; then
  CLOSES_LINE="Closes #${ISSUE_NUMBER}"
fi

PR_BODY="## Agent-Generated PR

**Task:** \`${AGENT_TASK_ID}\` — ${AGENT_TASK_DESC}
**Contract:** \`${AGENT_CONTRACT_ID}\`
**Base Branch:** \`${BASE_BRANCH}\`

${CLOSES_LINE}

### Quality Gates

| Gate | Status |
|------|--------|
| TypeScript | ${TS_STATUS} |
| Lint | ${LINT_STATUS} |
| Tests | ${TEST_STATUS} |

$(if [[ ${GATE_EXIT} -ne 0 ]]; then
  echo '<details><summary>🔍 Quality gate details (click to expand)</summary>'
  echo ''
  echo '**TypeScript output:**'
  echo '```'
  echo "${TS_OUTPUT}" | tail -20
  echo '```'
  echo ''
  echo '**Test output:**'
  echo '```'
  echo "${TEST_OUTPUT}" | tail -20
  echo '```'
  echo '</details>'
fi)

---

*This pull request was created autonomously by a [DCYFR agent](https://www.dcyfr.ai).*
*Review carefully before merging.*"

PR_LABELS="agent-generated"
if [[ "${GATE_EXIT}" -ne 0 ]]; then
  PR_LABELS="${PR_LABELS},gate-failures"
fi

log "INFO" "Creating draft PR..."
PR_URL=""
if PR_URL="$(gh pr create \
  --repo "${AGENT_REPO}" \
  --base "${BASE_BRANCH}" \
  --head "${WORK_BRANCH}" \
  --title "feat(agent): ${AGENT_TASK_DESC}" \
  --body "${PR_BODY}" \
  --draft \
  --label "${PR_LABELS}")"; then
  log "INFO" "Draft PR created: ${PR_URL}"
  echo "AGENT_PR_URL=${PR_URL}"

  # Post success comment on originating issue (2.3.5)
  if [[ -n "${ISSUE_NUMBER}" ]]; then
    COMMENT_BODY="✅ **Agent task complete!**

Pull request opened: ${PR_URL}

| Gate | Status |
|------|--------|
| TypeScript | ${TS_STATUS} |
| Lint | ${LINT_STATUS} |
| Tests | ${TEST_STATUS} |

The PR is in draft mode. Review the changes before requesting a merge."
    gh issue comment "${ISSUE_NUMBER}" \
      --repo "${AGENT_REPO}" \
      --body "${COMMENT_BODY}" || true
  fi
else
  # PR creation failed (2.3.7)
  log "ERROR" "Failed to create pull request"
  if [[ -n "${ISSUE_NUMBER}" ]]; then
    FAIL_BODY="❌ **Agent task failed after ${ATTEMPT} retries**

The agent container could not create a pull request.

**Quality Gate Results:**

| Gate | Status |
|------|--------|
| TypeScript | ${TS_STATUS} |
| Lint | ${LINT_STATUS} |
| Tests | ${TEST_STATUS} |

<details><summary>TypeScript output</summary>

\`\`\`
$(echo "${TS_OUTPUT}" | tail -30)
\`\`\`
</details>

<details><summary>Test output</summary>

\`\`\`
$(echo "${TEST_OUTPUT}" | tail -30)
\`\`\`
</details>

Contract ID: \`${AGENT_CONTRACT_ID}\`"
    gh issue comment "${ISSUE_NUMBER}" \
      --repo "${AGENT_REPO}" \
      --body "${FAIL_BODY}" || true
  fi
  exit 1
fi

