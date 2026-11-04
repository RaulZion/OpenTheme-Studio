"""PROVISIONAL: dump the theme property schema of the running Blender build (OTS-121). Runs INSIDE Blender.

Walks preferences.themes[0] and preferences.ui_styles[0] through RNA and writes one JSON
record per leaf property: dotted path, RNA struct, type, array length, subtype, enum items.
The result is the per-version source of truth a future G2 mapper should be generated from
(bundled preset XML files and static source parsing proved unreliable for channel counts).

    BLENDER_USER_RESOURCES=<empty scratch dir> \
    blender --background --factory-startup --offline-mode --python-exit-code 1 \
            --python rna_theme_schema.py -- --out schema-<version>.json
"""

import json
import sys

import bpy


def walk(obj, prefix, out, seen_types):
    rna = obj.bl_rna
    for prop in rna.properties:
        pid = prop.identifier
        if pid in {"rna_type", "name", "filepath"}:
            continue
        path = prefix + pid
        if prop.type == "POINTER":
            child = getattr(obj, pid)
            if child is not None:
                walk(child, path + ".", out, seen_types)
        elif prop.type == "COLLECTION":
            coll = getattr(obj, pid)
            out.append({"path": path, "struct": rna.identifier, "type": "COLLECTION", "length": len(coll)})
            for i, item in enumerate(coll):
                walk(item, "{}[{}].".format(path, i), out, seen_types)
        else:
            rec = {"path": path, "struct": rna.identifier, "type": prop.type,
                   "array_length": getattr(prop, "array_length", 0), "subtype": prop.subtype}
            if prop.type == "ENUM":
                rec["enum_items"] = [i.identifier for i in prop.enum_items]
            out.append(rec)
        seen_types.add(rna.identifier)


def main(argv):
    out_path = argv[argv.index("--out") + 1]
    bpy.ops.preferences.reset_default_theme()
    prefs = bpy.context.preferences
    records, types = [], set()
    walk(prefs.themes[0], "theme.", records, types)
    walk(prefs.ui_styles[0], "style.", records, types)
    doc = {
        "blender_version_string": bpy.app.version_string,
        "blender_version": list(bpy.app.version),
        "build_hash": bpy.app.build_hash.decode() if isinstance(bpy.app.build_hash, bytes) else bpy.app.build_hash,
        "struct_types": sorted(types),
        "secure_types": sorted(getattr(bpy.types.USERPREF_MT_interface_theme_presets, "preset_xml_secure_types", []) or []),
        "properties": records,
    }
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=1, sort_keys=True)
    print("OTS_SCHEMA_DUMP properties={} structs={}".format(len(records), len(types)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []))
