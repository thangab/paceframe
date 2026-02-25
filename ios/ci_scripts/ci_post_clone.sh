#!/bin/bash
set -e
set -x

# repo root
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

echo "📦 Install Node via Homebrew"
brew install node

node -v
npm -v

echo "📦 Install JS deps"
npm install

echo "📦 Install CocoaPods"
cd ios
pod install --repo-update