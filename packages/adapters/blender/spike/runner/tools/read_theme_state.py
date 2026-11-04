"""PROVISIONAL: print the active theme file and two sample colors (runs INSIDE Blender, OTS-121).

Used after `extension install-file -e` to confirm, in a fresh launch of the same isolated
profile, that the theme extension was applied and persisted.
"""

import json

import bpy


def _hex(seq):
    return "#" + "".join("{:02x}".format(round(c * 255)) for c in seq)


theme = bpy.context.preferences.themes[0]
print("OTS_STATE=" + json.dumps({
    "blender_version_string": bpy.app.version_string,
    "theme_filepath": theme.filepath,
    "text_editor.space.back": _hex(theme.text_editor.space.back),
    "user_interface.wcol_regular.inner": _hex(theme.user_interface.wcol_regular.inner),
}))
