# PROVISIONAL — one-command native runner (OTS-121 addendum)

Second-pass research tooling, same status as the rest of `spike/`: **not the Blender adapter**, no `package.json`, nothing imports it.

It adds what `spike/scripts` does not cover: a **4.5-layout** fixture, theme-extension packages pinned with
`blender_version_min`/`blender_version_max`, negative manifests, a ZIP with unsafe member names, and one script
that runs all checks against any Blender build, each step in a fresh isolated profile. It was used to clear blocker B1
(command-line/background checks) on official 4.5.15 and 5.0.1 builds; GUI checks remain.

```bash
BLENDER="/path/to/blender" PYTHON=python packages/adapters/blender/spike/runner/tools/run_native_checks.sh /tmp/ots-blender-<version>
```

- `OUT_DIR` must not exist; read `OUT_DIR/summary.txt`.
- Do not trust exit codes: `extension install-file` exits 0 even when it refuses a package.
- Never run the extension commands without `BLENDER_USER_RESOURCES` isolation (the script sets it per step): `install-file` writes `userpref.blend` even with `--factory-startup`.
- Fixture XML is hand-written from property identifiers and `contracts/sample.theme.json`; no Blender preset was copied.

| Path | Purpose |
|---|---|
| `fixtures/blender-5.0/`, `fixtures/blender-4.5/` | Same palette in 5.x and 4.5 property layouts + expected read-back values (33 for 4.5, 32 for 5.x). |
| `fixtures/extension-5.0/`, `fixtures/extension-4.5/` | Theme extension sources pinned to `[5.0.0, 5.1.0)` and `[4.5.0, 5.0.0)`. |
| `fixtures/negative/` | Missing `<ThemeStyle>`; 4.5-only attributes. |
| `tools/native_check.py` | In Blender: load one XML via the theme preset operator, read back, capture loader warnings. |
| `tools/rna_theme_schema.py` | In Blender: dump every theme property path and channel count (complete collections). |
| `tools/read_theme_state.py` | In Blender: active theme file and two sample colors. |
| `tools/make_negative_packages.py` | Plain Python: bad manifests and an unsafe-member ZIP, written to a new directory only. |
| `tools/run_native_checks.sh` | Runs everything. |
| `tools/compare_schemas.py` | Plain Python: diff two schema dumps and check fixture paths/channel counts against a build. |
| `results-4.5.15/`, `results-5.0.1/`, `results-5.2.3/` | Sanitized output from official **4.5.15 LTS** and **5.0.1** portable builds and the installed **5.2.3 LTS** (2026-11-04). |
| `schema-diffs/` | Native schema differences 4.5.15 → 5.0.1 and 5.0.1 → 5.2.3. |
