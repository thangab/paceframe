#!/bin/bash
set -e
set -x

echo "📦 Setup Node"
if command -v node >/dev/null 2>&1; then
  echo "Node exists"
else
  brew install node
fi

echo "📦 Install JS deps"
npm install

echo "📦 Install CocoaPods"
cd ios
pod install --repo-update