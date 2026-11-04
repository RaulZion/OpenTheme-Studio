# G0 reproducibility checkpoint — 2026-11-04

## Authority and scope

- Repository: https://github.com/RaulZion/OpenTheme-Studio (public).
- Source baseline: `main` SHA `6853aef636d2d7806d9b4a61256a3672d0a9fdbe`; Git tree `20e54637c31ad3967e9069ba940747bad6c6b561` (42 tracked files).
- Coordinator-owned change branch: `chore/g0-reproducibility`; target: `main`. Review via PR; do not auto-merge.
- State while this document is written: **READY_FOR_PR_REVIEW_PENDING_CI**. The source baseline is published, but G0 is not accepted until the reproducibility PR passes a new CI run against a *committed* lockfile and is reviewed/merged.

## Confirmed evidence

1. Initial GitHub Actions run https://github.com/RaulZion/OpenTheme-Studio/actions/runs/41879459057 finished **success** on `6853aef636d2d7806d9b4a61256a3672d0a9fdbe`.
2. That workflow generated `pnpm-lock.yaml` before testing `corepack pnpm install --frozen-lockfile`. It ran pnpm **10.34.9**. Success was not yet evidence of using a committed lockfile.
3. Downloaded artifact `pnpm-lockfile-candidate`, ID `13347333923`, yielded a 114-byte `pnpm-lock.yaml`, lockfileVersion `9.0`, importer `.` with no dependencies (starter workspace has no actual implementation packages yet). Proposed unchanged on the G0 change branch.
4. Node `npm test`: **3/3 pass** in the isolated local copy of the same published source.
5. Python `python -m unittest discover -s contracts/tests -p 'test_*.py' -v`: **3/3 pass**, including the invalid-input subcases. Initial GitHub Actions job also showed success for both test suites.
6. The replacement G0 workflow on the change branch uses `corepack pnpm install --frozen-lockfile`, tests the existing scripts, exercises implemented workspace test/build scripts with `--if-present`, and fails if installation edits `pnpm-lock.yaml`. It does not generate a new lockfile in CI.

## Still unverified or blocked

- A **fresh PR CI pass** on the committed lockfile must be observed before accepting G0.
- Local `corepack pnpm` could not download the requested tool because the local runtime cannot resolve `registry.npmjs.org` (`EAI_AGAIN`). This is an environment-specific local limitation; GitHub Actions successfully obtained pnpm.
- `main` was reported `protected: false` by GitHub. GitHub's available repository connector does not expose the administrative write action needed to enable branch protection/rulesets; this is an owner follow-up, not a claim of configuration.
- No web application, app-specific exporter, live target-software installation, browser UI verification, participant interview or agent implementation has been performed.
- Runtime build/test commands for future subpackages are currently no-ops where package directories still contain only `.gitkeep` files. Future agent PRs must include real tests and builds for their new packages.

## Required follow-up (dependency order)

1. Open the pull request from `chore/g0-reproducibility` to `main`.
2. Confirm the new `G0 contracts and frozen install` check succeeds against the PR head. Inspect logs on failure.
3. Owner reviews and explicitly authorizes the PR merge; never merge automatically.
4. Verify new `main` SHA and `pnpm-lock.yaml` after merge. This **new SHA**, not the original G0 baseline, becomes the starting commit for Codex, Gemini and Claude.
5. Owner configures GitHub branch protection/ruleset where available: PR requirement, status check `G0 contracts and frozen install`, block force pushes and deletion. Verify readback.
6. Release task prompts by owners and exclusive directories only after the gate above.

## Pre-limit handoff (docs/handoffs/TEMPLATE.md)

- Agent: ChatGPT controller.
- Tasks: OTS-000 and OTS-001 (G0), OTS-002 documented only.
- Branch: `chore/g0-reproducibility`; remote PR/head SHA must be read live after last write.
- Files proposed: `pnpm-lock.yaml`, `.github/workflows/g0-validation.yml`, `README.md`, `docs/tasks/BACKLOG.md`, `prompts/00-chatgpt-orchestrator.md`, this checkpoint.
- Tests run locally: Node 3/3, Python schema 3/3. Original G0 workflow passed; **new PR workflow evidence pending**.
- Scope not authorized: `apps/web/**`, `packages/core/**`, `packages/adapters/**`, all shared canonical contracts and accepted ADRs, `main` direct writes, other agent branches.
- Resume with: GitHub branch SHA and PR checks, verify lockfile/frozen install, then request owner review. Do not claim unattended background work.
