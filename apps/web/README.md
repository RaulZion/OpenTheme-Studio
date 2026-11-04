# OpenTheme Studio web — OTS-101 / OTS-102

React/TypeScript/Vite studio. All preview HTML/CSS is original, illustrative, and not native app evidence. No remote fonts, assets, accounts, telemetry, app installation, or backend.

## Run independently from the frozen G0 base

Node >=22.12.0. From the repository root:

```powershell
npm install --prefix apps/web --workspaces=false --package-lock=false --no-audit --no-fund
npm run dev --prefix apps/web
npm test --prefix apps/web
npm run build --prefix apps/web
npm exec --prefix apps/web -- playwright install chromium
npm run test:browser --prefix apps/web
```

Browser tests serve the built production bundle at 127.0.0.1:4173. Build before running them. Screenshots are written to apps/web/output/playwright. Vitest uses one thread worker because process-worker startup timed out on this Windows host.

## Included flow

Choose VS Code / Obsidian; apply one of three shared palettes; click or keyboard-activate a preview region; edit its hex color or use the native color chooser. The inspector edits a shared semantic role or one app override. Both property and whole-app override resets are undoable. Palette presets preserve overrides and update the theme's declared dark/light mode. Studio appearance is separate from the theme.

Undo/redo retains up to 100 document snapshots. Ctrl/Command Z and Shift Z apply outside text fields; native text undo remains available inside them. Toolbar undo/redo always edits document history. Compare shows the project opened at the start of this browser session. Import is one undoable document change.

Edits auto-save in this browser's localStorage, when available. Download canonical project JSON for a portable backup; browser storage can be cleared. If saved data cannot be restored, it is left untouched and this session stays in memory; download JSON to retain edits. Imports are limited to 1 MiB and validated against the unchanged canonical JSON Schema. Safe unknown app overrides are retained for future adapters. Optional syntax colors are preserved and shown; this slice does not expose a syntax editor.

## Adapter integration boundary

src/development-adapters.ts implements the canonical ThemeAdapter type from contracts/adapter-api.ts. It declares **zero verified supportedVersions**, returns preview-only controls for the frozen documentation targets, reports DEVELOPMENT_PLACEHOLDER, and rejects export without files. Region keys are development mappings, not native capability claims. No install steps or native artifact are fabricated.

Controller's next integration action: import Gemini's concrete adapters behind this boundary, derive supported controls/mappings from them, call validation/export for the exact target, then present validated files plus their install/remove guidance. Keep illustrative labeling until version-identifiable native tests pass. Never turn the placeholder into a fake exporter.

## Controller-owned dependency change request

No shared source or root config change is needed. The existing workspace globs already include apps/web. Reconcile **root pnpm-lock.yaml** for the exact dependency/devDependency additions in apps/web/package.json using the pinned pnpm **10.34.9**, then run a frozen install and workspace checks in the integration checkout. Do not use this host's fallback pnpm 11.25.0 to regenerate the canonical lockfile. This PR intentionally cannot pass a root frozen workspace install until that controller-owned reconciliation occurs.

## Evidence and limits

See docs/FINAL_HANDOFF.md and output/playwright/*.png. Chromium desktop 1440×1000 and narrow 390×844 are automated browser interactions, not screenshots of native applications. Offline editing after initial load is tested; offline reload is not guaranteed (no service worker). Firefox/WebKit, screen reader audits, full accessibility conformance, recruited-user research, native VS Code/Obsidian install checks, and G1 integration/release acceptance remain outside this package's proof. No other agent review is requested, following issue #3.
