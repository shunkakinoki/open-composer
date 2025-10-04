---
"open-composer": patch
---

Add Windows support to install.sh script testing and fix Homebrew tap generation

- Add windows-latest to install-e2e-script job matrix in CI workflow
- Fix Homebrew configuration to properly generate formulas for Linux and macOS platforms
- Remove inconsistent url_template which caused 404 errors
- Ensure correct binary naming scheme across all supported platforms
