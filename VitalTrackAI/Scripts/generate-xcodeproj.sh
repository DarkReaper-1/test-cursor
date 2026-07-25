#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v xcodegen >/dev/null 2>&1; then
  echo "error: xcodegen is not installed."
  echo "Install with: brew install xcodegen"
  exit 1
fi

echo "Generating VitalTrackAI.xcodeproj from project.yml…"
xcodegen generate --spec project.yml
echo "Done. Open VitalTrackAI.xcodeproj in Xcode (iOS 17+)."
echo "Package libraries resolve from local Package.swift."
