---
"open-composer": patch
---

Fix Docker container git configuration permissions issue by ensuring proper directory ownership for the runner user and setting bash as the default shell for RUN commands.
