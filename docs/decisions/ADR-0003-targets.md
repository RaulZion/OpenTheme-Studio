# ADR-0003 - documented target versions and verification policy

- Date: 2026-11-04
- Status: accepted for G0 candidate; GitHub publication pending

## Decision

The exact G1 development/test targets are VS Code 1.144.0 stable (released 2026-10-28) and Obsidian Desktop 1.15.0 public (released 2026-11-02). Blender 4.5 LTS and 5.0 are research targets only for G2. See `contracts/targets.json` for the machine-readable record and official URLs.

An official release note is not application installation proof. Only after successful native installation testing, using version-identifiable evidence, may an adapter version be labeled verified. The target list may be revised via a coordinator-owned contract change and retesting; do not automatically assume all adjacent versions are supported. Obsidian 1.15.1 was early-access as of this decision and is not the public baseline.

Blender 5.0 reorganizes theme properties; do not silently reuse 4.5 mappings.

## Rollback / update

If a selected release cannot be exercised safely, document the reason and propose the nearest public release with explicit supporting evidence. Reaccept this ADR with a clear migration note before changing targets.
