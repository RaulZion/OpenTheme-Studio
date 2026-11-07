# Runs INSIDE Blender (background, isolated user dir). Loads generated XML via the official preset path and reads values back.
import bpy, sys, json, os, glob, traceback
fx = sys.argv[sys.argv.index("--") + 1]
pref = bpy.context.preferences
def rna_get(path):
    v = pref.themes[0]
    segs = [s for s in path.split("/") if not s.startswith("Theme")]
    for s in segs:
        v = getattr(v, s)
    return v
def to_hex(vals):
    return "#" + "".join("%02x" % round(x * 255) for x in vals)
def load(fp):
    try:
        r = bpy.ops.script.execute_preset(filepath=fp, menu_idname="USERPREF_MT_interface_theme_presets")
        return {"op_result": sorted(r)}
    except Exception as ex:
        return {"op_result": "EXCEPTION", "error": repr(ex)[:300]}
report = {"version": bpy.app.version_string}
bpy.ops.preferences.reset_default_theme()
default_axis_x = to_hex(pref.themes[0].user_interface.axis_x)
default_panel_back = to_hex(pref.themes[0].user_interface.panel_back)
exp = json.load(open(glob.glob(os.path.join(fx, "expected_*.json"))[0]))
main = glob.glob(os.path.join(fx, "opentheme_*.blender-5x.provisional.xml"))[0]
print("SPIKE_LOAD", os.path.basename(main))
r = load(main)
rows = []
for e in exp:
    got = to_hex(getattr(rna_get(e["path"]), e["attr"]))
    rows.append({"path": e["path"], "attr": e["attr"], "expected": e["expected"], "got": got, "ok": got == e["expected"]})
r["readback_ok"] = sum(x["ok"] for x in rows); r["readback_total"] = len(rows)
r["mismatches"] = [x for x in rows if not x["ok"]]
r["unmapped_kept_default_axis_x"] = (to_hex(pref.themes[0].user_interface.axis_x) == default_axis_x)
report["A_valid_5x"] = r
for name in sorted(glob.glob(os.path.join(fx, "neg_*.xml"))):
    print("SPIKE_LOAD", os.path.basename(name))
    bpy.ops.preferences.reset_default_theme()
    rr = load(name)
    rr["panel_back_after"] = to_hex(pref.themes[0].user_interface.panel_back)
    rr["panel_back_default"] = default_panel_back
    report[os.path.basename(name)] = rr
# Official Install operator path (copies by basename into the *isolated* user presets dir, overwrite default True).
bpy.ops.preferences.reset_default_theme()
try:
    report["install_op"] = sorted(bpy.ops.preferences.theme_install(filepath=main))
except Exception as ex:
    report["install_op"] = "EXCEPTION " + repr(ex)[:300]
dest = bpy.utils.user_resource("SCRIPTS", path=os.path.join("presets", "interface_theme"))
report["installed_presets"] = sorted(os.listdir(dest)) if os.path.isdir(dest) else []
report["install_readback_panel_back"] = to_hex(pref.themes[0].user_interface.panel_back)
report["theme_filepath_after_install"] = os.path.basename(pref.themes[0].filepath)
json.dump(report, open(os.path.join(fx, "..", "out", "load_report.json"), "w"), indent=1)
print("SPIKE_LOAD_DONE")
