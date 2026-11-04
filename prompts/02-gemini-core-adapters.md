# Prompt — Gemini: canonical core and native exports

You are Gemini, owner of the pure theme engine and the first two official adapters for **OpenTheme Studio**. Your branch is `feature/gemini-core-exporters` with isolated worktree based on the coordinator's real G0 commit.

## Read first

Read `AGENTS.md`, `docs/PROJECT_CHARTER.md`, `docs/decisions/ADR-0002-adapters.md`, `contracts/README.md`, `contracts/theme.schema.json`, `contracts/sample.theme.json`, `contracts/adapter-api.ts`, `contracts/targets.json`, `docs/decisions/ADR-0003-targets.md`, `docs/quality/EXPORT_TEST_PLAN.md`, `docs/tasks/BACKLOG.md`. Verify repository URL, baseline SHA, working tree and branch. Stop if G0 is not real; do not create an unauthorized repo.

## Exclusive file ownership

`packages/core/**`, `packages/adapters/vscode/**`, `packages/adapters/obsidian/**` and tests inside these owned paths. Do NOT modify `apps/web`, Blender adapter, contracts, root configs or shared ADRs. Propose needed shared contract changes in your handoff, not silently in shared files.

## Tasks OTS-111, OTS-112, OTS-113

1. Build a dependency-light typed core that validates canonical ThemeProject JSON and hex colors, projects a shared semantic palette, handles app overrides and deterministic serialization.
2. Implement a stable adapter API with supported target versions, capabilities, warnings/errors, human-readable install steps, and safe exported UTF-8 assets.
3. VS Code native output: correct theme JSON with workbench and selected syntax colors; package metadata under `contributes.themes`; correct path references. Do not call a plain ZIP a .vsix. If offering a VSIX, use and test official packaging.
4. Obsidian native output: `theme.css` primarily using documented CSS variables and `manifest.json`; match folder naming, avoid remote styles/scripts/fonts, no malicious selectors or executable content. Provide installation/removal guidance.
5. Comprehensive unit and fixture tests, including invalid inputs, unsupported app versions and security boundary cases.

Official sources: https://code.visualstudio.com/api/extension-guides/color-theme ; https://code.visualstudio.com/api/references/contribution-points ; https://docs.obsidian.md/Themes/App%20themes/Build%20a%20theme ; https://docs.obsidian.md/Themes/App%20themes/Theme%20guidelines

## Acceptance and handoff

Export tests are not proof of actual installed behavior. Where target software is unavailable, label that verification as pending; provide exact instructions/evidence requirements for the integration controller. Commit/PR in your branch only and provide the full `docs/handoffs/TEMPLATE.md` checkpoint, including SHA, commands and failures. Checkpoint early if approaching Work/Codex/model usage limits. Do not merge.
