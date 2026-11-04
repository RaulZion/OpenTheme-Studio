# OpenTheme Studio (working title)

Open-source, local-first visual theme studio for multiple applications with **officially supported theme APIs and file formats**. The project's value proposition is not simply converting palettes; it is a usable click-to-edit preview, one semantic palette, application-specific refinement, and safe native exports.

**Status as of 2026-11-04:** G0 was merged and validated on `main` (`06eda81c59d46e7ff3abb5977a041ff00e86552c`). The first **runnable G1 MVP candidate** is in [integration PR #7](https://github.com/RaulZion/OpenTheme-Studio/pull/7): a visual editor with local JSON save/import and native VS Code/Obsidian theme ZIP downloads. It is not a verified native-compatibility release; target-version installation evidence is still required.

## Start here

1. Read `AGENTS.md` for the binding multi-agent rules.
2. Read `docs/PROJECT_CHARTER.md`, `docs/decisions/ADR-0001-mvp.md`, and `contracts/README.md`.
3. Open `docs/tasks/BACKLOG.md` for gates, ownership and acceptance criteria.
4. Share the relevant file under `prompts/` with each agent. Run `prompts/00-chatgpt-orchestrator.md` first, so that contracts and branches are established.
5. Use `docs/handoffs/TEMPLATE.md` for every merge-ready handoff and `docs/diary/0001-kickoff.md` as the initial diary entry.

## User promise

- No coding knowledge needed to pick, modify, preview and export a theme.
- One project supports several compatible apps while preserving app-specific override controls.
- Never patch app binaries, inject unsupported CSS or scripts, write silently to app directories, or request unnecessary permissions.
- Honest compatibility labels, export guidance and preview-fidelity notes.
- Free, no mandatory account, and open source under the MIT license for the starter files.

## MVP and expansion

| Stage | Scope | Gate |
|---|---|---|
| G0 | Documentation, research plan, shared contract, repo baseline | All agents can read one immutable baseline |
| G1 | Core palette and visual editor, VS Code + Obsidian exporters | Two verifiable native exports |
| G2 | Blender version-aware adapter feasibility and integration | Actual Blender test on explicitly supported version(s) |
| G3 | UX validation, accessibility, polished release | Users complete tasks without technical support |
| Later | Gallery, community adapter ecosystem, public theme publishing | Only after G1-G3 evidence |

## Source-of-truth convention

GitHub is authoritative for source, versioned architecture/contracts/tests, issues and PRs; Google Drive Project Diary is for coordination, checkpoints and handoffs. Do not duplicate code in Drive. The public GitHub repository is `RaulZion/OpenTheme-Studio`. G0 reproducibility is complete on `main`; the G1 integration branch maintains a new pinned lockfile for the UI dependencies. Release acceptance also requires target-application installation evidence; unverified version claims remain explicitly labeled.

## Project links

- Google Drive project folder: https://drive.google.com/drive/folders/1gqlV0qy_7ZnL1CeBcMCVHfivAXeuwiTU
- Google Drive Project Diary folder: https://drive.google.com/drive/folders/1Sy1wQqHtl8SwN3I3i1l5EZekfUFIzXlN
- Research folder: https://drive.google.com/drive/folders/1eVQnrJhA8caNqpkRLDdTbPVAKB1vspNR
- GitHub repository: https://github.com/RaulZion/OpenTheme-Studio (published G0 starter SHA `6853aef636d2d7806d9b4a61256a3672d0a9fdbe`; always verify current `main` before starting).

## G0 contract candidate

- Accepted architectural decisions: `ADR-0001`, `ADR-0002`, `ADR-0003` (versioned in the published baseline).
- Official test targets: `contracts/targets.json` (not actual installed compatibility).
- Normative adapter types: `contracts/adapter-api.ts`; fixture and JSON Schema in `contracts/`.
- Local checks: `node --test scripts/*.test.mjs` and `python -m unittest discover -s contracts/tests -p test_*.py -v` (the latter requires `jsonschema`).
- Root pnpm workspace and frozen-install CI were accepted at G0; the G1 PR includes its own updated committed lockfile for the UI and exporter workspaces.

## Run the integrated MVP candidate

After the G1 integration PR merges, use Node 22.16+ and the pinned pnpm version:

```sh
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @opentheme/web dev
```

Open the localhost URL printed by Vite. Choose VS Code or Obsidian, click a preview region, edit colors, use undo/redo, and download the native theme ZIP. The ZIP includes manual installation instructions. It does **not** install themes automatically and preview scenes are illustrative.

## Immediate next action

Complete the single G1 integration QA in [PR #7](https://github.com/RaulZion/OpenTheme-Studio/pull/7), then merge the verified MVP candidate and separately obtain native install evidence for VS Code 1.144.0 / Obsidian 1.15.0. Blender remains G2, not a blocker for G1.
