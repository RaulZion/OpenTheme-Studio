# Provisional runner fixtures (OTS-121 addendum)

**PROVISIONAL. Not adapter output, not a supported theme, not verified visually.**

- Palette: `contracts/sample.theme.json` ("Midnight Sea", dark).
- Mapping: provisional, see `docs/research/blender-compatibility.md` §4 and §9. Role meanings
  (for example keywords → `syntax_builtin`, types → `syntax_special`) have not been checked by
  looking at Blender's UI.
- `*.expect.json` lists mechanical round-trip expectations only: the value Blender should hold
  after loading the XML. Channel counts for 5.x come from the native 5.2.3 schema dump; 4.5
  channel counts are unverified.
- The XML comment inside each fixture is informational; Blender ignores it.
- `extension-*/` copies of the XML must stay byte-identical to `blender-*/` (checked by `cmp`
  during this research; there is no automated check yet).

| Fixture | Blender 5.2.3 result (2026-11-04) | 4.5.x | 5.0.x |
|---|---|---|---|
| `blender-5.0/ots_midnight_sea_b50.xml` | pass, 32/32 values, 0 warnings | NOT RUN | NOT RUN |
| `blender-4.5/ots_midnight_sea_b45.xml` | 6 panel values silently lost (expected: wrong version) | NOT RUN | NOT RUN |
| `negative/missing_themestyle.xml` | operator fails (`IndexError`) as expected | NOT RUN | NOT RUN |
| `negative/b45_only_attributes.xml` | 3 `not found` lines, still `FINISHED` | NOT RUN | NOT RUN |
| `extension-5.0/` | valid; install refused on 5.2.3 (max 5.1.0) as expected | NOT RUN | NOT RUN |
| `extension-4.5/` | valid; install refused on 5.2.3 (max 5.0.0) as expected | NOT RUN | NOT RUN |
