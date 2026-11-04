# Blender theme compatibility — feasibility spike (OTS-121)

- Date: 2026-11-04 (Europe, UTC+01:00)
- Owner: Claude, branch `research/claude-blender-compat`, base `06eda81c59d46e7ff3abb5977a041ff00e86552c`
- Status: **research only**. No Blender adapter or exporter exists. Issue #3 keeps Blender out of G1.
- Spike files: `packages/adapters/blender/spike/` (all of it is **provisional**)

## 1. Verdict

| Question | Answer | Evidence level |
|---|---|---|
| Can a pure TypeScript exporter write Blender theme XML without running Blender? | **Yes.** The format is plain XML: elements named after RNA properties, colors as hex attributes. A stdlib-only Python generator produced files that Blender 5.2.3 LTS loaded with 20/20 values read back exactly. | Native (5.2.3 LTS) |
| Can one mapping serve 4.5 LTS and 5.x? | **No.** 5.0 moved many per-editor settings into shared `user_interface` / `regions` settings, and Blender skips unknown paths without any error. | Official migration doc, plus native proof of the silent skip on 5.2.3 LTS |
| Does a successful load prove the theme is correct? | **No.** Blender reports `FINISHED` even when whole elements are ignored. The exporter must check every path it writes against a per-version allowlist. | Native (5.2.3 LTS) and the 5.2 source |
| Is the theme extension ZIP route viable? | **Yes on 5.2.3 LTS**: `extension validate`, `build`, `validate <zip>` and `install-file` all succeeded, and a stdlib-built deterministic ZIP also validated. | Native (5.2.3 LTS) |
| Are Blender 4.5 LTS or 5.0 verified? | **No. Neither was run.** Only Blender 5.2.3 LTS is installed on the test machine. | — |

**Recommendation for G2:** build per-version mapping tables (one for the 4.5 layout, one for the 5.x layout), each generated from a property inventory dumped from that exact Blender build, and refuse unknown targets. Never convert 4.5 XML to 5.x XML. Get a native load + GUI check on every declared target before calling it verified.

## 2. Documentary findings (official sources, not native proof)

