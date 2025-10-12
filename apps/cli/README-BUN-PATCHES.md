# Bun Native Patch System for OpenTUI

This project uses **Bun's native patch system** to apply necessary fixes to `@opentui/react` for snapshot testing.

## How It Works

### Automatic Patching

When you run `bun install`, Bun automatically applies patches from the `patches/` directory:

```bash
bun install
# Bun automatically applies patches/@opentui%2Freact@0.1.26.patch
```

**No postinstall scripts needed!** ✨

### What Gets Patched

The patch file (`patches/@opentui%2Freact@0.1.26.patch`) makes 3 changes to `@opentui/react`:

1. **Export `_render` function** - Needed for test renderer
2. **Fix prop initialization bug** - Prevents blank text rendering
3. **Add TypeScript exports** - Type definitions for `_render`

## For Developers

### Running Tests

```bash
# Run all snapshot tests
bash scripts/run-all-snapshots.sh

# Run specific test
bun test tests/ui/StatusBar.test.tsx
```

### Modifying Patches

If you need to update the patches:

```bash
# 1. Start patch mode
bun patch @opentui/react

# 2. Bun tells you which folder to edit
# Edit files in: node_modules/@opentui/react

# 3. Make your changes to the files

# 4. Commit the patch
bun patch --commit 'node_modules/@opentui/react'

# This updates patches/@opentui%2Freact@0.1.26.patch
```

### Clean Install Test

To verify patches work on clean install:

```bash
# Clear cache and reinstall
bun pm cache rm
bun install --force

# Verify patches applied
grep "_render," node_modules/@opentui/react/index.js
# Should show: _render,

# Run tests
bash scripts/run-all-snapshots.sh
```

## For CI/CD

Patches are automatically applied during `bun install`, so CI/CD requires no special setup:

```yaml
# Example GitHub Actions
- name: Install dependencies
  run: bun install  # Patches applied automatically

- name: Run tests
  run: bash scripts/run-all-snapshots.sh
```

## Technical Details

### Patch Location

- **Patch file**: `../../patches/@opentui%2Freact@0.1.26.patch` (monorepo root)
- **Applied to**: `node_modules/@opentui/react/`

### Version Compatibility

The patch is for `@opentui/react@0.1.26`. If you update to a different version:

1. Bun will warn about version mismatch
2. Create new patch for the new version
3. Test that everything still works

### Benefits Over Other Approaches

| Approach | Pros | Cons |
|----------|------|------|
| **Bun Patches** ✅ | Native, automatic, no scripts | Bun-specific |
| patch-package | Works with npm/yarn | Requires postinstall script |
| Custom script | Full control | Manual maintenance |
| Local opentui | Easy debugging | Complex setup |

## Test Results

**Current Status: 13/16 test files fully passing (81.25%)**

✅ Fully passing (13 files, 40+ tests)
⚠️  Partially failing (2 files)
❌ Crashing (1 file - Bun runtime bug)

See `SNAPSHOT_TESTING_SUMMARY.md` for detailed test results.

## Troubleshooting

### Patches not applying?

```bash
# Check patch file exists
ls ../../patches/@opentui%2Freact@0.1.26.patch

# Force reinstall
bun pm cache rm && bun install --force
```

### Tests showing blank frames?

```bash
# Verify patches were applied
grep "PATCHED" node_modules/@opentui/react/index.js
grep "_render" node_modules/@opentui/react/index.js

# If not found, reinstall
bun install --force
```

### Upgrading opentui version?

```bash
# 1. Update version in package.json
# 2. Remove old patch
rm ../../patches/@opentui%2Freact@*.patch

# 3. Install new version
bun install

# 4. Create new patch
bun patch @opentui/react
# ... make changes ...
bun patch --commit 'node_modules/@opentui/react'

# 5. Test
bash scripts/run-all-snapshots.sh
```

## References

- [Bun Patch Documentation](https://bun.com/docs/install/patch)
- [OpenTUI GitHub](https://github.com/sst/opentui)
- `OPENTUI_SETUP.md` - Alternative setup methods
- `SNAPSHOT_TESTING_SUMMARY.md` - Technical details
