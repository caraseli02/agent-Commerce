#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
test "$(uname -s)" = Darwin
test "$(uname -m)" = arm64
test "$#" = 1
output=$1
test ! -e "$output"
/usr/bin/swiftc -O -framework Virtualization vm.swift -o "$output"
/usr/bin/codesign --force --sign - --entitlements vm.entitlements.plist "$output"
/usr/bin/codesign --verify --strict "$output"
/usr/bin/shasum -a 256 "$output"
