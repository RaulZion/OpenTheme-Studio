# Provisional runner fixtures (OTS-121 addendum)

**PROVISIONAL. Not adapter output, not a supported theme, not verified visually.**

- Palette: `contracts/sample.theme.json` ("Midnight Sea", dark).
- Mapping: provisional, see `docs/research/blender-compatibility.md` §4 and §9. Role meanings
  (for example keywords → `syntax_builtin`, types → `syntax_special`) have not been checked by
  looking at Blender's UI.
- `*.expect.json` lists mechanical round-trip expectations only: the value Blender should hold
  after loading the XML. Channel counts match the native 4.5.15 and 5.0.1 schema dumps
  (`tools/compare_schemas.py`).
- The XML comment inside each fixture is informational; Blender ignores it.
- `extension-*/` copies of the XML must stay byte-identical to `blender-*/` (checked by `cmp`
  during this research; there is no automated check yet).

| Fixture | 4.5.15 LTS | 5.0.1 | 5.2.3 LTS |
|---|---|---|---|
| `blender-4.5/ots_midnight_sea_b45.xml` | **pass**, 33/33, 0 warnings | 6 panel values silently lost (wrong version) | same as 5.0.1 |
| `blender-5.0/ots_midnight_sea_b50.xml` | 5 `panel_*` values lost, 5 `not found` (wrong version) | **pass**, 32/32, 0 warnings | pass, 32/32 |
| `negative/missing_themestyle.xml` | operator fails (`IndexError`) | same | same |
| `negative/b45_only_attributes.xml` | applied, 0 warnings (valid in 4.5) | 3 `not found`, still `FINISHED` | same as 5.0.1 |
| `extension-4.5/` | installed, active after restart | refused | refused |
| `extension-5.0/` | refused | installed, active after restart | refused |

All runs: background mode, 2026-11-04. Visual (GUI) correctness: not checked on any build.
