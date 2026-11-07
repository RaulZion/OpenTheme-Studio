# OTS-143 early handoff

- Date/time: 2026-11-07, Europe/Rome.
- Agent/task/status: Codex / OTS-143 / IN_PROGRESS.
- Verified repository: https://github.com/RaulZion/OpenTheme-Studio.
- Baseline and HEAD: 77b2294873c460e5cef87cda80f267303601495a (origin/main and assigned remote branch match).
- Branch/isolated clone: feature/codex-g1-live-ui-obsidian, C:/Users/micci/.codex/ots-ui-g1. Clean before this report. PR: none.

## What changed

Only this checkpoint so far. Read AGENTS.md, ADR-0004, LIVE_SYNC_V1.md, backlog, issue #8 and comments, current editor/exporter/tests. Existing clone reused after verifying clean; single-branch fetch configuration required explicit remote refs and a no-track local branch. No source edit before verifying final assigned branch/HEAD. Scope is apps/web/** only.

Plan: (1) test and implement fixed-loopback authenticated client plus serialized 300ms document debounce; (2) test and implement user-granted .obsidian owned snippet sink using existing exporter, content hash verification, permission checks and safe cleanup; (3) add primary connect/status UI, retain optional ZIP/share; (4) production-browser mock flows, regressions, local demo instructions, scoped commit/push/one PR. No redesign or cross-agent reviews. Sessions/secrets/handles stay in tab memory. Both connected targets receive full committed documents, including undo/redo/import.

## Proof

git remote/fetch/rev-parse/status/worktree verified; issue and comments read via GitHub connector. Frozen dependency installation using pnpm 10.34.9 is in progress. New live tests and native app tests: not run yet. Screenshots: none for this package yet.

## Risks, limitations, blockers

Native connector and real installed-app evidence belong to controller integration; do not wait for Gemini or call mocks native proof. Browser folder access requires a real gesture and a supported secure local Chromium origin. Never touch notes, appearance.json, foreign snippets, connectors, contracts or root lockfile. No contract changes planned. The live snippet will use exporter-generated CSS for both dark/light selectors so palette edits apply regardless of Obsidian's current mode; no appearance configuration writes.

## Resume instructions

1. Open apps/web/src/native-export.ts, App.tsx, tests and contracts/LIVE_SYNC_V1.md.
2. Run npx --yes pnpm@10.34.9 install --frozen-lockfile; npm test --prefix apps/web.
3. Next smallest action: add failing focused live-client/debounce/snippet tests, then implement them.
4. Change only apps/web/** on the assigned branch. Never merge or review other agents.

## Claims not verified

No live connector response, real VS Code update, real Obsidian reload, restored native settings, or browser live flow is claimed yet. Existing native export code is a dependency, not proof of installed-app compatibility.

## Verified implementation checkpoint — 2026-11-07 16:23 Europe/Rome

HEAD remains frozen base before the scoped implementation commit. Uncommitted changes are only apps/web/** (run git status --short for exact current paths). Added live/vscode.ts (origin-bound session client, health + authenticated apply/restore), live/sync.ts (300ms serialized queue), live/obsidian.ts (safe exported CSS, ownership SHA-256, permission/revocation/removal), LiveConnections.tsx plus focused tests. Integrated primary controls and optional share menu without redesign. No dependency additions; frozen pnpm 10.34.9 install passed and root lockfile blob still 52a12b334bec64e9d92e571e598ef1955621f066.

Proof so far: 58/58 web tests; TypeScript/Vite build passed (428.08 kB JS, 134.19 kB gzip); workspace tests passed (core 15 + VS Code adapter 8 + Obsidian adapter 8 + web 58); root smoke 3/3; Python canonical schema 3/3. Previous production-browser run 12/12 passed; final 13-test run adds explicit forget-after-failure regression (first failed for missing button, then implemented). Final production browser run: 13/13 passed in 24.3s. Exact output is in output/playwright/live-browser-tests.txt. Port 5173 IPv4 belongs to an existing Studio process; left intact. Browser test option OTS_TEST_IPV6=1 uses the contract-approved localhost origin on an isolated ::1 listener. VS Code HTTP is mocked; Obsidian picker/permission is mocked and file operations use browser OPFS. No real native app or private vault proof claimed. Next single action: inspect final browser result, then checkpoint scoped commit/push and open one PR.
