# Contract v1 (frozen proposal for G0)

The file `theme.schema.json` is the machine-readable project document contract. The file `sample.theme.json` is a valid starter fixture. The coordinator owns all changes to this directory.

## Canonical data

- `schemaVersion`: `1.0.0`.
- `projectId`: stable user-chosen/generated safe id (slug form).
- `name`: human-readable project name; never used as an unsafe path.
- `mode`: `dark` or `light`.
- `tokens`: required global semantic colors, 6-digit sRGB hex.
- `syntax`: optional syntax highlighting roles (comments, keywords, strings, numbers, types).
- `appOverrides`: optional app-id keyed map; app role names are adapter-defined and must be validated before exporting. Does not modify global roles.

## Normative typed adapter boundary

`adapter-api.ts` defines `ThemeProject`, `ThemeControl`, `ColorBinding`, `ThemeAdapter`, `ValidationIssue`, `ExportFile` and `ExportResult` for G1. This is a type-only contract and is not an implementation. `targets.json` identifies official reference versions, not independently verified runtime support.

Codex and Gemini MUST use this boundary without editing `contracts/**` in their branches. If a requirement cannot be expressed, report a precise interface-change request to the controller. `ThemeControl.binding` identifies whether a click edits a shared role, optional syntax color or a single-app override. Unknown override names in the portable schema are not guaranteed capabilities; the adapter must reject unsupported names at export.

On `validate()` errors, `export()` must fail without returning partial output. All paths must be sanitized relative POSIX member names. No JavaScript or shell source supplied by a theme project may be executed.

## Default semantic roles

`canvas`, `surface`, `surfaceRaised`, `text`, `textMuted`, `border`, `accent`, `accentText`, `selection`, `error`, `warning`, `success`.

The `accentText` color is required specifically to avoid assuming light text on every accent. Contrasts must be checked against meaningful surfaces and text roles. Not every application supports every role; `getControls` must indicate capability.
