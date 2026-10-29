---
name: CMS outages break dev start
description: Why the "Start application" workflow sometimes fails to restart even though nothing in the code is wrong.
---

`faust dev` checks the WordPress GraphQL endpoint (cms.vnmedia.co) when it starts. When the CMS returns Cloudflare 5xx errors (502, 520, 521, 525), the workflow exits with "Unable to find a GraphQL endpoint". These outages are intermittent and usually clear within a minute.

**Why:** this happened repeatedly in Oct 2026. It looks like a broken workflow, but the cause is outside the codebase.

**How to apply:** when a restart fails with that message, curl the CMS GraphQL URL. Wait until it returns 200, then restart again. Do not change code or config to "fix" it.
