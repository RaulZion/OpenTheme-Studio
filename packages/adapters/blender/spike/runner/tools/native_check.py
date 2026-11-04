"""PROVISIONAL native theme check for OpenTheme Studio (OTS-121). Runs INSIDE Blender.

Loads one theme XML through Blender's own preset path (the same operator the
Preferences "Install..." button and theme extensions use), then reads values back
and reports anything Blender silently skipped.

This is research tooling, not the G2 adapter. Run it only with an isolated user
profile so the real Blender preferences are never touched, for example:

    BLENDER_USER_RESOURCES=<empty scratch dir> \
    blender --background --factory-startup --offline-mode --python-exit-code 1 \
            --python native_check.py -- --xml FIXTURE.xml [--expect FIXTURE.expect.json] \
            --report OUT.json [--dump-default-theme OUT_DEFAULT.xml]
"""

import argparse
import contextlib
import io
import json
import sys

import bpy

WARNING_MARKERS = ("not found", "skipping", "Size Mismatch", "None found")


def _rna_xml():
    # Module was renamed from `rna_xml` (4.5) to `_rna_xml` (5.0+).
    try:
        import _rna_xml as mod
    except ImportError:
        import rna_xml as mod
    return mod


def _to_text(value, expected):
    if isinstance(value, str):
        return value
    seq = list(value)
    channels = (len(expected) - 1) // 2 if expected.startswith("#") else len(seq)
    return "#" + "".join("{:02x}".format(round(c * 255)) for c in seq[:channels])


def _prop_label(theme, path):
    owner_path, _, attr = path.rpartition(".")
    owner = theme.path_resolve(owner_path) if owner_path else theme
    prop = owner.bl_rna.properties.get(attr)
    if prop is None:
        return None
    return {"rna_struct": owner.bl_rna.identifier, "name": prop.name, "description": prop.description,
            "array_length": getattr(prop, "array_length", 0), "subtype": prop.subtype}


def main(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument("--xml", required=True)
    parser.add_argument("--expect")
    parser.add_argument("--report", required=True)
    parser.add_argument("--dump-default-theme")
    args = parser.parse_args(argv)

    prefs = bpy.context.preferences
    report = {
        "blender_version_string": bpy.app.version_string,
        "blender_version": list(bpy.app.version),
        "build_hash": bpy.app.build_hash.decode() if isinstance(bpy.app.build_hash, bytes) else bpy.app.build_hash,
        "factory_startup": bpy.app.factory_startup,
        "user_config_dir": bpy.utils.resource_path("USER"),
        "xml": args.xml,
    }

    bpy.ops.preferences.reset_default_theme()

    if args.dump_default_theme:
        menu = bpy.types.USERPREF_MT_interface_theme_presets
        _rna_xml().xml_file_write(bpy.context, args.dump_default_theme, menu.preset_xml_map)
        report["default_theme_dump"] = args.dump_default_theme

    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            result = bpy.ops.script.execute_preset(
                filepath=args.xml, menu_idname="USERPREF_MT_interface_theme_presets")
        report["operator_result"] = sorted(result)
    except Exception as ex:  # report, do not hide
        report["operator_result"] = ["EXCEPTION"]
        report["exception"] = "{}: {}".format(type(ex).__name__, ex)
    log = buf.getvalue().splitlines()
    report["loader_warnings"] = [line for line in log if any(m in line for m in WARNING_MARKERS)]
    report["theme_filepath_after"] = prefs.themes[0].filepath

    mismatches, checked, labels = [], {}, {}
    if args.expect:
        with open(args.expect, encoding="utf-8") as fh:
            expect = json.load(fh)["expect"]
        theme = prefs.themes[0]
        for path, want in expect.items():
            try:
                got = _to_text(theme.path_resolve(path), want)
            except Exception as ex:
                got = "<unresolvable: {}>".format(ex)
            checked[path] = got
            labels[path] = _prop_label(theme, path) if not got.startswith("<unresolvable") else None
            if got.lower() != want.lower():
                mismatches.append({"path": path, "expected": want, "actual": got})
    report["checked"] = checked
    report["rna_labels"] = labels
    report["mismatches"] = mismatches
    report["pass"] = (report["operator_result"] == ["FINISHED"] and not mismatches
                      and not report["loader_warnings"])

    with open(args.report, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=1, sort_keys=True)
    print("OTS_NATIVE_CHECK pass={} mismatches={} warnings={} result={}".format(
        report["pass"], len(mismatches), len(report["loader_warnings"]), report["operator_result"]))
    return 0 if report["pass"] else 1


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    sys.exit(main(argv))
