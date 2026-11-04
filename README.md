# OpenTheme Studio (working title)

Open-source, local-first visual theme studio for multiple applications with **officially supported theme APIs and file formats**. The project's value proposition is not simply converting palettes; it is a usable click-to-edit preview, one semantic palette, application-specific refinement, and safe native exports.

**Status as of 2026-11-04: G0 offline candidate.** This is still **not a runnable application**. Contract tests and root JS workspace config are now present; native pnpm dependency install and the GitHub remote are not verified. Codex, Claude and Gemini have not implemented their packages.

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

Adopt the established split **once the project is initialized**: GitHub for source, versioned architecture/contracts/tests, issues and PRs; Google Drive Project Diary for coordination, checkpoints and handoffs. A Google Drive folder has been created under `OpenTheme Studio`, but no code should be duplicated there. No GitHub remote URL is defined yet; a coordinator must explicitly create/identify it before branch-based implementation.

## Project links

- Google Drive project folder: https://drive.google.com/drive/folders/1gqlV0qy_7ZnL1CeBcMCVHfivAXeuwiTU
- Google Drive Project Diary folder: https://drive.google.com/drive/folders/1Sy1wQqHtl8SwN3I3i1l5EZekfUFIzXlN
- Research folder: https://drive.google.com/drive/folders/1eVQnrJhA8caNqpkRLDdTbPVAKB1vspNR
- GitHub remote: **not created / not configured**. A local offline candidate commit is not a published baseline.

## G0 contract candidate

- Accepted architectural decisions: `ADR-0001`, `ADR-0002`, `ADR-0003` (candidate pending remote).
- Official test targets: `contracts/targets.json` (not actual installed compatibility).
- Normative adapter types: `contracts/adapter-api.ts`; fixture and JSON Schema in `contracts/`.
- Local checks: `node --test scripts/*.test.mjs` and `python -m unittest discover -s contracts/tests -p test_*.py -v` (the latter requires `jsonschema`).
- Root pnpm workspace is configured, but installation / lockfile verification is pending registry access.

## Immediate next action

Have the ChatGPT orchestrator establish G0 and a GitHub baseline. Then send Codex, Gemini and Claude their prepared prompts. **Do not interpret this scaffold as proof of code, exports, user research, or real-app tests.**
