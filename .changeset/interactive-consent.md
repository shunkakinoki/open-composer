---
"open-composer": minor
---

feat: implement interactive telemetry consent prompt

Replace console-based telemetry consent with interactive Ink-based UI

- Add TelemetryConsentPrompt component with keyboard navigation
- Update config service to show consent prompt on first run  
- Improve user experience with clear privacy messaging
- Add proper keyboard navigation (arrows, Enter, Esc)
- Enhanced consent tracking with timestamp recording
