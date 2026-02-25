#!/bin/bash
set -e
set -x

# aller à la racine repo
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

echo "📦 Load NVM"
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"

echo "📦 Use Node 18"
nvm install 18
nvm use 18

node -v
npm -v

echo "📦 Install JS deps"
npm install

echo "📦 Install CocoaPods"
cd ios
pod install --repo-update