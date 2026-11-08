# Issue #16 — persistent Studio pairing and automatic reconnect

- Date/time: 2026-11-08 15:21 Europe/Rome (UTC+01:00).
- Agent/task/status: Codex / issue #16 / READY_FOR_REVIEW (browser implementation; native integration remains controller-owned).
- Repository (verified): https://github.com/RaulZion/OpenTheme-Studio.
- Baseline/main: cc0150c6486b17ef73693f3235b66ec63f978d8d.
- Branch/isolated clone: fix/codex-studio-persistent-reconnect / C:/Users/micci/.codex/ots-ui-g1.
- Verified implementation HEAD: 7e0c1863eb096d930a93520baa921aad096d36df, committed, pushed, matched by remote ref and GitHub PR metadata; clone clean after push. This handoff is a subsequent docs-only commit; exact delivery HEAD is in the final chat report and PR ref.
- PR: https://github.com/RaulZion/OpenTheme-Studio/pull/18, open against main, not merged. One PR; no cross-agent review.

## What changed

Root cause: the previous browser client kept the code only in memory and dropped live sync after any network failure, without a restart/recovery path. The first explicit **Pair, remember and apply** now saves a validated authenticated association separately from ThemeProject, in origin-scoped browser localStorage. Saved records are versioned and bound to the exact approved Studio origin and wire protocol; invalid/copied-origin records cannot cause a credential request. No URL, log, export/import, telemetry or cloud credential storage is introduced.

On startup, Studio restores the association and authenticates via the existing fixed loopback health + apply contract before Connected. Temporary connection/port failure, timeout or interrupted response keeps the credential and shows Waiting for VS Code; retry delays are 1/2/5/10/30/60 seconds, capped at 60 seconds. Waiting edits update the latest project without triggering request floods. Recovery sends that latest full document. Healthy idle connections are checked every 10 seconds. A health response alone never creates Connected.

401 revocation removes saved/in-memory auth and asks for a new code. Nontransient origin/protocol/project errors stop automatic retries but retain a potentially valid code for Reconnect/Forget. Explicit Disconnect/Forget cancels requests/timers and erases saved auth. Generation/abort guards prevent stale acknowledgments from restoring forgotten connections. Other same-origin tabs observe storage changes/removal. Browser storage failures are reported without falsely claiming persistence or erasure.

Restore remains explicit: requesting it stops automatic application and removes the saved automatic association before contacting the companion, so a lost restore acknowledgment cannot cause browser restart to reapply colors. On failure, the code remains only in memory for an intentional retry; automatic application stays paused. Success also drops the in-memory code. No native settings are restored automatically.

Claude's simplified structure and styles are preserved; only status/consent/action wording and handlers change. App/Preview/Inspector/style source and Obsidian sink are byte-unchanged. Existing editor, undo/redo, palette, import/export and Obsidian flows pass. No dependency, package, connector, root lockfile/config or shared contract changes.

Exact added/modified paths:

```text
apps/web/README.md
apps/web/docs/RECONNECT_EARLY_HANDOFF.md
apps/web/docs/RECONNECT_HANDOFF.md
apps/web/output/playwright/reconnect-authenticated.png
apps/web/output/playwright/reconnect-browser-tests.txt
apps/web/output/playwright/reconnect-build.txt
apps/web/output/playwright/reconnect-unit-tests.txt
apps/web/output/playwright/reconnect-waiting.png
apps/web/src/live/LiveConnections.test.tsx
apps/web/src/live/LiveConnections.tsx
apps/web/src/live/remembered-vscode.test.ts
apps/web/src/live/remembered-vscode.ts
apps/web/src/live/sync.ts
apps/web/src/live/vscode.test.ts
apps/web/src/live/vscode.ts
apps/web/tests/live.spec.ts
apps/web/tests/reconnect.spec.ts
```

Contract deviations: none. LIVE_SYNC_V1 already permits explicit opt-in remembered connections. No new endpoint, wire field, server, extension installer or account. The internal browser association record is not a ThemeProject/schema change. Typed errors distinguish transport downtime from revoked/rejected auth; Obsidian's LiveSync still has the original default error behavior.

## Proof

Windows; Node 24.18.0; pnpm 10.34.9; Python 3.13; Playwright 1.56.1 / Chromium 141.0.7390.37. Commands from repo root:

