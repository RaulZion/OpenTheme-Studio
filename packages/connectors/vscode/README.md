# OpenTheme Studio Live Sync (VS Code Companion Extension)

First-party local companion extension providing instant, opt-in live color synchronization between **OpenTheme Studio** and your local Visual Studio Code desktop environment.

Conforms strictly to `contracts/LIVE_SYNC_V1.md` and `docs/decisions/ADR-0004-live-application.md`.

---

## Why Live Sync?

Traditional theme workflows require packaging, installing, and reloading a theme extension on every color change. OpenTheme Studio Live Sync connects the Studio web interface directly to your running VS Code editor over an authenticated loopback connection:

- **Instant live updates:** Color adjustments, palette switches, undo/redo, and project imports apply in real time via the official VS Code Configuration API (`workbench.colorCustomizations` and `editor.tokenColorCustomizations`).
- **Non-destructive:** Unrelated user configuration settings are strictly preserved.
- **Safe rollback:** A dedicated `Restore Original Colors` command safely reverts applied colors back to your pre-sync state without wiping out manual user edits.
- **Local-first security:** Runs entirely on `127.0.0.1:43187` with one-time pairing codes and strict origin checks. No cloud services, accounts, telemetry, or remote code execution.

---

## One-Time Setup & Usage

### 1. Enable Live Sync in VS Code
1. Open Visual Studio Code.
2. Open the Command Palette (`Ctrl+Shift+P` on Windows/Linux, `Cmd+Shift+P` on macOS).
3. Run **`OpenTheme Studio: Enable Live Sync`**.
4. The extension starts a local listener on `127.0.0.1:43187` and generates a 128-bit random pairing code.
5. Click **Copy Pairing Code** on the prompt.

### 2. Connect in OpenTheme Studio
1. In OpenTheme Studio (`http://127.0.0.1:5173`), click **Connect VS Code**.
2. Paste your pairing code into the input dialog and confirm.
3. Once authenticated, the status badge switches to **Connected**.
4. Adjust any color in OpenTheme Studio—your VS Code interface updates immediately.

---

## Available Commands

| Command | Identifier | Description |
|---|---|---|
| **Enable Live Sync** | `opentheme.enableLiveSync` | Starts the authenticated listener on `127.0.0.1:43187` and shows the pairing code. |
| **Regenerate Pairing Code** | `opentheme.regenerateCode` | Generates a new 128-bit pairing secret and invalidates the previous token. |
| **Restore Original Colors** | `opentheme.restoreColors` | Reverts only the colors applied by OpenTheme Studio that still match their last applied values. |
| **Disconnect Live Sync** | `opentheme.disconnect` | Stops the loopback server and deactivates live synchronization. |

---

## Security Boundaries & Guarantees

- **Loopback binding only:** The HTTP server binds exclusively to `127.0.0.1:43187`. Connections from non-loopback addresses are immediately closed.
- **CORS allowlist:** Only requests originating from `http://127.0.0.1:5173` and `http://localhost:5173` are permitted. Wildcards (`*`) are prohibited.
- **Token authentication:** All state-modifying requests (`POST /v1/apply`, `POST /v1/restore`) require an `Authorization: Bearer <token>` header matching the active pairing code. Health checks do not leak the pairing token.
- **Strict schema validation:** Incoming theme payloads are validated against the canonical `contracts/theme.schema.json` specification. Malformed payloads, invalid 6-digit hex values, prototype pollution attempts, or script tags are rejected with HTTP 400.
- **Payload bounded:** Request bodies are capped at 256 KiB; larger payloads trigger HTTP 413.
- **Official Configuration API:** Colors are applied via `vscode.workspace.getConfiguration().update(..., ConfigurationTarget.Global)`. No raw `settings.json` file overwrites, disk patching, or shell execution.

---

## Building and Packaging (.vsix)

To package the extension into an official, installable `.vsix` archive:

```bash
cd packages/connectors/vscode
npm run package
# Outputs: opentheme-vscode-connector-1.0.0.vsix
```

To install the `.vsix` into VS Code:

```bash
code --install-extension opentheme-vscode-connector-1.0.0.vsix
```
