# UX brief for Codex — visual-first theme editor

## Positioning

A design tool, not a configuration panel. Avoid pages packed with unstructured color inputs, plain JSON viewers, or technical terms without context. No marketing site is required for G1.

## Proposed workspace layout

- Top: project name, undo/redo, save/load, export, help, unsaved state.
- Left: supported applications, scenes, shared palette, theme presets.
- Center (largest area): responsive high-fidelity *illustrative* preview of selected app and clearly clickable regions.
- Right: contextual inspector; color controls for selected region, advanced role mapping and warnings.
- On narrow screens: panels collapse; preview remains usable.

## Three levels

1. Quick: select a prepared palette, automatic semantic mapping.
2. Visual: click preview elements to edit them with clear highlighting.
3. Advanced: find specific supported app tokens and override the mapped value.

## Critical interactions

- Click a visible sidebar background and observe the corresponding control focus/highlight.
- Change global accent and see both app previews react, unless an explicit app override exists.
- Override only Obsidian note background without changing VS Code.
- Undo, redo, reset property, reset app override, compare before/after.
- Export a valid native artifact and view a short, human-readable installation guide.
- Make capability limitations evident but unobtrusive; distinguish simulation from verified appearance.

## Accessibility, responsiveness, safety

- Full keyboard and screen-reader access to theme controls; no color-only status.
- Visible contrast warnings and semantic roles; no false WCAG conformance claims without actual testing.
- Differentiate app logo/icons from owned visual assets; no unlicensed target screenshots in public code.
- A useful theme preview should work offline after initial load, without requiring cloud uploads.

## Testing

For G1, record task completion, time, errors and qualitative confusion for at least 10 recruited users. Recruiting is still outstanding; do not invent research participants or feedback.
