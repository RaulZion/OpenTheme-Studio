#!/usr/bin/env bash
# PROVISIONAL native evidence runner for OpenTheme Studio OTS-121/OTS-122.
#
# Runs every Blender check in a fresh, isolated user profile (BLENDER_USER_RESOURCES) per step,
# so the real Blender preferences, extensions and presets are never read or written.
#
# Usage (Git Bash on Windows, or any POSIX shell):
#   BLENDER=/path/to/blender [PYTHON=python3] packages/adapters/blender/spike/runner/tools/run_native_checks.sh OUT_DIR
#
# OUT_DIR must not exist. Results: OUT_DIR/summary.txt plus one .log/.json per step.
# Expected outcomes per Blender version are documented in docs/research/blender-compatibility.md.
# NOTE: `blender --command extension install-file` exits 0 even when it refuses a package,
# so this script records the output text and never treats exit codes alone as proof.

set -u
BLENDER="${BLENDER:?set BLENDER to the blender executable}"
PYTHON="${PYTHON:-python}"
OUT="${1:?usage: run_native_checks.sh OUT_DIR}"
HERE="$(cd "$(dirname "$0")" && pwd)"
FIX="$HERE/../fixtures"

if [ -e "$OUT" ]; then echo "OUT_DIR must not exist: $OUT" >&2; exit 2; fi
mkdir -p "$OUT/pkg"

native() { if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi; }
fresh() { mkdir -p "$OUT/profile_$1"; export BLENDER_USER_RESOURCES; BLENDER_USER_RESOURCES="$(native "$OUT/profile_$1")"; }
log() { printf '%s\n' "$*" | tee -a "$OUT/summary.txt"; }

run_py() {  # name profile script [args...]
  local name="$1" profile="$2" script="$3"; shift 3
  fresh "$profile"
  "$BLENDER" --background --factory-startup --offline-mode --python-exit-code 1 \
    --python "$(native "$HERE/$script")" -- "$@" > "$OUT/$name.log" 2>&1
  log "[$name] exit=$? $(grep -E 'OTS_' "$OUT/$name.log" | tr '\n' ' ')"
}

ext() {  # name profile extension-subcommand [args...]
  local name="$1" profile="$2"; shift 2
  fresh "$profile"
  "$BLENDER" --background --factory-startup --offline-mode --command extension "$@" > "$OUT/$name.log" 2>&1
  log "[$name] exit=$? $(grep -E 'ERROR|Error|error|invalid|STATUS|Success|created|installed but not found|expected to be installed' "$OUT/$name.log" | tr '\n' ' ')"
}

"$BLENDER" --version > "$OUT/blender_version.txt" 2>&1
VERSION_LINE="$(head -n 1 "$OUT/blender_version.txt")"
log "Blender: $VERSION_LINE"
MAJOR_MINOR="$(printf '%s' "$VERSION_LINE" | sed -n 's/^Blender \([0-9]*\)\.\([0-9]*\).*/\1 \2/p')"
set -- $MAJOR_MINOR
RUN_MIN="$1.$2.0"; RUN_MAX="$1.$(( $2 + 1 )).0"

# 1. Schema of the running build (source of truth for property paths and channel counts).
run_py schema schema rna_theme_schema.py --out "$(native "$OUT/theme-schema.json")"

# 2. Theme XML load through Blender's own preset operator.
run_py check_b50 c50 native_check.py --xml "$(native "$FIX/blender-5.0/ots_midnight_sea_b50.xml")" \
  --expect "$(native "$FIX/blender-5.0/ots_midnight_sea_b50.expect.json")" --report "$(native "$OUT/check_b50.json")"
run_py check_b45 c45 native_check.py --xml "$(native "$FIX/blender-4.5/ots_midnight_sea_b45.xml")" \
  --expect "$(native "$FIX/blender-4.5/ots_midnight_sea_b45.expect.json")" --report "$(native "$OUT/check_b45.json")"
run_py neg_missing_style nms native_check.py --xml "$(native "$FIX/negative/missing_themestyle.xml")" \
  --report "$(native "$OUT/neg_missing_style.json")"
run_py neg_b45_attrs nba native_check.py --xml "$(native "$FIX/negative/b45_only_attributes.xml")" \
  --report "$(native "$OUT/neg_b45_attrs.json")"

# 3. Extension manifest validation and packaging.
ext validate_dir_b50 pkg validate "$(native "$FIX/extension-5.0")"
ext validate_dir_b45 pkg validate "$(native "$FIX/extension-4.5")"
ext build_b50 pkg build --source-dir "$(native "$FIX/extension-5.0")" --output-dir "$(native "$OUT/pkg")"
ext build_b45 pkg build --source-dir "$(native "$FIX/extension-4.5")" --output-dir "$(native "$OUT/pkg")"
ext validate_zip_b50 pkg validate "$(native "$OUT/pkg/ots_midnight_sea_b50-0.0.1.zip")"
ext validate_zip_b45 pkg validate "$(native "$OUT/pkg/ots_midnight_sea_b45-0.0.1.zip")"

# 4. Install + enable each declared-version package (refused outside blender_version_min/max).
for t in b50 b45; do
  ext "install_$t" "inst_$t" install-file -r user_default -e "$(native "$OUT/pkg/ots_midnight_sea_$t-0.0.1.zip")"
  BLENDER_USER_RESOURCES="$(native "$OUT/profile_inst_$t")" "$BLENDER" --background --offline-mode \
    --python "$(native "$HERE/read_theme_state.py")" > "$OUT/state_$t.log" 2>&1
  log "[state_$t] $(grep -E 'OTS_STATE' "$OUT/state_$t.log")"
done

# 5. Negative manifests and unsafe ZIP member names (generated, never committed as binaries).
"$PYTHON" -I "$(native "$HERE/make_negative_packages.py")" "$(native "$OUT/neg")" \
  --theme-xml "$(native "$FIX/blender-5.0/ots_midnight_sea_b50.xml")" --min "$RUN_MIN" --max "$RUN_MAX" > "$OUT/neg_generate.log" 2>&1
for d in "$OUT"/neg/neg_*; do
  [ -d "$d" ] && ext "validate_$(basename "$d")" neg validate "$(native "$d")"
done
ext validate_neg_zip_traversal negzip validate "$(native "$OUT/neg/neg_zip_traversal.zip")"
ext install_neg_zip_traversal negzip install-file -r user_default "$(native "$OUT/neg/neg_zip_traversal.zip")"
log "[zip_traversal_landing] $(cd "$OUT/profile_negzip" && find . -name '*probe*.xml' | sort | tr '\n' ' ')"

log "done"
