# PROVISIONAL — Blender theme spike (OTS-121)

**This is not the Blender adapter or exporter.** It is research tooling and evidence for `docs/research/blender-compatibility.md`. It is not a workspace package (no `package.json`) and nothing imports it. Delete or replace it when the controller accepts a G2 adapter interface.

## Contents

- `scripts/make_fixtures.py`: stdlib-only generator (no Blender) that maps `contracts/sample.theme.json` onto 20 Blender **5.x layout** theme attributes, plus 3 negative fixtures. It stands in for a future TypeScript exporter.
- `scripts/inventory.py`: runs inside Blender. Dumps theme sections, a color-property inventory, and a factory-default XML into the output folder. **Do not commit that XML**: it holds Blender's GPL default theme.
- `scripts/load_check.py`: runs inside Blender. Loads each fixture through `script.execute_preset` and `preferences.theme_install`, then reads the values back.
- `scripts/det_zip.py`: deterministic theme-extension ZIP built with the stdlib.
- `scripts/presets_check.py`: lists `bpy.utils.preset_paths("interface_theme")`.
- `fixtures/`: generated XML, the expected-values JSON, and the provisional `blender_manifest.toml`.
- `results/`: outputs from Blender **5.2.3 LTS** (hash `e13b728c6880`), with scratch paths replaced by `<ISOLATED_SCRATCH>`. `fixture_sha256.txt` holds hashes of the LF-normalized fixture bytes.

## Rerun (isolated; never touches the real Blender profile)

```bash
export BLENDER_USER_RESOURCES=/path/to/empty/scratch/bl_user   # required for isolation
python3 scripts/make_fixtures.py ../../../../contracts/sample.theme.json fixtures
blender --background --factory-startup --offline-mode --python-exit-code 1 --python scripts/inventory.py -- /path/to/out
blender --background --factory-startup --offline-mode --python-exit-code 1 --python scripts/load_check.py -- /path/to/fixtures
blender --factory-startup --offline-mode --command extension validate /path/to/ext_src
```

`load_check.py` writes `load_report.json` to `<fixtures>/../out/`. Results are only valid for the exact build printed in `results/info.json`. **Blender 4.5 LTS and 5.0 have not been run.**
