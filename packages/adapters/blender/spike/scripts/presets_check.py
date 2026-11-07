import bpy, os
paths = bpy.utils.preset_paths("interface_theme")
found = [os.path.join(p, f) for p in paths for f in sorted(os.listdir(p)) if f.endswith(".xml")]
print("SPIKE_PRESET_PATHS", len(paths)); [print("  ", f.replace(os.environ.get("BLENDER_USER_RESOURCES", "~"), "<ISOLATED_USER>")) for f in found]
