#!/bin/bash
set -e
set -x

echo "📦 Go to repo root"
cd "$(git rev-parse --show-toplevel)"

echo "📦 Install JS deps"
npm install

echo "📦 Install CocoaPods"
cd ios
pod install --repo-update