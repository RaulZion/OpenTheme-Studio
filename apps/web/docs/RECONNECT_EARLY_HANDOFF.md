# Issue 16 — early checkpoint

- Date/time: 2026-11-08, Europe/Rome.
- Agent/task/status: Codex / issue #16 / IN_PROGRESS.
- Repository: https://github.com/RaulZion/OpenTheme-Studio (origin verified).
- Baseline/main, assigned remote branch and current HEAD: cc0150c6486b17ef73693f3235b66ec63f978d8d.
- Branch/isolated clone: fix/codex-studio-persistent-reconnect / C:/Users/micci/.codex/ots-ui-g1. Clean before edits. PR: none.

## What changed

Only this checkpoint so far. Read issue #16 and comments, issue #8, AGENTS.md, ADR-0004, LIVE_SYNC_V1.md, charter and current live code/tests/Claude UI. Cause: pairing is tab-memory-only and a transient transport failure drops the sink without a reconnection path. No connector changes are needed or authorized here.

Plan: add focused failing tests; persist only an authenticated, explicitly remembered origin-bound pairing outside ThemeProject; recover through health + authenticated apply, with bounded 1/2/5/10/30/60-second backoff and healthy idle liveness checks; forget on explicit disconnect/unpair or HTTP 401; keep credentials for temporary downtime and pause on nontransient failures. Preserve Claude layout, editor/Obsidian flows and wire protocol. Test reload/browser-profile reopen, offline/online, auth revocation, forget/cancellation, stale responses, storage failures and existing live regressions. No new dependencies or cross-agent reviews.

## Proof

git remote/fetch/status/worktree/rev-parse verified before editing. Frozen pnpm 10.34.9 install passed with unchanged lockfile. Baseline web tests executed; exact result in tool output. No new reconnect test/native test/browser evidence yet.

## Risks, limitations, blockers

Persistent credentials require an explicit remember action and origin-scoped browser storage. Clearing profile/site data or Forget ends the saved pairing; blocked storage must be explained. Never put credentials in project exports/imports, URL, telemetry, logs or committed fixtures from a real session. Companion persistence/restart behavior is Gemini-owned and native acceptance remains the controller gate. No waiting for or review of another branch. No planned contract/root/dependency changes.

## Resume instructions

1. Open src/live/vscode.ts, sync.ts, LiveConnections.tsx and this issue.
2. Run npm test --prefix apps/web; npm run build --prefix apps/web; npm run test:browser --prefix apps/web (OTS_TEST_IPV6=1 if IPv4 5173 is occupied).
3. Next action: write failing persistent reconnect tests, then implement the minimal lifecycle manager and wire it into the unchanged UI structure.
4. Modify only apps/web/** on assigned branch. No merge, root lockfile, connector, contract or other-agent edits.

## Claims not verified

No persistent browser association, successful reconnect, or native restart proof claimed at this checkpoint. Existing UI uses mocked companion tests; native integration will be tested separately by the controller.

## Verified pre-commit checkpoint — 2026-11-08 15:17 Europe/Rome

Current HEAD remains frozen baseline cc0150c6486b17ef73693f3235b66ec63f978d8d before the implementation commit. All changes are apps/web/**. Added remembered-vscode.ts with origin-scoped authenticated persistence, 1/2/5/10/30/60s retries, 10s health liveness, cross-tab forget, stale/abort guards and deliberate restore isolation. Added typed transient/auth errors in the existing fixed-loopback transport, preserving protocol. Wired existing Claude markup to the manager, updating consent/action text only. Styles, App/Preview/Inspector, Obsidian sink, contracts, packages, root files and lockfile are unchanged.

Baseline 59/59 passed. New tests first showed 13 failures against the manager stub and one failure for unwired restored pairing; they passed after implementation. A response-body interruption test reproduced misclassification of shutdown as permanent failure and was corrected. A restore-retry regression reproduced missing manual restore capability; fixed while preventing automatic reapply after ambiguous restore acknowledgments. Latest full web suite: 76/76 (9 files, 30.38s). Typecheck/Vite build: exit 0, JS 430.25 kB / 134.41 kB gzip, 4.44s. First production browser run: 17/17 including real Chromium process close/reopen with a dedicated profile; final rerun output is in output/playwright/reconnect-browser-tests.txt. Root smoke 3/3 and Python schema 3/3 pass. One initial Vitest worker startup timeout occurred before tests; rerun executed the actual red assertions. No native VS Code restart proof or other-agent review claimed.

Next single action: verify final browser output, normalize logs, commit/push only assigned branch and open one PR. Then final handoff + CI verification. Root lockfile still matches frozen base blob cbce392247503a88ca6b33a481b91b13ea074213. Actual companion persistence/native restart is the controller/Gemini integration gate; do not wait for or edit it.
