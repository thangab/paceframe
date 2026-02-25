#!/bin/bash
set -e

echo "📦 Installing node modules"
npm install

echo "📦 Installing CocoaPods"
cd ios
pod install --repo-update