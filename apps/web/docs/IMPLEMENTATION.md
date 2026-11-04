# G1 UI implementation plan and ledger

Goal: implement OTS-101/102 against the frozen G0 specification, entirely inside apps/web.
Spec: prompts/01-codex-frontend.md and docs/ux/EDITOR_BRIEF.md.

Architecture: React/TypeScript/Vite; canonical ThemeProject and ThemeAdapter imported from contracts. A pure immutable document/history model is separate from view state. Validate local files with the canonical JSON Schema. A static development adapter declares illustrative mappings and always refuses native export. No dynamic plugins or network in the product.

Design decision: a three-column studio with a generous preview, compact palette navigation, contextual inspector, lavender studio accents, and independent studio/theme appearance. On narrow screens navigation and inspector are disclosure panels. All interactive preview regions are native buttons. Scene typography and icons are original HTML/CSS, without target assets.

Alternatives: a palette-only form would not demonstrate visual editing; embedded real apps cannot meet local-first/safety constraints. Use original illustrative scenes, explicitly labeled at all times. This implements the supplied brief under the user's authorization to build; no additional design approval flow.

Constraints: only apps/web/** is writable/committable; no root lockfile changes, adapters, contracts, main, native writes or unsupported export claims. Keep lockfile reconciliation for controller. Install package dependencies locally without writing any lockfile.

## Tasks

- [x] 1. Document model and contract validation. Tests first: shared changes preserve override; app change preserves globals/other apps; undo/redo and branching; exact JSON round trip including unknown safe overrides; reject invalid schema and large/malformed input. Files: src/model.ts, src/model.test.ts, src/development-adapters.ts.
- [x] 2. Accessible editor and original preview scenes. Tests first: selection focuses inspector; scoped edit/reset/history; theme presets; studio appearance independent of project; invalid import leaves document intact; dialog keyboard/focus. Files: src/App.tsx, src/Preview.tsx, src/Inspector.tsx, src/Dialogs.tsx, src/App.test.tsx, src/styles.css.
- [x] 3. Browser evidence and package verification. Files: playwright.config.ts, tests/editor.spec.ts, output/playwright/**. Exercise desktop/narrow, keyboard, compare, download/reimport, offline editing after load; capture screenshots; run tests/typecheck/build and root smoke tests; review entire diff.
- [ ] 4. Final report, scoped commit/push/PR to main. No merge. Record exact outputs, native export blocker, dependency diff, known gaps, next safe step.

Review focus: rejected imports must not destroy edits; per-app overrides must survive shared edits and round trips; native text undo must remain available in inputs; dialogs and collapsed panels need useful focus; storage failures must preserve in-memory document.

## Ledger

2026-11-04: origin verified as https://github.com/RaulZion/OpenTheme-Studio.git; main and assigned branch both 06eda81c59d46e7ff3abb5977a041ff00e86552c. Initial source checkout clean; left untouched. Native worktree creation failed source registration twice; isolated clone used at C:/Users/micci/.codex/ots-ui-g1, assigned branch clean at base. No other AGENTS.md. G0 run 41884779787 job 126766194179 success, verified via GitHub connector. Shared types are the only adapter implementation at G0.

2026-11-04 19:43 Europe/Rome: issue #3 read via GitHub connector; fast-lane execution supersedes review/polish loops. No delegation or other-agent review. Task 1 complete: 18 model tests. Task 2 complete: 8 component tests plus 3 placeholder tests, 29 total pass. Initial 25 assertions failed against stubs, then passed after implementation. Storage loss regression failed once, fixed by preserving unreadable saved bytes and using memory-only fallback; suite green. Task 3 complete: production build/typecheck exit 0, Playwright Chromium 4/4 pass in 13.2s; 1440x1000 and 390x844 screenshots captured and visually inspected. Downloaded JSON deep-equals persisted state after edits and isolated override; reimport deep-equals downloaded state. Root Node smoke 3/3; Python JSON Schema 3/3 after installing frozen requirements in package-local ignored venv. Host Python initially lacked jsonschema; resolved locally. Initial Vitest fork startup timeout resolved with one thread worker. Initial browser JSON module attribute issue resolved in test import. Offline-after-load editing tested, offline reload not guaranteed. No native installation or export claims. Root lock blob remains 9b60ae1782d6de40a88f604fe40efd8a127d3418. Next: scoped commit/push and one PR; controller reconciles lockfile and integrates actual adapters before G1 gate.