"""Stdlib-only generator (no Blender) standing in for a future TypeScript exporter.
PROVISIONAL: mapping table targets the Blender 5.x theme layout observed in 5.2.3 LTS only."""
import json, sys
from xml.sax.saxutils import quoteattr
sample_path, out_dir = sys.argv[1], sys.argv[2]
p = json.load(open(sample_path, encoding="utf-8"))
t, sx = p["tokens"], p.get("syntax", {})
# (element path, attribute, source color, arity) -- arity 4 => append opaque alpha "ff"
MAP_5X = [
    (("user_interface", "ThemeUserInterface"), "panel_back", t["surfaceRaised"], 4),
    (("user_interface", "ThemeUserInterface"), "panel_header", t["surface"], 4),
    (("user_interface", "ThemeUserInterface"), "panel_text", t["text"], 3),
    (("user_interface", "ThemeUserInterface"), "panel_title", t["text"], 3),
    (("user_interface", "ThemeUserInterface"), "editor_border", t["canvas"], 3),
    (("user_interface", "ThemeUserInterface"), "widget_text_cursor", t["accent"], 3),
    (("user_interface", "ThemeUserInterface", "wcol_regular", "ThemeWidgetColors"), "inner", t["surfaceRaised"], 4),
    (("user_interface", "ThemeUserInterface", "wcol_regular", "ThemeWidgetColors"), "inner_sel", t["accent"], 4),
    (("user_interface", "ThemeUserInterface", "wcol_regular", "ThemeWidgetColors"), "text", t["text"], 3),
    (("user_interface", "ThemeUserInterface", "wcol_regular", "ThemeWidgetColors"), "text_sel", t["accentText"], 3),
    (("user_interface", "ThemeUserInterface", "wcol_regular", "ThemeWidgetColors"), "outline", t["border"], 4),
    (("regions", "ThemeRegions", "sidebars", "ThemeRegionsSidebars"), "back", t["surface"], 4),
    (("properties", "ThemeProperties", "space", "ThemeSpaceGeneric"), "back", t["canvas"], 3),
    (("properties", "ThemeProperties", "space", "ThemeSpaceGeneric"), "text", t["text"], 3),
    (("text_editor", "ThemeTextEditor"), "selected_text", t["selection"], 3),
    (("text_editor", "ThemeTextEditor"), "syntax_comment", sx["comments"], 3),
    (("text_editor", "ThemeTextEditor"), "syntax_string", sx["strings"], 3),
    (("text_editor", "ThemeTextEditor"), "syntax_numbers", sx["numbers"], 3),
    (("text_editor", "ThemeTextEditor"), "syntax_reserved", sx["keywords"], 3),
    (("text_editor", "ThemeTextEditor", "space", "ThemeSpaceGeneric"), "back", t["canvas"], 3),
]
def hexval(c, arity):
    c = c.lower()
    assert len(c) == 7 and c[0] == "#" and all(ch in "0123456789abcdef" for ch in c[1:]), c
    return c + ("ff" if arity == 4 else "")
def build(rows, include_style=True, extra=None):
    tree = {}
    for path, attr, color, arity in rows:
        node = tree
        for seg in path:
            node = node.setdefault(seg, {})
        node.setdefault("@", {})[attr] = hexval(color, arity) if arity else color
    if extra:
        for path, attr, raw in extra:
            node = tree
            for seg in path:
                node = node.setdefault(seg, {})
            node.setdefault("@", {})[attr] = raw
    lines = ["<bpy>", "  <Theme>"]
    def emit(node, depth):
        for name in sorted(k for k in node if k != "@"):
            child = node[name]; pad = "  " * depth
            attrs = child.get("@", {})
            if attrs:
                lines.append(f"{pad}<{name}")
                for a in sorted(attrs):
                    lines.append(f"{pad}  {a}={quoteattr(attrs[a])}")
                lines.append(f"{pad}  >")
            else:
                lines.append(f"{pad}<{name}>")
            emit(child, depth + 1)
            lines.append(f"{pad}</{name}>")
    emit(tree, 2)
    lines.append("  </Theme>")
    if include_style:
        lines.append("  <ThemeStyle>")
        lines.append("  </ThemeStyle>")
    lines.append("</bpy>")
    return "\n".join(lines) + "\n"
def write(name, text):
    with open(f"{out_dir}/{name}", "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
pid = p["projectId"]
# A: valid 5.x partial theme
write(f"opentheme_{pid}.blender-5x.provisional.xml", build(MAP_5X))
# B: 4.5-era path (documented as moved in 5.0) + unknown attribute -> expect silent skip
legacy = [(("view_3d", "ThemeView3D", "space", "ThemeSpaceGradient", "panelcolors", "ThemePanelColors"), "back", t["surfaceRaised"] + "ff"),
          (("user_interface", "ThemeUserInterface"), "opentheme_not_a_property", "#ff00ffff")]
write(f"neg_legacy_paths_{pid}.xml", build(MAP_5X[:2], extra=legacy))
# C: RGB value supplied for an RGBA property
write(f"neg_wrong_arity_{pid}.xml", build([(("user_interface", "ThemeUserInterface"), "panel_back", t["surfaceRaised"], 0)]))
# D: no <ThemeStyle> element
write(f"neg_no_themestyle_{pid}.xml", build(MAP_5X[:2], include_style=False))
json.dump([{"path": "/".join(pa), "attr": a, "expected": hexval(c, ar)} for pa, a, c, ar in MAP_5X],
          open(f"{out_dir}/expected_{pid}.json", "w"), indent=1)
print("fixtures written", len(MAP_5X), "mapped attributes")
