---
name: Faust build and dev cache
description: Avoid corruption caused by production builds sharing Next.js output with the running Faust development server.
---

Do not run `faust build` while the Faust development workflow is active. Stop the workflow first, run the build, then start development again.

**Why:** Both processes write to `.next`. A production build performed while development is running can leave the restarted dev server referencing missing vendor chunks, causing otherwise valid routes and Next.js assets to return HTTP 500.

**How to apply:** For build verification, stop development before building. If this failure appears, remove only the regenerable `.next` directory and restart the workflow before investigating page code.