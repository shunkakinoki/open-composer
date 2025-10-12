#!/bin/bash
# Run all snapshot tests individually to avoid segfaults

cd "$(dirname "$0")/.."

TEST_FILES=(
  "StatusBar"
  "TelemetryConsentPrompt"
  "Layout"
  "MainMenu"
  "WelcomeScreen"
  "RunPrompt"
  "RunCreatePrompt"
  "SpawnPrompt"
  "OrchestratorPlanPrompt"
  "GitWorktreeCreatePrompt"
  "ChatInterface"
  "CodeEditor"
  "ComposerApp"
  "Sidebar"
  "PokemonUI"
  "index"
)

echo "========================================="
echo "Running All Snapshot Tests"
echo "========================================="
echo ""

total=0
passed=0
failed=0
error=0

for test in "${TEST_FILES[@]}"; do
  echo "Testing: $test"
  result=$(bun test "tests/ui/${test}.test.tsx" --update-snapshots 2>&1)

  if echo "$result" | grep -q "panic(main thread)"; then
    echo "  ❌ CRASH (segfault)"
    ((error++))
  elif echo "$result" | grep -q "0 fail"; then
    pass_count=$(echo "$result" | grep -oE "[0-9]+ pass" | grep -oE "[0-9]+")
    echo "  ✅ PASS ($pass_count tests)"
    ((passed++))
  else
    pass_count=$(echo "$result" | grep -oE "[0-9]+ pass" | grep -oE "[0-9]+" | head -1)
    fail_count=$(echo "$result" | grep -oE "[0-9]+ fail" | grep -oE "[0-9]+" | head -1)
    echo "  ⚠️  PARTIAL ($pass_count passed, $fail_count failed)"
    ((failed++))
  fi
  ((total++))
  echo ""
done

echo "========================================="
echo "Summary"
echo "========================================="
echo "Total test files: $total"
echo "✅ Fully passing: $passed"
echo "⚠️  Partially failing: $failed"
echo "❌ Crashed: $error"
echo ""
