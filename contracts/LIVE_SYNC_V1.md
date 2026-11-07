# G1.1 wire contract — automatic VS Code live color updates

**Controller owned.** All G1.1 code must use this interface; do not add a competing REST server, hidden file patcher, IPC mechanism or app-specific contract without an explicit blocker.

## Deployment and pairing

Studio UI: local `http://127.0.0.1:5173` (also support `http://localhost:5173`); Vite remains the frontend server. VS Code desktop first-party extension: `packages/connectors/vscode/**`, starts an HTTP listener bound ONLY to `127.0.0.1:43187` after a user explicitly enables it.

1. Install the first-party extension **once**.
2. User activates `OpenTheme Studio: Enable Live Sync` in VS Code; extension creates a random secret (min 128-bit entropy) and exposes a **Copy pairing code** interaction. Secret is never returned via health/status.
3. User clicks `Connect VS Code` in Studio, pastes that code once. Studio validates connection with an authorized request, stores the token for the locally running browser session or an explicit opt-in remembered connection, and displays **Connected** only on authenticated success.
4. Subsequent color edits, palette changes, undo/redo and project imports auto-apply after a short debounce while connected; **no download, ZIP or user action per edit**. Render update failures and disconnects visibly.
5. `Disconnect` stops sync and clears the Studio token; the extension also has `Restore original colors` and `Regenerate pairing code` commands. Restoration is intentional and must never overwrite unrelated settings.

Endpoints, JSON UTF-8, short request timeout, 256 KiB max body:

### `GET http://127.0.0.1:43187/v1/health`

A non-sensitive response such as:

```json
{"ok":true,"protocol":"opentheme.live.v1","appId":"vscode","version":"<actual desktop VS Code version>"}
```

No authentication required for health, but health cannot alone set UI state to Connected.

### `POST /v1/apply`

- Header: `Authorization: Bearer <paired random token>`; `Content-Type: application/json`.
- Body (canonical project; editor sends project state, not arbitrary raw setting keys):

```json
{"protocol":"opentheme.live.v1","appId":"vscode","targetVersion":"1.144.0","project":{"schemaVersion":"1.0.0","projectId":"example","name":"Example","mode":"dark","tokens":{},"syntax":{},"appOverrides":{}}}
```

The above project fields are **illustrative**: use full validated `contracts/theme.schema.json` and actual `ThemeProject` rather than treating the empty tokens object as valid.

- Success **only after** VS Code configuration API finishes:

```json
{"ok":true,"appliedCount":12,"version":"<actual version>","warning":null}
```

- Errors: HTTP 400 bad schema/color; 401 bad token; 403 origin not permitted; 409 port/session conflict; 413 too large; 422 incompatible adapter; 500 settings API failure. All: `{"ok":false,"code":"...","message":"..."}`. Do not return secrets or stack traces.
- Reject unknown keys, arbitrary URLs and commands, unsupported color values or attempts to set non-allowlisted VS Code settings. On allowed version mismatches, return explicit warning rather than claiming native compatibility.

### `POST /v1/restore`

Requires authenticated token, explicit UI/extension action and origin checks. Remove/restore **only keys written by OpenTheme Studio and still equal its last applied values**. If the user manually changed a key, preserve it; never reset the entire user preferences object. Return `ok` and restored count.

## Browser security boundary

`OPTIONS` responds with CORS only to an explicitly allowed local Studio origin (default `http://127.0.0.1:5173` and `http://localhost:5173`); never use wildcard `*`. Include any private-network preflight response only for that allowlist. Require bearer auth for mutations regardless of origin. Rate-limit/debounce small, bounded local updates. Bind listener to `127.0.0.1` and stop cleanly when extension deactivates. No insecure network fallback; do not expose HTTP to LAN.

## Native color application

- Map `ThemeProject` through `@opentheme/adapter-vscode` or its vetted versioned mapping.
- Apply workbench colors using `vscode.workspace.getConfiguration().update('workbench.colorCustomizations', mergePreservingUnrelatedKeys(...), vscode.ConfigurationTarget.Global)`.
- Where correctly supported, apply syntax colors via `editor.tokenColorCustomizations` the same way. **VS Code officially applies these settings live.**
- Before the first update, save the affected existing key values using `ExtensionContext.globalState`; track the last written values. Preserve untouched keys and any later user edits; support safe restore after reconnect/restart.
- Do not rewrite on-disk `settings.json`, inject arbitrary code/styles, install downloaded theme files or force-select another user's theme.

## Obsidian browser sink (not part of VS Code HTTP protocol)

Codex owns `apps/web/**` integration with browser File System Access API. User explicitly selects the **`.obsidian` configuration directory**, then the browser can create `snippets/opentheme-studio.css`; never read vault notes or alter `appearance.json`. First save requires user to enable the new snippet once in Obsidian Settings → Appearance → CSS snippets; subsequent saves are auto-reloaded by Obsidian. Use existing native Obsidian exporter CSS. Validate schema and generated text before each write. Include a unique ownership marker and refuse overwriting a preexisting foreign file. Explicitly show browser support/permission errors and provide Stop Sync/Remove Generated Snippet (only when ownership verified).

## Interface acceptance

- Unit tests of invalid token, disallowed origin, oversize input, unsupported keys, settings merge/restore without collateral changes.
- UI tests: disconnected status, authenticated connected, 200–500 ms auto-update after color edit/undo, app overrides isolated, failed POST error; Obsidian folder permission, generated CSS, safe ownership and repeated autosave.
- At least one real VS Code desktop setting changes visually and can be restored; Obsidian snippet enabled in a real vault changes live on update. Exact versions and evidence recorded.
- No manual ZIP workflow in primary user journey; existing export remains available under an optional menu.

References:
- VS Code official: https://code.visualstudio.com/api/extension-guides/color-theme
- VS Code configuration API: https://code.visualstudio.com/api/references/vscode-api
- Obsidian CSS snippets official: https://obsidian.md/help/snippets
- Project ADR: `docs/decisions/ADR-0004-live-application.md`.
