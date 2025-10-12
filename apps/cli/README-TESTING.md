# Testing with OpenTUI

## Quick Start

### Current Setup (Local Linked OpenTUI)
```bash
# Tests work out of the box with current setup
bash scripts/run-all-snapshots.sh
```

### Switch to NPM OpenTUI (for CI/CD)
```bash
./setup-opentui-for-tests.sh npm
```

### Switch Back to Local OpenTUI (for development)
```bash
./setup-opentui-for-tests.sh local
```

## Files

- **`OPENTUI_SETUP.md`** - Complete documentation of all setup options
- **`patch-opentui.js`** - Automatic patch script for npm installs
- **`opentui-test-fixes.patch`** - Git patch file for local opentui
- **`setup-opentui-for-tests.sh`** - Helper script to switch between setups
- **`scripts/run-all-snapshots.sh`** - Run all snapshot tests individually

## Test Results

**Current Status: 11/16 test files fully passing (68.75%)**

✅ Fully working:
- StatusBar, TelemetryConsentPrompt, Layout
- RunCreatePrompt, OrchestratorPlanPrompt, GitWorktreeCreatePrompt
- ChatInterface, CodeEditor, ComposerApp, Sidebar, index

⚠️ Partially working (components with useKeyboard hook):
- MainMenu, WelcomeScreen, RunPrompt, SpawnPrompt

❌ Crashing:
- PokemonUI (Bun runtime bug)

## Why Patches Are Needed

OpenTUI requires two patches for snapshot testing:

1. **Export reconciler** - Makes `_render` function available for tests
2. **Fix prop initialization** - Prevents double-setting props that causes blank rendering

See `OPENTUI_SETUP.md` for technical details.

## For Contributors

If you want to run tests:
1. You can use the current linked setup (no changes needed)
2. OR run `./setup-opentui-for-tests.sh npm` to use npm version

## For CI/CD

Add to your CI workflow:
```yaml
- name: Setup and test
  run: |
    cd apps/cli
    bun install  # postinstall will auto-patch
    bash scripts/run-all-snapshots.sh
```

Make sure `package.json` includes:
```json
{
  "scripts": {
    "postinstall": "node patch-opentui.js"
  }
}
```
