# OpenTheme Studio web — live application (OTS-143)

The editor keeps its palette, isolated app overrides, undo/redo, comparison and JSON save/import. Primary actions are **Connect VS Code** and **Connect Obsidian**. Once connected, committed edits, palette changes, undo/redo and imports automatically send the full validated project after a **300 ms** debounce. No download is needed per edit. Preview-only changes (app selection, comparison, studio appearance) do not push a document. ZIP is retained under **Share / advanced → Export theme ZIP**.

## Runnable local demo

Node >=22.12.0; pinned workspace package manager pnpm 10.34.9. From the repository root:

```powershell
npx --yes pnpm@10.34.9 install --frozen-lockfile
npm run dev --prefix apps/web
```

Open **http://127.0.0.1:5173** (http://localhost:5173 is also allowed). The server uses strict port 5173 so it cannot silently move to an origin rejected by the bridge. Close an older Studio server you own if that port is busy. No new dependencies or root lockfile change are required by this package.

### VS Code

1. Install the first-party desktop companion extension from the controller's OTS-142 integration once. This UI package does not install or emulate it.
2. In VS Code run **OpenTheme Studio: Enable Live Sync**, then **Copy pairing code**.
3. In Studio choose **Connect VS Code**, paste the code and choose **Pair, remember and apply**. This explicitly remembers the association for this browser profile and exact Studio address after authentication, and applies the current project. Health alone never marks it connected.
4. Edit a color. The UI waits for the companion's authenticated apply acknowledgment before reporting success. Settings preservation and native restore are the extension's responsibility.
5. **Restore VS Code colors** makes an explicit authenticated restore request and disconnects on confirmation. **Disconnect VS Code** stops future requests, forgets the code and keeps the last colors. After an apply error, **Forget VS Code connection** also clears the retained session. After disconnect use the extension's restore command if needed.

All requests use the fixed 127.0.0.1:43187 endpoint and frozen opentheme.live.v1 full-project wire format. No alternate server, URLs from responses, credentials cookies, redirects or LAN fallback. The browser sends its real Origin; CORS/auth are enforced by the companion. After explicit pairing consent and authenticated success, the credential is saved separately in this browser profile's origin-scoped localStorage. It never enters project JSON, imports/exports, URLs, logs or telemetry. Use the same exact Studio address after restarting the browser: localhost and 127.0.0.1 have separate storage. Obsidian directory handles remain tab-memory-only. Requests time out at 3 seconds and are capped at 256 KiB. Temporary downtime/timeouts/interrupted responses retain pairing and reconnect after 1/2/5/10/30/60-second delays, capped at 60 seconds. Idle health is checked every 10 seconds; recovery always requires authenticated apply. HTTP 401 erases revoked auth. Other origin/protocol/validation rejections pause with instructions, keeping the credential for Reconnect or Forget. A version mismatch accepted by the companion is shown as an explicit unverified compatibility warning.

### Obsidian

1. Use supported local Chromium and **Connect Obsidian**. A real click opens the browser directory picker in read/write mode. Select the vault's **.obsidian configuration directory itself**; a vault root is rejected. If hidden folders are not displayed, enter that exact path in the native picker.
2. Studio creates only **snippets/opentheme-studio.css**. In Obsidian, enable **opentheme-studio** once under **Settings → Appearance → CSS snippets**. Keep the app open. Subsequent successful file saves are automatically reloaded by Obsidian; there is no per-edit export or install.
3. Edit a shared role or an Obsidian-only override. Existing explicit overrides take precedence over shared palette values. The generated snippet uses the existing safe exporter twice to cover both .theme-dark and .theme-light, applying this palette regardless of native appearance mode, without changing appearance.json.
4. **Stop Obsidian sync** stops future writes and leaves the file. **Remove generated snippet** waits for pending work and removes only the named file after verifying its ownership marker and SHA-256 content hash. Manually modified or foreign content is refused, including during reconnect and removal. Move a colliding file to your own backup before reconnecting; Studio never overwrites it for you.

Only the named target CSS file is read to verify ownership; other snippets, appearance.json and vault notes are never opened by the product. Permission is checked on every operation. Revocation or unsupported browser APIs stop sync with an actionable message; permission is regained through another explicit picker gesture, not a background prompt. Stopping cannot undo a write already committed by the browser; removal/VS Code restore are separate intentional actions.

**Honest status:** VS Code success means the companion confirmed its settings API completed. A saved record or health response alone never means Connected. Shutdown is detected by the next edit or 10-second health check plus request timeout; waiting/recovery is explicit. Folder-connected/snippet-saved status means the browser write completed; the browser cannot detect Obsidian's running state, actual version or snippet enablement. Exact native appearance and Obsidian auto-reload must be verified in the controller's real-app gate. Original illustrative preview labels remain.

## Focused tests and browser demo

```powershell
npm test --prefix apps/web
npm run build --prefix apps/web
npm exec --prefix apps/web -- playwright install chromium
npm run test:browser --prefix apps/web
```

The browser suite starts the built production bundle on the contract's local port. If another process is using IPv4 port 5173, the tests have a non-invasive IPv6 option that keeps the allowed localhost origin:

```powershell
$env:OTS_TEST_IPV6='1'
npm run test:browser --prefix apps/web
```

This starts a separate ::1 listener, uses http://localhost:5173 in Chromium, and pins localhost resolution to ::1 for that test browser. It never kills/reuses another Studio instance. Default CI remains 127.0.0.1:5173.

`tests/live.spec.ts` mocks companion HTTP responses and the directory picker/permission grant. Obsidian file operations then use **actual browser OPFS sandbox files**, not a private vault. It tests gesture activation, exporter CSS changes, undo/palette changes, ownership refusal, revocation and safe removal, alongside origin/auth errors, full-project requests and no per-edit downloads. These are browser/client evidence, **not native VS Code or Obsidian validation**. Screenshots and focused outputs are under output/playwright/live-*; see docs/LIVE_HANDOFF.md for exact final results and limits. No mock companion or picker is shipped in the product.

Local project persistence/JSON schema validation and optional native ZIP exporters remain in the existing modules. No new accounts, cloud, telemetry, runtime assets, injected target CSS mechanisms, notes access, or root tooling changes. Cross-agent reviews and redesign are out of this package; controller owns the single integration/native gate.

## Persistent reconnect — issue #16

Remembering applies only to the trusted local Studio origin and browser profile. Clearing browser/site data, revoking the code in VS Code, or **Disconnect / Forget VS Code connection** ends the association. If storage is blocked/full, the authenticated session stays usable and a warning explains that it cannot survive browser restart. If erasure is blocked, automatic updates stop and the UI asks you to clear site data or revoke the code; it never falsely confirms saved data was removed. Other same-origin tabs observe pairing changes/removal. Closing the page cancels work but preserves the saved association.

Restore remains intentional: requesting it stops automatic application and removes the saved automatic association before contacting the companion. This prevents a lost restore acknowledgment from making the next browser restart reapply colors. A failed restore keeps the code in memory for an explicit retry in that tab; it never automatically reconnects or applies colors. A successful authenticated restore also discards that in-memory code.

`tests/reconnect.spec.ts` covers authenticated reload, temporary downtime/recovery, latest offline edits, revoked/forgotten auth, JSON export isolation, and closing/reopening a real Chromium process with a dedicated test profile. HTTP is mocked: actual extension persistence/restart behavior is Gemini-owned and belongs to the controller's native gate. No connector, shared contract, root configuration, lockfile, Claude layout/style or Obsidian sink change is included. See docs/RECONNECT_HANDOFF.md for exact verification and scope.
