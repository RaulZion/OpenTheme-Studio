# ADR-0004 — Direct, opt-in live changes in installed applications

- Date: 2026-11-07
- Status: **accepted for the next MVP work package** (explicit user correction: exporting/installing on every color change is unacceptable)
- Supersedes: ADR-0001's downloadable-file **primary** UX and its exclusion of theme sync; ADR-0002's no-runtime-target wording **only** for user-approved, documented extension points.
- Unchanged: local-first, open source, no accounts, no cloud, no binary patches, no scraping/replacing application internals, no silent user-setting modification, version and capability evidence, Blender out of this package.

## Problem

The G1 editor produces a ZIP that a person must unpack and install to see each change. The user tried and could not complete the VS Code install. Even correct exports do **not** meet the actual product job: click a color in OpenTheme Studio, see the installed app change promptly.

## Decision

**Direct live application is the primary UX**, with existing ZIP export kept only as an optional fallback/portable-sharing function. No export/download/CLI command is needed for each edit once the target is connected.

**VS Code (first priority):** a *first-party local companion extension* receives a paired, validated color update over a loopback-only endpoint and applies it with the **documented VS Code Extension API**, `workspace.getConfiguration().update(..., ConfigurationTarget.Global)`, to `workbench.colorCustomizations` and, where supported, `editor.tokenColorCustomizations`. Both settings apply live. The extension must preserve unrelated user settings, remember what it changed, and provide a safe Restore/Disconnect command. Never overwrite settings.json on disk, inject CSS into VS Code, launch shell commands from incoming messages, or remotely install an extension.

**Obsidian (same package, separate track):** the browser requests an explicit user-selected `.obsidian` configuration folder via the browser File System Access API on a supported local Chromium-based browser. Within this **user-granted** folder, create/update **only** `snippets/opentheme-studio.css` using the current, safely validated Obsidian CSS exporter. Once the person enables that snippet **once** under Settings → Appearance → CSS snippets, Obsidian automatically reloads it after saves. No per-edit copy, ZIP, community plugin, change to `appearance.json`, or direct vault note access. The UI must make initial setup and permission limitations clear, and offer a safe disconnection/cleanup path. Do not overwrite an existing file without identifying ownership; prefer a backup/recovery flow if a collision exists.

**Studio UI:** status indicator and `Connect VS Code` / `Connect Obsidian` action for first-run setup; after connection, debounced automatic updates (target <500 ms after an edit under typical local conditions), with real success/error feedback. Shared palette, per-app overrides, undo/redo and imports all flow through the same validated full-project state. When disconnected, local edits continue and are never falsely reported as applied. Preserve the existing optional export for share/backup, no longer as the primary call to action.

## VS Code local bridge contract

Version `opentheme.live.v1`; reserve **loopback port 43187** for the desktop companion during the first slice. Endpoint:

- `GET /v1/health` — non-sensitive connection readiness/version; must not return the pairing secret.
- `OPTIONS /v1/apply` — explicit CORS preflight for the approved local Studio origin, including private-network preflight where needed.
- `POST /v1/apply` — JSON body `{ "protocol": "opentheme.live.v1", "appId": "vscode", "targetVersion": "1.144.0", "project": <canonical ThemeProject> }`. `Authorization: Bearer <random pairing secret>`. Returns `{ "ok": true, "appliedCount": number }` only after VS Code's config update resolves; failures return `{ "ok": false, "code": "...", "message": "..." }`.
- `POST /v1/restore` — explicit user-requested restoration, same pairing and origin controls.

The extension generates a high-entropy secret locally (Node `crypto.randomBytes`, at least 128 bits), reveals it only in a deliberate pairing interaction, binds HTTP to `127.0.0.1` (not `0.0.0.0`), permits only explicitly configured local Studio origin(s), never `*` CORS, validates target/schema/allowed color IDs/hex colors and caps request bodies (e.g. 256 KiB). Reject unpaired requests, unknown versions, and non-allowlisted keys. No arbitrary files, paths, JavaScript, CSS, commands or user-controlled URLs are accepted.

The client may remember the pairing secret only for its own local origin and must allow disconnect/forget. Revoke/regenerate in the extension. All networking stays on loopback; users opt in before any change. Handle port already in use without silently switching to an unrelated process.

The VS Code extension may internally reuse `@opentheme/adapter-vscode` to translate a verified project to native color IDs. A false health result or successful network response is **not** proof of actual native settings changes.

## Why not simpler-looking alternatives?

- Browser direct edits to VS Code's `settings.json`: more brittle, risks losing JSON-with-comments and other personal settings; conflicts with no silent configuration patching.
- A `vscode://` URI on **every** edit: causes browser external-protocol confirmations rather than seamless live interaction.
- Electron/Tauri desktop application and global filesystem privileges: larger scope and packaging burden before validating the desired workflow.
- Obsidian community plugin: officially supportable but adds installation and pairing burden when native CSS snippets plus a single user folder grant already support automatic reload.

## Risks and acceptance

- One-time setup is unavoidable without bypassing browser/application security. Describe it accurately, minimize clicks, and do **not** imply zero-setup remote access.
- Scope limit for first slice: Windows + locally running Chromium Studio, desktop VS Code, desktop Obsidian; no guaranteed Firefox/Safari, web/remote VS Code extension host, or mobile support without later validation.
- Target versions from ADR-0003 remain development targets; actual native version test is required before calling the feature verified.
- Test direct VS Code color update **and preservation/restoration of unrelated settings** in a real instance; test live Obsidian snippet auto-reload on a real vault with permission and user enablement. No private vault content or OS profile is uploaded.
- Connect, change, undo, change app, reconnect, network-down and restore behaviors have focused tests. No infinite cross-agent review cycle: each owner delivers one PR and controller runs one integrated gate.
