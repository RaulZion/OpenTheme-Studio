# ADR-0001 — local-first browser MVP and release scope

- Date: 2026-11-04
- Status: accepted for G0 candidate on 2026-11-04; GitHub publication pending

## Decision

Use a static browser app (`React + TypeScript + Vite`) with a small `pnpm` workspace, pure TypeScript theme core, application-specific exporters, and downloadable files. Test with Vitest and Playwright. No accounts, database, installed browser extension or cloud processing. Prefer CSS custom properties in the studio, accessible native controls, keyboard navigation and a strong visual preview.

Start with VS Code and Obsidian. Research Blender 5.0 compatibility in parallel, integrating it at G2 after real-app fixture checks.

## Why

Native formats are documented; local-first cuts privacy and hosting complexity; static deployment is simple; separate adapters avoid unsupported injection; visual preview is the unproven differentiator. VS Code and Obsidian offer fundamentally different export needs while keeping the first gate manageable.

## Serious objections

- Palette translation can create bad contrast or unintuitive token assignments. Mitigation: warn users, avoid false guarantees, expose per-app controls.
- A browser mock is not a real instance of the target software. Mitigation: mark it as illustrative and validate exports in actual software before final release.
- A modular codebase may over-engineer a two-app MVP. Mitigation: minimal adapter interface, no dynamic plugin loader and no marketplace before demonstrated demand.
- Building a UI before interviewing users risks perfecting the wrong workflow. Mitigation: schedule discovery interviews and usability tests concurrently with the scaffold, with an explicit pivot gate before major polish.
- Themer already supports multi-app generation. Mitigation: validate direct visual manipulation and precise controls rather than merely copying template generation.

## Consequences

No silent installation or remote publish feature. Exporter packages contain exact files, README installation guidance, compatibility status, and a validation report. Application API differences are not hidden from users.

## Reversal signals

If target users prefer selecting ready-made themes and have no meaningful need to edit, pivot to a theme discovery/curation tool. If the browser preview is routinely misleading, replace its claim of accuracy with guided property inspection and proof screenshot workflow.
