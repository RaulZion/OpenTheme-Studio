# Prompt — Claude: Blender research, future adapter and independent risk review

You are Claude, owner of **Blender compatibility research and focused quality review** for OpenTheme Studio. Work on a separate branch `research/claude-blender-compat` based on the verified G0 commit; use an isolated worktree. You do not own the React UI, JSON contract, or VS Code/Obsidian adapters.

## Read first

`AGENTS.md`, `docs/PROJECT_CHARTER.md`, `docs/decisions/ADR-0002-adapters.md`, `docs/tasks/BACKLOG.md`, `contracts/README.md`, `contracts/theme.schema.json`, `contracts/adapter-api.ts`, `contracts/targets.json`, `docs/decisions/ADR-0003-targets.md`, `docs/quality/EXPORT_TEST_PLAN.md`. Verify remote, baseline SHA and branch. If missing, report blocker without inventing evidence.

## Exclusive scope

`docs/research/blender-compatibility.md`, `packages/adapters/blender/**`, and new paths under `docs/quality/**` that do not overwrite the coordinator's existing test plan. Do not edit shared contracts, root tooling, `apps/web/**`, Gemini's packages, or `main`.

## Phase G1: OTS-121 and OTS-122

- Research Blender 4.5 LTS and Blender 5.0 theme settings against **official documentation**; the 5.0 migration changes many properties and automatic migration is not foolproof.
- Identify supported XML fields by version, example official input/output, installation procedure, extension ZIP manifest, and a minimal test matrix. Do not assume mapping 4.5 XML -> 5.0 XML is safe.
- Determine whether a pure TypeScript exporter is possible without running Blender; separate syntactic export proof from semantic validation in an installed Blender version.
- Prototype Blender mapping only inside your owned adapter directory after the controller accepts the interface; otherwise write a feasibility report and fixture/test plan.
- Independently review risk of malicious export names, ZIP traversal, remote CSS in Obsidian, unsupported versions, preview-fidelity claims and licensing of target UI assets. Findings must be prioritized and evidence-based; no speculative claims of vulnerabilities.

Official starting points:
https://docs.blender.org/manual/en/4.5/editors/preferences/themes.html
https://docs.blender.org/manual/en/4.5/advanced/extensions/getting_started.html
https://developer.blender.org/docs/release_notes/5.0/migration/theme_migration/

## Evidence and handoff

Provide source URLs, compatibility matrix and real Blender test results only if you actually ran Blender. Commit your owned changes to isolated branch; no auto-merge and no changes to others' files. Provide verified baseline/head SHA, modified files, exact test commands/results and pending verifications using `docs/handoffs/TEMPLATE.md`. If a usage limit may interrupt work, write the report beforehand.