| Command actually executed | Exact outcome |
| --- | --- |
| npx --yes pnpm@10.34.9 install --frozen-lockfile --config.confirmModulesPurge=false | Passed; 6 workspace projects; lockfile up to date. Existing esbuild script ignored warning; no new dependencies. |
| npm test --prefix apps/web -- --reporter=dot | Baseline 59 passed. Final 76 passed, 9 files, 30.38s, exit 0. |
| npm run typecheck --prefix apps/web | Passed after UI wiring; final build also runs tsc --noEmit. |
| npm run build --prefix apps/web | Passed, 1779 modules; JS 430.25 kB / 134.41 kB gzip; CSS 29.84 kB / 6.57 kB gzip; built in 4.44s; exit 0. |
| $env:OTS_TEST_IPV6='1'; npm run test:browser --prefix apps/web | Final production bundle: 17 passed (32.5s), exit 0. Thirteen existing live/editor regressions plus four reconnect flows. Host color-environment warnings only. |
| node --test scripts/*.test.mjs | tests 3; pass 3; fail 0; exit 0. |
| apps/web/.venv/Scripts/python.exe -m unittest discover -s contracts/tests -p test_*.py -v | Ran 3 tests in 0.032s; OK; exit 0. Existing ignored local venv reused. |
| git diff --exit-code cc0150c6486b17ef73693f3235b66ec63f978d8d -- apps/web/src/styles.css apps/web/src/App.tsx apps/web/src/Preview.tsx apps/web/src/Inspector.tsx apps/web/src/live/obsidian.ts pnpm-lock.yaml contracts packages AGENTS.md docs package.json | Passed. Shared/other-agent paths and Claude layout/style sources untouched. Root lockfile current/base blob both cbce392247503a88ca6b33a481b91b13ea074213. |
| git diff --cached --check plus scope/branch checks | Passed before implementation commit. Only assigned branch and apps/web paths staged. |
| git push origin HEAD:refs/heads/fix/codex-studio-persistent-reconnect; git ls-remote | Implementation matched 7e0c1863eb096d930a93520baa921aad096d36df; main remained cc0150c6486b17ef73693f3235b66ec63f978d8d. |

Raw final [unit](../output/playwright/reconnect-unit-tests.txt), [build](../output/playwright/reconnect-build.txt) and [browser](../output/playwright/reconnect-browser-tests.txt) outputs are committed. Browser screenshots inspected: [authenticated reload](../output/playwright/reconnect-authenticated.png), [waiting during downtime with local edits retained](../output/playwright/reconnect-waiting.png). Historical baseline screenshots were left unchanged rather than committing incidental pixel differences from regression runs.

Focused tests cover authenticated persistence; reload/new client without retyping; actual Chromium process close/reopen with the same dedicated profile; no Connected from stored state or health alone; temporary offline/restart + browser reload + latest offline edit recovery; exact backoff/cap without edit-triggered floods; idle shutdown detection; 401 deletion/no retry; 403 pause/preserved code; malformed/copied-origin storage; canceled/late auth responses; blocked storage writes/erasure; cross-tab forget; restore failure/reload safety; JSON export credential isolation; and interrupted response bodies. Existing keyboard/history/import/palette/app isolation/ZIP/narrow/Obsidian ownership/revocation/removal tests pass.

Red/green evidence: manager stub produced 13 failing assertions; the restored-pairing component test failed before wiring; interrupted response reading reproduced incorrect permanent failure classification; restore retry initially lost the manual restore action. Each was corrected and the full suite rerun. One initial worker startup timeout occurred before tests (zero tests run), then the rerun executed the actual red assertions. A documentation-edit shell quoting error had no file effect and was corrected using a direct patch. No native compatibility proof or tools/tests are fabricated.

## Risks, limitations, blockers

- Native restart acceptance remains the controller's single integration gate with Gemini's persistent extension. This browser fix cannot keep a code valid if the extension rotates it on every VS Code restart; that sibling fix is explicitly outside scope. No other branch was reviewed and no waiting occurred.
- HTTP companion behavior is mocked in browser tests. Real Chromium process/profile persistence is tested, but native VS Code configuration changes/restoration/restart were not run here. Obsidian tests use the existing mocked-picker/real-OPFS fixture, not private vault notes.
- Remembering requires the same trusted browser profile and exact Studio origin (localhost and 127.0.0.1 are separate). Site/profile data clearing or explicit Disconnect/Forget/restore/revoke ends persistence. This uses browser storage, with no OS-keychain/encryption claim. Storage denial is visible; a tab-only connection cannot promise browser-restart persistence.
- Connected reflects the last authenticated apply. Idle disappearance is detected by a 10-second health check plus up to 3-second timeout, or the next edit. Token revocation is detected on the next authenticated operation; unauthenticated health cannot prove token validity and never re-establishes a connection.
- Origin/protocol/validation errors pause instead of blindly retrying. Opaque browser CORS/private-network errors cannot be distinguished from unavailable transport and retry at the bounded rate while preserving auth; user can Forget at any time.
- Restore intentionally ends remembered automatic application as soon as requested, even if confirmation is lost. Manual retry remains available in that tab. A later intentional reconnect can resume the current tab; after a restore/unpair and browser restart, new pairing is required. No automatic restore/reapply loop is added.
- No new root reconciliation/dependency/contract change is requested. CI status is verified separately on the final delivery HEAD and reported in PR/chat. No merge or background work claimed.

## Resume instructions

1. Open PR #18, this report, src/live/remembered-vscode.ts, src/live/vscode.ts and tests/reconnect.spec.ts. Verify the current PR delivery HEAD; original implementation is 7e0c1863eb096d930a93520baa921aad096d36df.
2. Run the frozen install, npm test --prefix apps/web, npm run build --prefix apps/web, then npm run test:browser --prefix apps/web. Set OTS_TEST_IPV6=1 only if another IPv4 Studio occupies 5173; no existing server was killed or reused. Demo remains npm run dev --prefix apps/web at the fixed local origin.
3. Next single safe action: controller integrates this PR with the extension persistence fix and performs one native gate: enter code once, restart VS Code, restart browser with the same profile/origin, observe authenticated reconnect/current project; revoke/Forget and verify no reconnect; verify explicit restore and unrelated settings preservation.
4. Keep edits in apps/web/** on the assigned branch. Do not merge, modify connector/root/contracts or review another agent. Preserve Claude's UI and Obsidian/editor flows.

## Claims not verified

Real VS Code restart/secret survival, native setting updates/restoration, native version compatibility, production private-network permission behavior and combined Gemini integration are unverified here. Passing mocked HTTP tests and real browser-profile persistence are not substitutes for that native gate. Current remote CI success is not assumed from local tests; it is checked for the final SHA separately.
