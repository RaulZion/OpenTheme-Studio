"""PROVISIONAL: compare theme schemas dumped by rna_theme_schema.py (plain Python, OTS-121).

    python -I compare_schemas.py A.json B.json [--fixture-expect F.expect.json ...] [--out diff.json]

Reports property paths only in A / only in B, channel-count (array_length) or type changes,
secure-type differences, and for each fixture expectation file which of its paths are missing
from B or written with a channel count B does not use. Collection items are compared by index.
"""

import argparse
import json
import sys


def load(path):
    with open(path, encoding="utf-8") as fh:
        doc = json.load(fh)
    props = {p["path"]: p for p in doc["properties"]}
    return doc, props


def channels(value):
    return (len(value) - 1) // 2 if value.startswith("#") else None


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("a")
    ap.add_argument("b")
    ap.add_argument("--fixture-expect", nargs="*", default=[])
    ap.add_argument("--out")
    args = ap.parse_args()

    doc_a, a = load(args.a)
    doc_b, b = load(args.b)
    only_a = sorted(set(a) - set(b))
    only_b = sorted(set(b) - set(a))
    changed = [
        {"path": p, "a": [a[p]["type"], a[p].get("array_length")], "b": [b[p]["type"], b[p].get("array_length")]}
        for p in sorted(set(a) & set(b))
        if (a[p]["type"], a[p].get("array_length")) != (b[p]["type"], b[p].get("array_length"))
    ]
    result = {
        "a": doc_a["blender_version_string"], "b": doc_b["blender_version_string"],
        "count_a": len(a), "count_b": len(b), "shared": len(set(a) & set(b)),
        "only_a": only_a, "only_b": only_b, "type_or_channels_changed": changed,
        "secure_types_only_a": sorted(set(doc_a["secure_types"]) - set(doc_b["secure_types"])),
        "secure_types_only_b": sorted(set(doc_b["secure_types"]) - set(doc_a["secure_types"])),
        "fixtures_vs_b": {},
    }
    for fx in args.fixture_expect:
        with open(fx, encoding="utf-8") as fh:
            expect = json.load(fh)["expect"]
        missing, wrong_channels = [], []
        for path, value in expect.items():
            rec = b.get("theme." + path)
            if rec is None:
                missing.append(path)
            elif channels(value) is not None and channels(value) != rec.get("array_length"):
                wrong_channels.append({"path": path, "written": channels(value), "build": rec.get("array_length")})
        result["fixtures_vs_b"][fx.replace("\\", "/").rsplit("/", 1)[-1]] = {
            "paths": len(expect), "missing_in_b": missing, "channel_mismatch_in_b": wrong_channels}

    print("{} -> {}: {} vs {} properties, {} shared, {} only in A, {} only in B, {} type/channel changes".format(
        result["a"], result["b"], result["count_a"], result["count_b"], result["shared"],
        len(only_a), len(only_b), len(changed)))
    print("secure types only in A:", result["secure_types_only_a"], "| only in B:", result["secure_types_only_b"])
    for name, r in result["fixtures_vs_b"].items():
        print("fixture {} vs B: {} paths, missing {}, channel mismatch {}".format(
            name, r["paths"], r["missing_in_b"], r["channel_mismatch_in_b"]))
    if args.out:
        with open(args.out, "w", encoding="utf-8", newline="\n") as fh:
            json.dump(result, fh, indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