1. **Install and save (4.5 and 5.0 manual, same text in both).** Preferences ▸ Themes has Theme Presets, Add Theme, Remove Theme, Save Theme, **Install** ("Load and apply a Blender XML theme file and add it to the list of theme presets") and **Reset**. Saved themes go to `./scripts/presets/interface_theme/` under a user configuration directory. [S1] [S2]
2. **User directory.** On Windows this is `%USERPROFILE%\AppData\Roaming\Blender Foundation\Blender\<series>\`. `BLENDER_USER_RESOURCES` can point Blender at a different user directory. [S5]
3. **Theme extension package.** A theme extension needs only `blender_manifest.toml` plus the `.xml` file. The archive may wrap them in one folder. Required manifest keys: `schema_version` ("1.0.0"), `id`, `version` (semver), `name`, `tagline` (at most 64 characters, no closing punctuation), `maintainer`, `type = "theme"`, `blender_version_min` (at least "4.2.0") and `license` (SPDX list). `blender_version_max` is optional and *exclusive*: it names the first version that is not supported. Empty values are not allowed. CLI: `blender --command extension build | validate [path|zip]`. [S3]
4. **License for themes.** The Extensions Platform recommends GPL-3.0-or-later for themes but accepts "any GPL-compatible license". Add-ons must be GPL-3.0-or-later. [S4]
5. **Installing from the command line:** `blender --command extension install-file -r REPO [-e] [--no-prefs] FILE`. [S6]
6. **5.0 theme migration.** [S7]
   - Panels: new shared `user_interface.panel_header/panel_back/panel_sub_back/panel_title/panel_text/panel_outline`. Old per-editor paths are gone, e.g. `themes[0].view_3d.space.panelcolors.back` → `themes[0].user_interface.panel_back` and `...panelcolors.header` → `user_interface.panel_header`. Panel title and text used to inherit each editor's Title and Text colors.
   - Widgets: new "Outline Selected" on every widget. Sidebar tabs now use `wcol_tab`.
   - Regions: Asset Shelf, Channels, Scrubbing/Markers and Toolbar/Sidebars are now shared regions. For sidebars, alpha is used when region overlap is on.
   - Animation: "Current Frame" is now "Playhead", "Channel" and "Channels" swapped meanings, "Track"/"Track Selected" were removed.
   - 3D Viewport: Vertex/Edge Bevel merged into "Bevel"; Freestyle Edge/Face Mark merged into "Freestyle"; "Active Spline" and "Face Dot Selected" were removed; some geometry colors were **reset to defaults** in 5.0.
   - Node headers now use the exact theme color with no dimming.
   - Migration: the only tool mentioned is a community "Theme Updater" add-on, described as "not a foolproof method". The page tells authors to recreate themes in 5.0 or newer and check them visually. It lists no official automatic migration.

## 3. Native spike (actually run)

**Machine and build:** Windows 11, Blender from Steam, `blender.exe` FileVersion 5.2, and `bpy.app.version_string` = **`5.2.3 LTS`** (hash `e13b728c6880`, built 2026-10-22). No 4.5 or 5.0 executable was available. The Microsoft Store entry `9PP3C07GTVRH` appears in `winget list` with an unknown version, and its executable could not be located.

**Isolation:** every run used `--factory-startup --offline-mode` with `BLENDER_USER_RESOURCES` set to a scratch directory. Blender's own report shows its user scripts, config and extensions paths inside that directory (`results/info.json`). The real `%APPDATA%\Blender Foundation\Blender\5.2` listing and timestamps were identical before and after. Nothing was installed into the real user profile.

| # | Check (exact command shape) | Result on 5.2.3 LTS |
|---|---|---|
| N1 | `blender --background --factory-startup --offline-mode --python-exit-code 1 --python scripts/inventory.py -- <out>` | exit 0; 21 theme sections; walking the RNA (collections sampled at index 0) found 691 properties, 577 of them colors (355 RGB, 222 RGBA). Probes: `user_interface.panel_back` present, `view_3d.space.panelcolors.back` **absent**. |
| N2 | `python make_fixtures.py contracts/sample.theme.json <dir>`, run twice | Files well-formed under `xml.dom.minidom`; the SHA-256 of every fixture was identical across runs (deterministic). |
| N3 | `scripts/load_check.py`: `bpy.ops.script.execute_preset(..., menu_idname="USERPREF_MT_interface_theme_presets")` on the valid fixture | `FINISHED`; **20/20** mapped values read back exactly as hex. An unmapped property (`axis_x`) kept its factory value, so loading resets to the default theme first and then applies the file. |
| N4 | Negative fixture: a 4.5-era `view_3d/.../panelcolors` element plus an unknown attribute | `FINISHED`. The `panelcolors` element was skipped **with no message at all**. The unknown attribute printed only `ThemeUserInterface.opentheme_not_a_property not found` to stdout. Valid siblings were applied. |
| N5 | Negative fixture: an RGB value given for an RGBA property | `FINISHED`. Blender tolerates size mismatches on purpose: it keeps the existing alpha (or truncates extra values). |
| N6 | Negative fixture: no `<ThemeStyle>` element | Exception `IndexError` in `_rna_xml.xml_file_run`, **after** the `<Theme>` part had already been applied, so the theme is left partly applied plus an error. |
| N7 | `bpy.ops.preferences.theme_install(filepath=...)` | `FINISHED`. The file was copied by basename into the isolated `scripts/presets/interface_theme/` and applied; `themes[0].filepath` points to it. |
| N8 | `blender --command extension validate <dir>` → `build --source-dir … --output-dir …` → `validate <zip>` → `install-file -r user_default --enable <zip>` | All exit 0 (`Success parsing TOML`, `created … 892` bytes, `STATUS Installed "opentheme_midnight_sea"`). `license = ["SPDX:MIT"]` and `blender_version_min = "5.0.0"` were accepted. Blender's own `build` writes the current time into the ZIP, so it is not byte-deterministic. |
| N9 | `scripts/det_zip.py` run twice, then `extension validate det1.zip` | Two identical ZIPs (sha256 `7b3df924…c9ca`); Blender validated them. |
| N10 | `scripts/presets_check.py`: list `bpy.utils.preset_paths("interface_theme")` | Shows the bundled `Blender_Dark.xml`/`Blender_Light.xml` and the XML installed in N7. The theme from the **extension** (N8) does not appear through this API. Whether it can be selected in the GUI was **not checked**. |

**Source facts from the installed 5.2 scripts** (read, not run): the loader uses `xml.dom.minidom` and restricts recursion to an allowlist of `Theme*` types (`preset_xml_secure_types`). `script.execute_preset` **runs `.py` presets as Python** (`bpy.utils.execfile`) and loads `.xml` through `_rna_xml`. Install overwrites a same-named user preset by default (`overwrite=True`). The Themes and How to Create Extensions pages read the same in the 4.5 and 5.0 manuals (text compared after extraction).

**Not proven by this spike:** what the theme looks like in the GUI (all checks ran in background mode), any behavior of 4.5 LTS or 5.0, macOS/Linux, and the Theme Updater add-on.

## 4. Mapping matrix (provisional)

Fixture used: `contracts/sample.theme.json`. In the 5.x column, ✔ means the path exists and loaded with exact readback on 5.2.3 LTS. The 4.5 column is **documentary inference only**; nothing was run on 4.5.

| Semantic role | Blender 5.x path (XML element/attribute) | Arity | 4.5 LTS equivalent | Notes |
|---|---|---|---|---|
| `surfaceRaised` | `user_interface/ThemeUserInterface@panel_back` ✔ | RGBA | per editor `<editor>.space.panelcolors.back` [S7] | Path moved in 5.0 |
| `surface` | `user_interface/ThemeUserInterface@panel_header` ✔ | RGBA | per editor `…panelcolors.header` [S7] | Path moved in 5.0 |
| `text` | `user_interface/ThemeUserInterface@panel_text`, `@panel_title` ✔ | RGB | inherited from each editor's `space.text` / `space.title` [S7] | New in 5.0 |
| `canvas` | `user_interface/ThemeUserInterface@editor_border` ✔ | RGB | unverified | Name may differ in 4.5 |
| `accent` | `user_interface/ThemeUserInterface@widget_text_cursor` ✔ | RGB | unverified | |
| `surfaceRaised` | `…/wcol_regular/ThemeWidgetColors@inner` ✔ | RGBA | likely same path (migration page lists only additions to widgets) — unverified | |
| `accent` | `…/wcol_regular/ThemeWidgetColors@inner_sel` ✔ | RGBA | likely same — unverified | |
| `text` | `…/wcol_regular/ThemeWidgetColors@text` ✔ | RGB | likely same — unverified | |
| `accentText` | `…/wcol_regular/ThemeWidgetColors@text_sel` ✔ | RGB | likely same — unverified | |
| `border` | `…/wcol_regular/ThemeWidgetColors@outline` ✔ | RGBA | likely same — unverified | 5.0 adds "Outline Selected" |
| `surface` | `regions/ThemeRegions/sidebars/ThemeRegionsSidebars@back` ✔ | RGBA | per editor in 4.5 [S7] — exact names unverified | Factory alpha is `00` (region overlap). The fixture forced `ff`, which changes behavior. Keep per-property default alpha. |
| `canvas`, `text` | `properties/ThemeProperties/space/ThemeSpaceGeneric@back`, `@text` ✔ | RGB | likely same — unverified | |
| `selection` | `text_editor/ThemeTextEditor@selected_text` ✔ | RGB | likely same — unverified | |
| `comments`, `strings`, `numbers`, `keywords` | `text_editor/ThemeTextEditor@syntax_comment`, `@syntax_string`, `@syntax_numbers`, `@syntax_reserved` ✔ | RGB | likely same — unverified | `keywords` → `syntax_reserved` is a design choice |
| `canvas` | `text_editor/ThemeTextEditor/space/ThemeSpaceGeneric@back` ✔ | RGB | likely same — unverified | |
| `error`, `warning`, `success` | not mapped | — | — | Candidates such as Info editor colors need design and version checks |
| `textMuted` | not mapped | — | — | No obvious single target |

The full 5.2.3 LTS color inventory (property paths and arity) is in `packages/adapters/blender/spike/results/color_inventory.json`. It is the starting point for a 5.x allowlist; a 4.5 inventory must be dumped from a real 4.5 build.

## 5. Exporter constraints for G2 (derived from the evidence above)

1. Separate version tables. Emit only paths from the table for the declared target, and reject unknown targets (contract: `validate()` errors block `export()`).
2. Always write a `<ThemeStyle>` element, even an empty one (N6).
3. Use each property's arity from the inventory: 6 hex digits for RGB, 8 for RGBA. Keep the factory alpha where it carries meaning (sidebars). The current contract color pattern accepts only `#RRGGBB` (see request C1).
4. File names: `opentheme_<projectId>.xml`, built from the safe slug `projectId`, never from `name`. This avoids silently overwriting a user's same-named preset (N7, `overwrite=True`).
5. Emit **only `.xml`**. Never write `.py` presets: `execute_preset` runs them as Python.
6. Escape attribute values as XML (`quoteattr`), although hex-only values leave little to escape.
7. Extension ZIP: build it ourselves (sorted members, fixed 1980 timestamp, regular-file mode, flat paths), then validate it with Blender at the gate. Brackets: 4.5 layout `blender_version_min = "4.2.0"`, `blender_version_max = "5.0.0"`; 5.x layout `blender_version_min = "5.0.0"`. `id` must be a valid identifier (underscores, not hyphens, were used in the spike). Let the user choose the license; MIT validated on 5.2.3 LTS.
8. Install text: XML route Preferences ▸ Themes ▸ Install…, then Save Preferences if auto-save is off. Undo with Remove Theme and Reset. Extension route: Install from Disk, or the `install-file` command. Both routes need native confirmation on each target.

