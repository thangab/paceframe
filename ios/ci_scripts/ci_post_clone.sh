#!/bin/bash
set -e
set -x

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

echo "📦 Load asdf Node"
. /Users/local/.asdf/asdf.sh

node -v
npm -v

echo "📦 Install JS deps"
npm ci

echo "📦 Install CocoaPods"
cd ios
if [ -d "Pods" ]; then
  echo "Pods cache hit"
else
  pod install
fi