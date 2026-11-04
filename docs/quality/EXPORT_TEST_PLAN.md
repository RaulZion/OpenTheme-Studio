# Export and release validation matrix

## Shared checks

- JSON project schema accepts fixture and rejects invalid names, colors and unsafe paths.
- Preserves global tokens and per-app overrides through save/load.
- Idempotent deterministic output bytes for the same input/version.
- Clear warning or error for unsupported version or color role.
- No remote assets, network requests or shell invocation in exported theme packages.
- ZIP member paths are safe and unambiguous; no symlinks or path traversal.
- UI labels illustrative previews; no pixel-accuracy promise absent verification.

## VS Code (G1)

- Manifest `package.json` has valid `contributes.themes` pointing to exported JSON.
- Color IDs conform to official `Theme Color` reference; syntax role rules are tested.
- Extension is actually loaded in a declared VS Code version; if a VSIX is offered, packaging/installation is verified (do not assume a ZIP is directly installable as VSIX).
- Installation and undo/removal instructions are human-readable.

## Obsidian (G1)

- `theme.css` uses documented CSS variables with low-specificity selectors where possible.
- `manifest.json` and theme folder names are consistent.
- No external CSS @import or remote URLs; test theme in a declared Obsidian version.
- Installation and removal instructions are clear and tested.

## Blender (G2)

- Distinct version fixtures for 4.5 and 5.0; fail closed on unknown targets.
- XML theme is accepted by at least one declared target Blender build.
- Theme extension ZIP includes manifest + XML if that packaging route is offered.
- Never claim automatic backward/forward compatibility; migration is nontrivial in 5.0.

## UX QA

- One click from preview to relevant role inspector.
- Keyboard edit, focus management, undo/redo, contrast warning and readable UI.
- Test accessible light/dark palettes and narrow-screen behavior.

All proof must include exact version, commands, machine/browser context, expected and observed result, with screenshots or logs where appropriate. No agents may substitute schema unit tests for actual installation proof.
