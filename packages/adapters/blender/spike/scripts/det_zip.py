"""Deterministic theme-extension ZIP with stdlib only (stand-in for a TS exporter): sorted members, fixed 1980 timestamp, regular-file mode, no dirs."""
import sys, zipfile
src, out = sys.argv[1], sys.argv[2]
members = ["blender_manifest.toml", "opentheme_midnight_sea.xml"]
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for m in sorted(members):
        assert "/" not in m and "\\" not in m and ".." not in m and ":" not in m
        zi = zipfile.ZipInfo(m, date_time=(1980, 1, 1, 0, 0, 0)); zi.external_attr = 0o100644 << 16; zi.compress_type = zipfile.ZIP_DEFLATED
        z.writestr(zi, open(f"{src}/{m}", "rb").read())
