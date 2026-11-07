# Runs INSIDE Blender (background). Read-only inventory of the theme RNA + factory-default XML dump to scratch.
import bpy, sys, json, os
out = sys.argv[sys.argv.index("--") + 1]
import _rna_xml as rna_xml
th = bpy.context.preferences.themes[0]
inv = {}
def walk(s, path, seen):
    for p in s.bl_rna.properties:
        pid = p.identifier
        if pid in ("rna_type", "name", "filepath"):
            continue
        sub = f"{path}.{pid}" if path else pid
        if p.type == "POINTER":
            v = getattr(s, pid)
            if v is not None and type(v).__name__.startswith("Theme") and (type(v).__name__, v.as_pointer()) not in seen:
                seen.add((type(v).__name__, v.as_pointer())); walk(v, sub, seen)
        elif p.type == "COLLECTION":
            coll = getattr(s, pid)
            inv[sub + "[]"] = {"type": "COLLECTION", "len": len(coll)}
            if len(coll):
                walk(coll[0], sub + "[0]", seen)
        else:
            inv[sub] = {"type": p.type, "subtype": p.subtype, "len": getattr(p, "array_length", 0)}
walk(th, "", set())
colors = {k: v["len"] for k, v in inv.items() if v.get("subtype") in ("COLOR_GAMMA", "COLOR")}
info = {
    "version": bpy.app.version_string, "build_hash": bpy.app.build_hash.decode(),
    "build_date": bpy.app.build_date.decode(), "background": bpy.app.background,
    "user_scripts": bpy.utils.user_resource("SCRIPTS"), "user_config": bpy.utils.user_resource("CONFIG"),
    "user_extensions": bpy.utils.user_resource("EXTENSIONS"),
    "theme_sections": [p.identifier for p in th.bl_rna.properties if p.type == "POINTER"],
    "property_count": len(inv), "color_property_count": len(colors),
    "color_rgb": sum(1 for n in colors.values() if n == 3), "color_rgba": sum(1 for n in colors.values() if n == 4),
    "probe_paths": {p: (p in inv) for p in [
        "user_interface.panel_back", "user_interface.panel_header", "user_interface.panel_text",
        "view_3d.space.panelcolors.back", "view_3d.space.back", "view_3d.space.text",
        "user_interface.wcol_regular.inner", "user_interface.wcol_regular.text",
        "properties.space.back", "text_editor.space.back", "regions.sidebars.back",
    ]},
}
json.dump(info, open(os.path.join(out, "info.json"), "w"), indent=1)
json.dump(colors, open(os.path.join(out, "color_inventory.json"), "w"), indent=0, sort_keys=True)
menu = bpy.types.USERPREF_MT_interface_theme_presets
rna_xml.xml_file_write(bpy.context, os.path.join(out, "factory_default_DO_NOT_COMMIT.xml"), menu.preset_xml_map)
print("SPIKE_INVENTORY_OK", info["version"], info["property_count"], info["color_property_count"])
