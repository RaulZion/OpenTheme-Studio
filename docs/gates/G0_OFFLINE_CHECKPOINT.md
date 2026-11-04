# G0 candidate checkpoint - 2026-11-04 (Europe/Rome)

Status: LOCAL_CANDIDATE / REMOTE_BLOCKED. An offline commit may be created from these files, but the G0 gate is not released to parallel coding until published on GitHub.

## Source evidence

- Initial source artifact: `OpenTheme-Studio-starter.zip`, recovered from Google Drive. Archive test had no invalid member and passed ZIP CRC check.
- Two Drive folders have the same project title. Existing README references the older project folder (`1gqlV0qy_7ZnL1CeBcMCVHfivAXeuwiTU`) and its `Project Diary` (`1Sy1wQqHtl8SwN3I3i1l5EZekfUFIzXlN`). The newer duplicate remains untouched. Do not silently delete or merge.
- No configured Git remote was observed in this workspace; GitHub repository lookup produced no matching project repository. No other agents' worktrees were accessed.

## Accepted local decisions

- ADR-0001: React + TypeScript + Vite; pnpm workspace; static local-first, no accounts, only documented native formats.
- ADR-0002: typed, capability-aware, version-locked adapter boundary. `contracts/adapter-api.ts` is normative. Arbitrary custom overrides are untrusted until adapter validation.
- ADR-0003: VS Code 1.144.0 stable, Obsidian Desktop 1.15.0 public; Blender 4.5 LTS/5.0 technical research only. Release-note checks are not actual installed tests.

## Candidate validation

- `npm test`: 3 Node built-in tests passed. Tests check root JS metadata, semantic fixture shape and version target metadata, NOT complete JSON Schema validation.
- `python -m unittest discover -s contracts/tests -p 'test_*.py' -v`: 3 test methods passed; 10 malformed input subcases rejected with JSON Schema Draft 2020-12 validator 4.26.0.
- `corepack pnpm --version` initially failed because runtime DNS could not reach registry.npmjs.org (`EAI_AGAIN`); no pnpm install, lockfile or full workspace build was demonstrated.
- No VS Code / Obsidian / Blender theme was generated or installed; no browser screenshots, actual user interviews or agent PRs exist.

## Outstanding gate items

1. Create a real, empty **public** GitHub repository, without README or other bootstrap files, and publish this exact candidate commit to `main`. Record GitHub URL + observed remote SHA.
2. On a networked development machine run `corepack enable`, `corepack pnpm --version`, and `corepack pnpm install --lockfile-only` (pin committed lockfile). Controller must verify subsequent `pnpm install --frozen-lockfile` and Node test scripts before releasing parallel agents.
3. Confirm or set branch protection / PR review rule for `main`; connector permissions may not support this, so record actual result.
4. Start real participant recruitment using `docs/research/RECRUITMENT_SCREEN.md`, without claiming responses before they exist.
5. Release agent prompts from the **published** baseline only. Never treat local candidate SHA as a GitHub SHA until verified remotely.

## Exclusive parallel slots (not released)

- Codex `OTS-101/102`, `feature/codex-ui-mvp`, only `apps/web/**`.
- Gemini `OTS-111/112/113`, `feature/gemini-core-exporters`, only `packages/core/**`, `packages/adapters/vscode/**`, `packages/adapters/obsidian/**`.
- Claude `OTS-121/122`, `research/claude-blender-compat`, only `docs/research/blender-compatibility.md`, `packages/adapters/blender/**`, and new files in `docs/quality/**` that do not overwrite test plan.
- Controller `OTS-000/001/002/131`: root configs, canonical contracts, cross-agent integration, and Drive diary.

## Pre-limit resumption

Start from this document and `docs/handoffs/TEMPLATE.md`. Verify `git status --short --branch`, `git rev-parse HEAD`, `git branch --show-current`, `git remote -v`, tests, GitHub remote URL and actual `main` SHA. Do not merge branches or claim native parity without installed proof. Next smallest action: connect the repository after the user creates it, then publish and verify G0.
