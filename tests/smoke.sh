#!/usr/bin/env bash
# Start the target Cemu in the same Wine prefix, without a game, before running.
# Arguments: Spyro dump, Gill Grunt dump. Only temporary copies are loaded.
set -euo pipefail
cd -- "$(dirname -- "$0")/.."
if test "$#" -ne 2; then
    echo 'Usage: bash tests/smoke.sh /path/to/Spyro.sky /path/to/Gill-Grunt.sky' >&2
    exit 1
fi
export WINEDEBUG=-all
probe() { wine out/De-PerPortal-Probe.exe "$@"; }
initial=$(probe inspect)
empty=$(printf '%s\n' "$initial" | grep -c 'class=Edit text=None ')
if test "$empty" -ne 16; then
    echo 'Smoke test requires all 16 rows empty; no figures changed.' >&2
    exit 1
fi
test_dir=$(mktemp -d "$PWD/out/smoke-XXXXXX")
cp -- "$1" "$test_dir/Spyro test.sky"
cp -- "$2" "$test_dir/Gill Grunt test.sky"
spyro=$(winepath -w "$test_dir/Spyro test.sky")
gill=$(winepath -w "$test_dir/Gill Grunt test.sky")
expect() {
    local expected=$1 text
    shift
    text=$(probe "$@") || return 1
    printf '%s\n' "$text"
    if [[ "$text" != *"$expected"* ]]; then
        echo "Missing expected result: $expected" >&2
        exit 1
    fi
}
expect 'None -> Spyro' load 1 "$spyro"
expect 'None -> Gill Grunt' load 2 "$gill"
# Reject an invalid file before opening a Cemu dialog; keep Spyro attached.
if probe load 1 "$(winepath -w "$PWD/README.md")"; then
    echo 'Invalid file unexpectedly accepted' >&2
    exit 1
fi
expect 'Gill Grunt -> None' clear 2
expect 'Spyro -> Gill Grunt' load 1 "$gill"
expect 'None -> Spyro' load 2 "$spyro"
expect 'Gill Grunt -> None' clear 1
expect 'Spyro -> None' clear 2
cmp -- "$1" "$test_dir/Spyro test.sky"
cmp -- "$2" "$test_dir/Gill Grunt test.sky"
printf 'PASS: two rows, replacement, invalid-file rejection, clear, unchanged dumps. Test copies: %s\n' "$test_dir"
