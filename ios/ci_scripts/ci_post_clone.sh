#!/bin/bash
set -e
set -x

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

export PATH="/opt/homebrew/bin:$PATH"

echo "📦 Node"
node -v
npm -v

echo "📦 Install JS deps"
npm ci

echo "📦 CocoaPods"
cd ios

if [ -d "Pods" ]; then
  echo "Pods cache hit"
else
  pod install
fi