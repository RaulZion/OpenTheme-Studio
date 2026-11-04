# Project Diary — Kickoff checkpoint

Date: 2026-11-04
Status: G0 planning and setup; NO app implementation yet.

## Decisions

- Working title: OpenTheme Studio.
- Direction: open source, local-first, visual-first, official native theme formats only.
- MVP: VS Code + Obsidian; Blender research and version-aware adapter as next gate.
- Four roles: ChatGPT orchestrates/contracts/integration, Codex frontend/UX, Gemini core + VS Code/Obsidian adapters, Claude Blender compatibility + risk QA.
- Proposed stack: React/Vite/TypeScript/pnpm, subject to G0 acceptance.

## Verified work

- A bootstrap project package with documentation, JSON schema, fixture, tasks, handoff templates, and four agent prompts has been assembled locally by ChatGPT.
- A Drive root folder `OpenTheme Studio`, with subfolders `Project Diary` and `Research`, has been created by connected Drive tools.
- Documentation reviewed for VS Code, Obsidian and Blender; Blender 5.0 migration flagged as a serious compatibility concern.

## Not done

- No Github remote or PR exists; do not invent URLs, commits, SHA or installation proof.
- No code running, UI, adapter, validation or integration tests.
- No participant recruitment or interviews; no user-level demand measured.
- Codex, Claude and Gemini have NOT been sent prompts by the assistant.

## Next actions

1. Put this documentation scaffold in a new authorized GitHub repository and record exact SHA.
2. Accept/freeze contracts and root config from G0.
3. Send three implementation prompts to agents with actual repo URL/commit.
4. Start discovery research while G1 work proceeds in parallel.
5. Integrate only after handoffs and verified tests.

## Safety checkpoint

If a session or usage budget is running low, write `docs/handoffs/TEMPLATE.md`-compatible report **before** interruption; never wait for a quota failure.
