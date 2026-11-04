# G1 export risk checklist (OTS-122)

- Date: 2026-11-04. Owner: Claude. Advisory, per issue #3: only a reproducible serious failure in real exporter output affects acceptance.
- Scope: the frozen contract (`contracts/**`, base `06eda81`), ADR-0001/0002/0003 and `docs/quality/EXPORT_TEST_PLAN.md`. **No other agent's branch or PR was read.** Each item below is a check for the integration gate, not a claim that a defect exists.
- Severity: **P1** = becomes an integration blocker *if* the gate reproduces it in exporter output (unsafe path, remote code or CSS, invalid native format, false install claim). **P2** = backlog unless reproduced.

## Evidence about the frozen schema (run 2026-11-04)

Each schema rule for `name` was checked with Python `re` against the patterns in `contracts/theme.schema.json` (length 1–100, `\S`, no C0 controls or DEL). Script: `docs/quality/scripts/schema_name_cases.py` (`python docs/quality/scripts/schema_name_cases.py .`). The local `jsonschema` package is not installed, so the repo's own schema unit tests were left to CI.

| Value used as `name` | Accepted by schema? |
|---|---|
| `x */ @import url("https://example.invalid/a.css"); /*` | yes |
| `../../evil`, `..\..\evil` | yes |
| `CON`, `a:b*?<>\|"`, `theme. ` | yes |
| `<a href="x">&amp;</a>` | yes |
| `abc` + U+202E + `gnp.exe` (bidi override) | yes |

So `name` is free text by design (contract README: "never used as an unsafe path"). Exporters must treat it as untrusted. Color values are strictly `#RRGGBB`, and override keys are restricted. Both limit the injection surface to names and to how exporters build files.

## Checklist

| # | Sev | Risk | Basis | Gate check / fix |
|---|---|---|---|---|
| 1 | P1 | `name` used in a file path, folder, ZIP member or package id | Schema accepts traversal and Windows-reserved names (table above); ADR-0002 "Sanitize theme/project names used in package metadata and paths" | Build every path and id from `projectId` (already a safe slug). Test: export with each name above, then assert every `ExportFile.path` and ZIP member matches `^[a-z0-9][a-z0-9._-]*(/[a-z0-9][a-z0-9._-]*)*$`. **Obsidian exception:** the theme folder must equal `manifest.json` `name` (see Sources), so either the exported manifest `name` is also the safe slug, or a free-text `name` is validated as one safe path segment and export fails with an error — never sanitize one side only |
| 2 | P1 | `name` placed in a CSS comment or string in `theme.css` | `*/` breakout value above is accepted; ADR-0002 bans `@import` and remote URLs | Leave `name` out of CSS entirely, or strip `*/`, `\`, `<` and newlines. Test: export with the breakout name and assert the CSS contains no `@import`, `url(`, `//`, `\` escapes or `</style` |
| 3 | P1 | Remote or obfuscated CSS in Obsidian output | ADR-0002; EXPORT_TEST_PLAN | Scan the output case-insensitively for `@import`, `url(`, `http:`, `https:`, `expression(` and CSS escapes (`\` followed by a hex digit can spell `@\69mport`). Override values are hex-only (contract test `override_css_injection`) |
| 4 | P1 | `name` concatenated into JSON or XML instead of serialized | XML-markup and quote values above are accepted | Use `JSON.stringify` for `package.json` / `manifest.json`, and XML attribute escaping for Blender (G2). Test: export with `<a href="x">&amp;</a>`, re-parse, and assert the value is unchanged |
| 5 | P1 | Unsafe ZIP members (if a ZIP is offered) | ADR-0002; `ExportFile.path` doc comment | Reject `..`, a leading `/` or `\`, any `\`, drive letters (`C:`), NUL, empty segments, case-insensitive duplicates and symlink mode bits. Deterministic output: sorted members, fixed 1980 timestamp, mode `0100644`. A stdlib stand-in produced byte-identical ZIPs that Blender validated (spike N9). Do not use a target app as the safety check: Blender 5.2.3 `extension validate` accepted members `../x.xml`, `/x.xml`, `C:/x.xml` and `install-file` silently rewrote them (research doc §9 D) |
| 6 | P1 | Export for an unknown or unsupported target version | ADR-0002 "exporters cannot silently target unspecified app versions"; ADR-0003 | `validate()` returns an error and `export()` returns no files for any version not in `supportedVersions`. Test with `""`, `"latest"`, `"1.143.0"`, `"1.15.1"` |
| 7 | P1 | Install steps that cannot work as written | EXPORT_TEST_PLAN; charter | No step claims a plain ZIP is a `.vsix`. Steps name the exact tested version and include removal. Each step is followed once in the native gate (VS Code 1.144.0, Obsidian 1.15.0) |
| 8 | P2 | Version metadata promises more than was tested | ADR-0003 (exact versions only) | `engines.vscode` and Obsidian `minAppVersion` are minimums by design, so the UI and README text must say "tested on X", not "supports X and later" |
| 9 | P2 | Preview presented as exact | ADR-0001/0002; charter G1 | Label previews "illustrative", avoid words like "exact" or "pixel-perfect", and tie any screenshot evidence to a specific app version |
| 10 | P2 | Licensing and trademarks | README (MIT starter); CONTRIBUTING | Don't commit target-app logos, icons or screenshots. Don't vendor Blender's bundled theme XMLs or a factory-default dump into this MIT repo: they come from GPL-licensed Blender (the spike deliberately did not commit its dump). Let users choose the license of exported themes; Blender's platform requires GPL-compatible, and MIT validated (spike N8). Obsidian: "Themes may not contain the word 'Theme'" in their names (Obsidian Manifest reference) |
| 11 | P2 | Bidi or invisible characters in names shown in app UIs | U+202E value accepted | Optionally warn on or strip bidi controls (U+202A–202E, U+2066–2069) in display names |
| 12 | P2 (G2) | Blender silently drops unknown paths, tolerates size mismatches, partly applies a theme when `<ThemeStyle>` is missing, runs `.py` presets, and Install overwrites by file name | Native results N4–N7 on 5.2.3 LTS; installed 5.2 sources | See `docs/research/blender-compatibility.md` §5 and §9 (4.5/5.0 source confirmation, version brackets, `projectId` → extension `id`). Out of G1 scope |

## Sources

- Contract and decisions: `contracts/theme.schema.json`, `contracts/README.md`, `contracts/adapter-api.ts`, `docs/decisions/ADR-0001-mvp.md`, `ADR-0002-adapters.md`, `ADR-0003-targets.md`, `docs/quality/EXPORT_TEST_PLAN.md`.
- Obsidian Manifest reference: https://docs.obsidian.md/Reference/Manifest (theme fields `name`, `version`, `minAppVersion`, `author`).
- Obsidian "Build a theme": https://docs.obsidian.md/Themes/App%20themes/Build%20a%20theme — "The name of the theme directory must exactly match the `name` property in `manifest.json`." (Correction, second pass 2026-11-04: an earlier version of this checklist said no folder-name rule was documented; the Manifest reference page alone does not state it, this page does.)
- Blender evidence: `docs/research/blender-compatibility.md`.
