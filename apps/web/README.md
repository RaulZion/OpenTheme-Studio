# OpenTheme Studio web — OTS-101 / OTS-102

React/TypeScript/Vite studio. All preview HTML/CSS is original, illustrative, and not native app evidence. No remote fonts, assets, accounts, telemetry, app installation, or backend.

## Run the integrated MVP

From repository root, with Node 22.16+ and pnpm 10.34.9:

```sh
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @opentheme/web dev
corepack pnpm -r --if-present test
corepack pnpm -r --if-present build
```

For optional browser tests (requires installed Chromium):

```sh
corepack pnpm --filter @opentheme/web exec playwright install chromium
corepack pnpm --filter @opentheme/web test:browser
```

Native theme ZIPs include package files and a README for manual installation. They are **not** VSIX packages or one-click installers. Preview scenes remain illustrative and real target-version installations are still a separate G1 acceptance test.

## Included flow

Choose VS Code / Obsidian; apply one of three shared palettes; click or keyboard-activate a preview region; edit its hex color or use the native color chooser. The inspector edits a shared semantic role or one app override. Both property and whole-app override resets are undoable. Palette presets preserve overrides and update the theme's declared dark/light mode. Studio appearance is separate from the theme.

Undo/redo retains up to 100 document snapshots. Ctrl/Command Z and Shift Z apply outside text fields; native text undo remains available inside them. Toolbar undo/redo always edits document history. Compare shows the project opened at the start of this browser session. Import is one undoable document change.

Edits auto-save in this browser's localStorage, when available. Download canonical project JSON for a portable backup; browser storage can be cleared. If saved data cannot be restored, it is left untouched and this session stays in memory; download JSON to retain edits. Imports are limited to 1 MiB and validated against the unchanged canonical JSON Schema. Safe unknown app overrides are retained for future adapters. Optional syntax colors are preserved and shown; this slice does not expose a syntax editor.

## Integrated export boundary

The editor uses the accepted canonical `ThemeProject` schema. Visual preview mappings in `src/development-adapters.ts` are illustrative, but `src/native-export.ts` now invokes the actual `@opentheme/adapter-vscode` and `@opentheme/adapter-obsidian` exports. Both produce validatable native file bundles with manual install/remove guidance. Export ZIP paths are checked before packaging; users' installed applications and configuration folders are never modified.

Any claim of compatibility with VS Code 1.144.0 and Obsidian 1.15.0 requires independent native application evidence. The source adapter tests alone do not establish that evidence.

## Evidence and limits

See docs/FINAL_HANDOFF.md and output/playwright/*.png. Chromium desktop 1440×1000 and narrow 390×844 are automated browser interactions, not screenshots of native applications. Offline editing after initial load is tested; offline reload is not guaranteed (no service worker). Firefox/WebKit, screen reader audits, full accessibility conformance, recruited-user research, native VS Code/Obsidian install checks, and G1 integration/release acceptance remain outside this package's proof. No other agent review is requested, following issue #3.
