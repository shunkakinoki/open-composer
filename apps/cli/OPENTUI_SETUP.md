# OpenTUI Setup for Snapshot Testing

## Problem

The snapshot tests require two patches to `@opentui/react`:

1. **Export the reconciler** - Needed to access `_render` function for testing
2. **Fix prop initialization bug** - Prevents double-setting props which causes blank text rendering

## Solutions

### Option 1: Use Linked Local OpenTUI (Current Setup)

This is what we're currently using for development.

**Setup:**
```bash
# Clone opentui
cd ~/ghq/github.com/sst
git clone https://github.com/sst/opentui.git
cd opentui

# Install and link packages
bun install
cd packages/core && bun link
cd ../react && bun link
cd ../../..

# Apply patches to opentui
cd opentui
git apply /path/to/opentui-patches.patch

# Link in your project
cd /path/to/open-composer/apps/cli
bun link @opentui/core
bun link @opentui/react
```

**package.json:**
```json
{
  "dependencies": {
    "@opentui/core": "link:@opentui/core",
    "@opentui/react": "link:@opentui/react"
  }
}
```

**Pros:**
- Full control over opentui source
- Easy to debug issues
- Patches are permanent

**Cons:**
- Requires local opentui clone
- Not portable to CI/CD
- Other developers need same setup

### Option 2: Use NPM with Postinstall Patch (Recommended for CI/CD)

Automatically patch the npm-installed version.

**Setup:**

1. Update `package.json`:
```json
{
  "scripts": {
    "postinstall": "node patch-opentui.js"
  },
  "dependencies": {
    "@opentui/core": "^0.1.0",
    "@opentui/react": "^0.1.0"
  }
}
```

2. Use the included `patch-opentui.js` script (already created)

3. Install:
```bash
bun install
# The postinstall hook will automatically patch opentui
```

**Pros:**
- Works with regular npm install
- CI/CD compatible
- Other developers don't need special setup

**Cons:**
- Patches are reapplied on every install
- Patches might break if opentui structure changes

### Option 3: Use patch-package

Use the `patch-package` tool to manage patches.

**Setup:**
```bash
# Install patch-package
bun add -D patch-package

# Make your changes to node_modules/@opentui/react
# Then create the patch
bunx patch-package @opentui/react

# This creates patches/@opentui+react+<version>.patch
```

**package.json:**
```json
{
  "scripts": {
    "postinstall": "patch-package"
  }
}
```

**Pros:**
- Industry-standard solution
- Handles version changes gracefully
- Easy to share patches

**Cons:**
- Additional dependency
- Requires bun/npm to run postinstall

### Option 4: Submit Upstream PR (Long-term Solution)

Submit a PR to opentui to fix these issues upstream.

**What to submit:**

1. **Export reconciler** - Add `export * from "./reconciler/reconciler"` to `packages/react/src/index.ts`

2. **Fix prop initialization** - Either:
   - Remove the `setInitialProperties` call from `finalizeInitialChildren`, OR
   - Fix the `fg`/`bg` setters to handle being called during initialization

**Once merged:**
- Update to new opentui version
- Remove all patches
- Tests work out of the box

## Current Patches

### Patch 1: Export Reconciler

**File:** `packages/react/src/index.ts`

```diff
 export * from "./reconciler/renderer"
+export * from "./reconciler/reconciler"
 export * from "./types/components"
```

### Patch 2: Fix Prop Initialization

**File:** `packages/react/src/reconciler/host-config.ts`

```diff
 finalizeInitialChildren(
   instance: Instance,
   type: Type,
   props: Props,
   rootContainerInstance: Container,
   hostContext: HostContext,
 ) {
-  setInitialProperties(instance, type, props)
+  // NOTE: Props are already set in createInstance constructor
+  // Setting them via setInitialProperties causes issues with fg/bg props
+  // setInitialProperties(instance, type, props)
   return false
 },
```

## Recommended Approach

For **development**: Use Option 1 (linked local opentui)
For **CI/CD**: Use Option 2 (postinstall script) or Option 3 (patch-package)
For **long-term**: Pursue Option 4 (upstream PR)

## Testing the Setup

After applying any solution, verify it works:

```bash
# Run snapshot tests
bash scripts/run-all-snapshots.sh

# Should show 11/16 files passing
# If you see blank snapshots, the patches didn't apply correctly
```

## Troubleshooting

### Tests show blank frames
- Patches didn't apply correctly
- Check if `_render` is exported: `bun repl` then `import { _render } from "@opentui/react"`
- Check if props are being set twice (add console.log in TextRenderable constructor and setter)

### Module not found errors
- Reconciler export not applied
- Run `bun install` again
- Check node_modules/@opentui/react/dist/index.js includes reconciler export

### Patches don't apply on install
- Make sure postinstall script is in package.json
- Try running manually: `node patch-opentui.js`
- Check file paths in patch script match your node_modules structure
