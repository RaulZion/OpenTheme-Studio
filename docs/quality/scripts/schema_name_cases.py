import json, re, sys
root = sys.argv[1]
S = json.load(open(f"{root}/contracts/theme.schema.json", encoding="utf-8"))
ns = S["properties"]["name"]; pats = [a["pattern"] for a in ns["allOf"]]
ov = S["properties"]["appOverrides"]; keypat = ov["additionalProperties"]["propertyNames"]["pattern"]; colpat = S["$defs"]["color"]["pattern"]
print("name constraints:", ns["minLength"], ns["maxLength"], pats)
def name_ok(n): return ns["minLength"] <= len(n) <= ns["maxLength"] and all(re.search(p, n) for p in pats)
BS = chr(92)
cases = {
    "css_comment_breakout": 'x */ @import url("https://example.invalid/a.css"); /*',
    "path_traversal_posix": "../../evil",
    "path_traversal_windows": f"..{BS}..{BS}evil",
    "windows_reserved": "CON",
    "windows_illegal_chars": 'a:b*?<>|"',
    "trailing_dot_space": "theme. ",
    "xml_markup": '<a href="x">&amp;</a>',
    "bidi_override_U+202E": "abc‮gnp.exe",
}
for k, n in cases.items(): print(f"{k:24s} accepted by schema name rules: {name_ok(n)}")
for k in ["user_interface.panel_back", "user_interface/ThemeUserInterface@panel_back"]:
    print(f"override key {k!r:48s} accepted: {bool(re.search(keypat, k))}")
print("8-digit alpha color '#00000080' accepted:", bool(re.search(colpat, "#00000080")))
