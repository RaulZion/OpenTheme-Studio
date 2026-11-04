# ADR-0002 — adapter capabilities and versioned contract

- Date: 2026-11-04
- Status: accepted on 2026-11-04 (G0 source baseline)

## Principle

One shared **semantic palette**, but not one mythical uniform app UI. Each official adapter declares precisely which app versions and color roles it can edit/export. App-specific overrides are first-class and may be necessary for good results.

## Layering

1. `ThemeProject` (portable canonical JSON, schema-versioned).
2. Core validation and color helpers (pure, dependency-minimal).
3. Adapter registry and versioned capabilities.
4. App-specific mapper, validator and exporter.
5. Browser preview scenes that map visible elements to editable supported token IDs; no runtime injection into real apps.

## Adapter contract (normative outline)

- Stable id, display name, supported app versions, capabilities and unsupported features.
- `getControls(project)`: typed list of editable tokens grouped by app UI area.
- `validate(project, targetVersion)`: structured issues with warning/error severity.
- `export(project, targetVersion)`: deterministic named UTF-8 files or a safe ZIP bundle plus install guide; failed validation blocks unusable exports.
- Version-specific mappers can differ; exporters cannot silently target unspecified app versions.
- Preview scenes explicitly list which controls are approximated and which were verified against screenshots from a specific app version.

## Abuse prevention

- Reject dangerous ZIP member names (`..`, absolute paths, symlinks).
- No user-supplied code execution, shell commands, CSS `@import`, remote fonts or remote URLs in generated Obsidian themes.
- Sanitize theme/project names used in package metadata and paths; bounded names and colors.
- No auto-install and no remote marketplace publish until separately approved.

## Versioning

Canonical project schema `1.0.0` at bootstrap. Every adapter must publish its compatibility map. Real app testing is part of G1/G2 acceptance.
