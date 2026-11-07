# Project charter — 2026-11-04

## Problem and opportunity

Theme creators often face scattered app-specific tools, technical tokens and little preview guidance. OpenTheme Studio aims to give non-technical users a coherent, polished way to customize multiple **opt-in, officially themeable** apps from one place.

## Product hypothesis

For people who use multiple themable apps, click-to-edit controls that **apply directly to the connected installed application** will remove repeated export/install friction. ZIP exports remain a portable-sharing fallback, not the primary workflow. This is a product hypothesis that still requires live-app and participant validation.

## Who it is for

1. People who install ready-made themes and want small adjustments without code.
2. Enthusiasts coordinating aesthetic preferences across several applications.
3. Theme authors creating, exporting and sharing native themes for multiple apps.

These are hypotheses, not yet validated customer segments.

## G1 required user experience

- Choose an application and sample theme, apply one shared semantic palette.
- See an interactive preview and click a supported component to edit its associated color.
- Show basic and advanced controls separately; search token groups.
- Preserve optional app-specific overrides without corrupting the global palette.
- Save/load a portable project document locally and undo/redo changes.
- **Immediately apply color edits to a connected, installed VS Code or Obsidian instance**, with clear connection/setup/error status and no export for each edit.
- Use a first-party VS Code extension through documented settings APIs; use an explicitly authorized Obsidian CSS snippet folder with automatic reload. One-time opt-in setup is allowed; silent app changes are not.
- Keep native package/files and manual installation instructions as an optional portability fallback.
- Explicitly display preview limitations, supported app versions and export warnings.

## G2

- Add Blender only after a version-aware technical spike and real application validation.
- Distinguish Blender 4.5 and 5.0; do not claim universal XML compatibility.

## Not in initial MVP

Account system, hosted gallery, marketplace, payments, unauthorized edits to application config or user notes, direct patching of VS Code settings files, third-party code execution, remote-control servers, and guaranteed pixel-perfect rendering for every application. A user-paired VS Code loopback extension and a user-granted Obsidian `.obsidian/snippets/opentheme-studio.css` file are explicitly in the revised MVP under ADR-0004.

## Quality principles

Visual-first; accessible; responsive; safe native exports; honest compatibility; reliable undo and recoverability; small dependency footprint; tests focused on real export value.

## Success hypotheses to test (not observed metrics)

- At least 8 of 10 recruited target users connect and directly apply a change in VS Code and Obsidian after an initial opt-in setup, without exporting a file for every edit.
- At least 8 of 10 correctly identify where to edit a background, text, and selection color.
- No unsupported export paths, path traversal issues, or untruthful installation instructions.
- Qualitative feedback distinguishes product value from liking a pretty UI.

## Open questions

- Do users want custom themes rather than prepackaged themes, and how often?
- Are cross-app consistent colors worth the extra setup?
- Is user trust in community adapters a gating factor?
- Will users contribute adapters without an extensive plugin API?
- License and brand review before public project promotion.
