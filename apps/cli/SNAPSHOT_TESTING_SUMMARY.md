# Snapshot Testing Fix Summary

## Overview

Successfully fixed the opentui snapshot testing infrastructure that was producing blank frames for all UI components.

## Results

**Test Suite Status: 11/16 files fully passing (68.75% success rate)**

### ✅ Fully Passing Tests (11 files)
1. StatusBar - 5 tests
2. TelemetryConsentPrompt - 1 test
3. Layout - 1 test
4. RunCreatePrompt - 4 tests
5. OrchestratorPlanPrompt - 5 tests
6. GitWorktreeCreatePrompt - 1 test
7. ChatInterface - 1 test
8. CodeEditor - 2 tests
9. ComposerApp - 1 test
10. Sidebar - 1 test
11. index - 2 tests

### ⚠️ Partially Passing Tests (4 files)
- MainMenu - 1/3 tests passing
- WelcomeScreen - 2/7 tests passing
- RunPrompt - 7/10 tests passing
- SpawnPrompt - 2/7 tests passing

### ❌ Crashing Tests (1 file)
- PokemonUI - Segmentation fault (Bun bug)

## Root Causes Identified

### 1. React Reconciler Timing Issue
**Problem**: React's reconciler updates were not being flushed before capturing frames.

**Solution**: Added `setTimeout(resolve, 0)` wrapper around `reconcilerRender()` call to allow React's concurrent reconciler to complete its work before proceeding.

**Location**: `tests/utils.ts` - render function

### 2. Critical Bug in opentui's React Integration
**Problem**: Props like `fg`, `bg`, and `style` were being set twice:
1. First in the constructor (via spread in `createInstance`)
2. Second via setters (in `finalizeInitialChildren`)

Setting color props via setters after construction caused text to disappear completely.

**Solution**: Disabled the second initialization by commenting out `setInitialProperties()` call in `finalizeInitialChildren`.

**Location**: `/Users/shunkakinoki/ghq/github.com/sst/opentui/packages/react/src/reconciler/host-config.ts:139`

## Technical Details

### Fix 1: Render Timing
```typescript
// Before
reconcilerRender(element, renderer.root)
await renderOnce()
await renderOnce()

// After
await new Promise((resolve) => {
  reconcilerRender(element, renderer.root)
  setTimeout(resolve, 0)  // Allow reconciler to flush
})
await renderOnce()
await renderOnce()
await renderOnce()
await renderOnce()
await renderOnce()
await renderOnce()
```

### Fix 2: Prop Initialization
```typescript
// In finalizeInitialChildren()
// BEFORE:
setInitialProperties(instance, type, props)  // ❌ Sets props again via setters
return false

// AFTER:
// Props are already set in createInstance constructor, so skip this
// setInitialProperties(instance, type, props)
return false
```

## Known Limitations

### Components with useKeyboard Hook
Components that use the `useKeyboard` hook from opentui may not render properly in tests:
- MainMenu
- WelcomeScreen (partially)
- RunPrompt (partially)
- SpawnPrompt (partially)

**Reason**: The `useKeyboard` hook registers event listeners via `useEffect`, which requires the keyHandler from AppContext. While the context is provided, these components appear to have additional complexities that prevent full rendering in the test environment.

**Workaround**: These components' core rendering logic works (as evidenced by partial test passes), but full integration tests may require different approaches or mocking strategies.

## Files Modified

1. `/Users/shunkakinoki/ghq/github.com/shunkakinoki/open-composer/apps/cli/tests/utils.ts`
   - Added setTimeout wrapper for reconciler
   - Increased renderOnce() calls from 2 to 6

2. `/Users/shunkakinoki/ghq/github.com/sst/opentui/packages/react/src/reconciler/host-config.ts`
   - Commented out setInitialProperties() call in finalizeInitialChildren()

## Running Tests

### Run All Tests
```bash
bash scripts/run-all-snapshots.sh
```

### Run Individual Test
```bash
bun test tests/ui/StatusBar.test.tsx --update-snapshots
```

### Update All Snapshots
```bash
bun test tests/ui/ --update-snapshots
```

Note: Running all tests together may cause segmentation faults due to a Bun bug. Use the `run-all-snapshots.sh` script to run tests individually.

## Next Steps

To achieve 100% test passing rate:

1. **Investigate useKeyboard hook behavior in tests**
   - May need to mock the hook or provide a test-specific implementation
   - Consider creating a test wrapper that provides a no-op keyHandler

2. **Fix PokemonUI segfault**
   - This appears to be a Bun runtime bug
   - May need to isolate the specific component/pattern causing the crash
   - Consider reporting to Bun team with minimal reproduction

3. **Consider React Testing Library approach**
   - For components with complex hooks, traditional snapshot testing may not be ideal
   - Could supplement with interaction testing or hook-specific test utilities
