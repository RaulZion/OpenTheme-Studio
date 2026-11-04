# Work plan, dependencies and gates

All completion flags start as **not done**. No agent is currently running from this generated folder.

## Gate G0 — make the project runnable as a multi-agent repo

| ID | Owner | Task | Acceptance |
|---|---|---|---|
| OTS-000 | ChatGPT | Establish GitHub repo and protected `main`, commit docs and contract baseline | Real URL and commit SHA recorded; no invented repo |
| OTS-001 | ChatGPT | Review ADRs, reconcile API, distribute frozen contracts | Decisions accepted/versioned; branch instructions sent |
| OTS-002 | ChatGPT | UX research plan and interview screener | 12-15 recruit targets and non-leading interview guide drafted; interviews not claimed |

**G0 gate:** all agents read one baseline commit and know ownership, interfaces and output format. Do not create remote implicitly from another agent.

## Gate G1 — two-application, local-first theme editor

| ID | Owner | Task | Acceptance |
|---|---|---|---|
| OTS-101 | Codex | Web UI shell, palette editor, app selection, visual inspector | Keyboard usable; selected preview region maps to supported control |
| OTS-102 | Codex | Illustrative VS Code and Obsidian preview scenes, undo/redo, import/export UX | Honest preview-label; app overrides visible; browser tests |
| OTS-111 | Gemini | Core schema validation, adapter registry, portable project serialization | Valid/invalid fixture tests; safe project names; deterministic data |
| OTS-112 | Gemini | VS Code theme exporter | Valid theme JSON and extension manifest; real VS Code installation test required at gate |
| OTS-113 | Gemini | Obsidian theme exporter | Local-only CSS variable theme and manifest; real Obsidian test required at gate |
| OTS-121 | Claude | Version-aware Blender feasibility research | Official references, fixture plan, 4.5 vs 5.0 matrix and blocker list |
| OTS-122 | Claude | Security and compatibility threat review | Evidence-based and prioritized issues; no changes to others' files |
| OTS-131 | ChatGPT | Integrated contract, build, export tests and proof checklist | Verify combined branch; record gate failures honestly |

**G1 gate:** one palette exported for BOTH VS Code and Obsidian, two independent install checks, documented supported versions, no unverified UI parity assertions. Preview remains labeled illustrative.

## Gate G2 — Blender adapter

| ID | Owner | Task | Acceptance |
|---|---|---|---|
| OTS-201 | Claude | Implement Blender adapter in owned tree, if spike passes | Correct XML and optional official extension ZIP for declared Blender version; real Blender check |
| OTS-202 | ChatGPT | Blender gate and integration | No silent cross-version mapping; tests and compatibility evidence |

## Gate G3 — user research and open-source release

| ID | Owner | Task | Acceptance |
|---|---|---|---|
| OTS-301 | ChatGPT | Evaluate moderated usability sessions | At least 10 actual sessions, anonymized data, task outcomes |
| OTS-302 | Codex | Fix priority UX findings, accessibility check | Evidence-based improvements; no gratuitous visual changes |
| OTS-303 | Gemini | Harden exporters and project schema migration | Regression and deterministic export tests pass |
| OTS-304 | ChatGPT + Claude | Release QA and open-source readiness | Attributions, license, contributor docs, reproducible app checks |

## First agent prompts

- Controller: `prompts/00-chatgpt-orchestrator.md`
- UI: `prompts/01-codex-frontend.md`
- Core/exporters: `prompts/02-gemini-core-adapters.md`
- Blender/QA: `prompts/03-claude-blender-qa.md`

Before these prompts execute, the coordinator must communicate the actual GitHub URL/SHA and whether G0 is accepted. They cannot be assumed from this scaffold.

## G0 public-repository bootstrap status (2026-11-04; verify HEAD and CI)

- `OTS-000`: **PARTIAL** - Public GitHub repository confirmed as `RaulZion/OpenTheme-Studio`. Confirm published `main` SHA and successful frozen pnpm install before releasing coding branches.
- `OTS-001`: **SOURCE CANDIDATE READY** - ADR-0001/0002/0003 accepted, fixture and schema tested, normative adapter types added. Remote HEAD and CI verification are the authoritative checks.
- `OTS-002`: **PARTIAL** - interview guide and 12-15 participant allocation documented; participants not recruited and no interviews performed.
- `OTS-101/102/111/112/113/121/122`: **NOT STARTED** - ownership and prompts prepared, no working branches or handoffs.
- `OTS-131`: **NOT STARTED** - combined integration requires all independent branch outputs and native install evidence.

Before agent dispatch, record published `main` SHA and a generated, committed lockfile with clean `pnpm install --frozen-lockfile` evidence. Root dependency changes belong to the controller only.
