"""PROVISIONAL: generate negative Blender theme-extension packages for native checks (OTS-121/122).

Plain Python (no Blender needed). Writes ONLY into the given output directory, which must
not exist yet. Files contain harmless placeholder XML; nothing executable is produced.
These cases document how Blender's own validator/installer reacts; an OpenTheme exporter
must reject every one of them itself, before any ZIP is offered for download.

    python -I make_negative_packages.py OUT_DIR --theme-xml FIXTURE.xml \
        --min 5.2.0 --max 5.3.0
"""

import argparse
import os
import sys
import zipfile

MANIFEST = """schema_version = "1.0.0"
id = {id}
version = "0.0.1"
name = {name}
tagline = {tagline}
maintainer = "OpenTheme Studio contributors"
type = "theme"
blender_version_min = "{vmin}"
blender_version_max = "{vmax}"
license = ["SPDX:MIT"]
"""

PROBE_XML = "<bpy>\n  <Theme>\n  </Theme>\n  <ThemeStyle>\n  </ThemeStyle>\n</bpy>\n"

# (directory name, id, name, tagline) - raw TOML right-hand sides, deliberately including bad ones.
MANIFEST_CASES = [
    ("neg_id_hyphen", '"midnight-sea"', '"Midnight Sea"', '"Negative case hyphen id"'),
    ("neg_id_double_underscore", '"midnight__sea"', '"Midnight Sea"', '"Negative case double underscore id"'),
    ("neg_id_trailing_underscore", '"midnight_sea_"', '"Midnight Sea"', '"Negative case trailing underscore id"'),
    ("neg_tagline_punctuation", '"ots_neg_tagline"', '"Midnight Sea"', '"Ends with punctuation."'),
    ("neg_tagline_too_long", '"ots_neg_tagline_len"', '"Midnight Sea"', '"' + "x" * 65 + '"'),
    ("neg_name_leading_space", '"ots_neg_name_space"', '" Midnight Sea"', '"Negative case leading space"'),
    ("neg_name_unescaped_quote", '"ots_neg_quote"', '"Midnight "Sea""', '"Negative case unescaped quote"'),
    ("neg_name_backslash_escape", '"ots_neg_backslash"', '"C:\\new theme"', '"Negative case backslash escape"'),
]

ZIP_MEMBERS = [
    "../ots_traversal_probe.xml",
    "/ots_absolute_probe.xml",
    "sub/../../ots_nested_traversal_probe.xml",
    "C:/ots_drive_probe.xml",
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out_dir")
    ap.add_argument("--theme-xml", required=True)
    ap.add_argument("--min", default="5.2.0")
    ap.add_argument("--max", default="5.3.0")
    args = ap.parse_args()

    os.makedirs(args.out_dir, exist_ok=False)
    with open(args.theme_xml, encoding="utf-8") as fh:
        theme_xml = fh.read()

    for dirname, pid, name, tagline in MANIFEST_CASES:
        d = os.path.join(args.out_dir, dirname)
        os.makedirs(d)
        with open(os.path.join(d, "blender_manifest.toml"), "w", encoding="utf-8", newline="\n") as fh:
            fh.write(MANIFEST.format(id=pid, name=name, tagline=tagline, vmin=args.min, vmax=args.max))
        with open(os.path.join(d, "theme.xml"), "w", encoding="utf-8", newline="\n") as fh:
            fh.write(theme_xml)

    zpath = os.path.join(args.out_dir, "neg_zip_traversal.zip")
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("blender_manifest.toml", MANIFEST.format(
            id='"ots_neg_zip_traversal"', name='"OTS negative zip traversal"',
            tagline='"Negative case traversal member names"', vmin=args.min, vmax=args.max))
        zf.writestr("theme.xml", theme_xml)
        for member in ZIP_MEMBERS:
            # writestr with a ZipInfo keeps the raw (unsafe) name in the archive.
            zf.writestr(zipfile.ZipInfo(member), PROBE_XML)
    print("written:", sorted(os.listdir(args.out_dir)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
