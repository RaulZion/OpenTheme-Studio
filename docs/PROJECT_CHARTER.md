# Project charter — 2026-11-04

## Problem and opportunity

Theme creators often face scattered app-specific tools, technical tokens and little preview guidance. OpenTheme Studio aims to give non-technical users a coherent, polished way to customize multiple **opt-in, officially themeable** apps from one place.

## Product hypothesis

For people who use multiple themable apps, a click-to-edit visual preview with native exports will reduce time and errors relative to manual editing or palette-only generators.

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
- Export **native package/files and install instructions** for VS Code and Obsidian.
- Explicitly display preview limitations, supported app versions and export warnings.

## G2

- Add Blender only after a version-aware technical spike and real application validation.
- Distinguish Blender 4.5 and 5.0; do not claim universal XML compatibility.

## Not in initial MVP

Account system, hosted gallery, marketplace, payments, theme sync to installed apps, file system writes to app config folders, third-party code execution, and guaranteed pixel-perfect rendering for every application.

## Quality principles

Visual-first; accessible; responsive; safe native exports; honest compatibility; reliable undo and recoverability; small dependency footprint; tests focused on real export value.

## Success hypotheses to test (not observed metrics)

- At least 8 of 10 recruited target users complete two native exports in under 12 minutes unassisted.
- At least 8 of 10 correctly identify where to edit a background, text, and selection color.
- No unsupported export paths, path traversal issues, or untruthful installation instructions.
- Qualitative feedback distinguishes product value from liking a pretty UI.

## Open questions

- Do users want custom themes rather than prepackaged themes, and how often?
- Are cross-app consistent colors worth the extra setup?
- Is user trust in community adapters a gating factor?
- Will users contribute adapters without an extensive plugin API?
- License and brand review before public project promotion.