## 6. Blocker list

| ID | Blocker | Blocks | Needed to clear |
|---|---|---|---|
| B1 | No 4.5 LTS or 5.0 executable was run; only 5.2.3 LTS is installed | Any "verified" label for the declared targets | Approval to download official portable builds from download.blender.org, then rerun the spike scripts per build |
| B2 | No GUI visual check (background RNA readback only) | Preview/appearance claims | GUI session per target with version-tagged screenshots |
| B3 | Contract colors are `#RRGGBB` only; Blender RGBA properties need alpha | Faithful region/overlay colors | Controller decision on request C1 |
| B4 | Target identifiers are series ("4.5 LTS", "5.0") while `supportedVersions` expects exact strings. The installed build reports itself as **5.2.3 LTS**, so ADR-0003's Blender targets may be outdated | G2 interface | Controller decision on request C2 (ADR change is controller-owned) |
| B5 | Blender reports success while dropping unknown paths | Trusting Blender's load result as validation | Per-version allowlist check in the exporter plus a readback test like N3 at the gate |
| B6 | Whether a theme installed as an extension can be selected in the theme menu is unverified | Offering the extension route | GUI check after `install-file` |
| B7 | Controller has not accepted a versioned Blender adapter interface | Any adapter code in `packages/adapters/blender` | Explicit acceptance at G2 (issue #3: no Blender exporter before G2) |

## 7. Contract change requests (for the controller; nothing was edited)

- **C1.** Either allow `#RRGGBBAA` for Blender app overrides, or document that the Blender adapter owns alpha per property and users cannot change it.
- **C2.** Define Blender `targetVersion` identifiers by layout and tested build, e.g. `blender-4.5-layout` tested on `4.5.<n> LTS` and `blender-5x-layout` tested on `5.0.<n>` / `5.2.3 LTS`, and review ADR-0003 now that a 5.2 LTS build exists.
- **C3.** Blender override keys fit the existing key pattern as dotted RNA paths (`user_interface.panel_back` is accepted). Confirm that dotted paths are the canonical override key format for Blender.

## 8. Minimal G2 test matrix

| Test | 4.5 LTS | 5.0 | 5.2 LTS (optional) |
|---|---|---|---|
| Inventory dump from that build → allowlist | pending (B1) | pending (B1) | done (N1) |
| Valid fixture loads, 100% readback | pending | pending | done (N3, 20/20) |
| The other version's fixture is rejected by the exporter before export | pending (exporter) | pending (exporter) | — |
| Missing `<ThemeStyle>` never emitted (unit test) | pending (exporter) | pending (exporter) | behavior seen (N6) |
| Extension `validate` + `install-file`, then GUI selection | pending | pending | CLI done (N8); GUI pending (B6) |
| GUI screenshot check | pending | pending | pending (B2) |
| Byte-identical export twice | pending (exporter) | pending (exporter) | stdlib stand-in done (N2, N9) |

## Sources

- [S1] Blender 4.5 Manual, Themes: https://docs.blender.org/manual/en/4.5/editors/preferences/themes.html
- [S2] Blender 5.0 Manual, Themes: https://docs.blender.org/manual/en/5.0/editors/preferences/themes.html
- [S3] Blender 4.5 Manual, How to Create Extensions: https://docs.blender.org/manual/en/4.5/advanced/extensions/getting_started.html (5.0 version checked: https://docs.blender.org/manual/en/5.0/advanced/extensions/getting_started.html)
- [S4] Blender 4.5 Manual, Extension Licenses: https://docs.blender.org/manual/en/4.5/advanced/extensions/licenses.html
- [S5] Blender 4.5 Manual, Directory Layout: https://docs.blender.org/manual/en/4.5/advanced/blender_directory_layout.html
- [S6] Blender 4.5 Manual, Extensions Command Line Arguments: https://docs.blender.org/manual/en/4.5/advanced/command_line/extension_arguments.html
- [S7] Blender 5.0 release notes, Theme Migration: https://developer.blender.org/docs/release_notes/5.0/migration/theme_migration/
- Installed Blender 5.2.3 LTS scripts (read locally): `scripts/modules/_rna_xml.py`, `scripts/startup/bl_operators/presets.py`, `scripts/startup/bl_operators/userpref.py`, `scripts/startup/bl_ui/space_userpref.py`.
