#!/bin/bash
# Setup script to switch between linked and npm opentui

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

show_usage() {
  cat << EOF
Setup OpenTUI for snapshot testing

Usage: $0 [local|npm]

Options:
  local   Use locally linked opentui (requires ~/ghq/github.com/sst/opentui)
  npm     Use npm-installed opentui with automatic patching

Examples:
  $0 local    # Use linked local opentui (current setup)
  $0 npm      # Switch to npm with postinstall patches

See OPENTUI_SETUP.md for detailed documentation.
EOF
}

setup_local() {
  echo "🔗 Setting up locally linked OpenTUI..."

  # Check if opentui exists
  OPENTUI_PATH="$HOME/ghq/github.com/sst/opentui"
  if [ ! -d "$OPENTUI_PATH" ]; then
    echo "❌ OpenTUI not found at $OPENTUI_PATH"
    echo ""
    echo "To use local opentui:"
    echo "1. Clone: cd ~/ghq/github.com/sst && git clone https://github.com/sst/opentui.git"
    echo "2. Install: cd opentui && bun install"
    echo "3. Apply patches: git apply $SCRIPT_DIR/opentui-test-fixes.patch"
    echo "4. Link packages: cd packages/core && bun link && cd ../react && bun link"
    echo "5. Run this script again"
    exit 1
  fi

  # Update package.json to use linked versions
  echo "  ✓ Updating package.json to use linked packages"
  cat package.json | \
    sed 's/"@opentui\/core": "[^"]*"/"@opentui\/core": "link:@opentui\/core"/' | \
    sed 's/"@opentui\/react": "[^"]*"/"@opentui\/react": "link:@opentui\/react"/' > package.json.tmp
  mv package.json.tmp package.json

  # Link the packages
  echo "  ✓ Linking @opentui/core"
  bun link @opentui/core

  echo "  ✓ Linking @opentui/react"
  bun link @opentui/react

  echo ""
  echo "✅ Local OpenTUI setup complete!"
  echo ""
  echo "Run tests: bash scripts/run-all-snapshots.sh"
}

setup_npm() {
  echo "📦 Setting up npm OpenTUI with patches..."

  # Get latest version
  LATEST_VERSION=$(npm view @opentui/react version)
  echo "  ℹ️  Latest version: $LATEST_VERSION"

  # Update package.json
  echo "  ✓ Updating package.json to use npm packages"
  cat package.json | \
    sed 's/"@opentui\/core": "[^"]*"/"@opentui\/core": "^'"$LATEST_VERSION"'"/' | \
    sed 's/"@opentui\/react": "[^"]*"/"@opentui\/react": "^'"$LATEST_VERSION"'"/' > package.json.tmp
  mv package.json.tmp package.json

  # Add postinstall script if not present
  if ! grep -q '"postinstall"' package.json; then
    echo "  ✓ Adding postinstall hook"
    # This is a simple approach - in production you'd use jq or similar
    echo ""
    echo "⚠️  Please manually add this to your package.json scripts:"
    echo '    "postinstall": "node patch-opentui.js"'
    echo ""
  else
    echo "  ✓ Postinstall hook already exists"
  fi

  # Install
  echo "  ✓ Installing packages"
  bun install

  # Run patch script
  echo "  ✓ Applying patches"
  node patch-opentui.js

  echo ""
  echo "✅ NPM OpenTUI setup complete!"
  echo ""
  echo "Run tests: bash scripts/run-all-snapshots.sh"
}

# Parse arguments
case "${1:-}" in
  local)
    setup_local
    ;;
  npm)
    setup_npm
    ;;
  -h|--help|help)
    show_usage
    exit 0
    ;;
  *)
    show_usage
    exit 1
    ;;
esac
