---
name: Production deploy flow (WP Engine via GitHub)
description: How this repo reaches production, and why Replit "Merged" tasks are not live until pushed to GitHub.
---

# Production deploy flow

Production runs on **WP Engine Atlas (headless)** and is built/published from the
**GitHub repo `origin` (github.com/pjdavila/wp-headless), branch `main`**.
Domain: caribbean.business.

**Rule:** A Replit project task reaching "Merged" only merges into the Replit
repo's `main`. It does **NOT** deploy to production. Production only updates when
commits are pushed to **`origin/main` on GitHub**, which triggers the WP Engine
build.

**Why:** This caused a real incident — a new API route (`/api/send-daily-newsletter`)
returned 404 in production while existing in the Replit repo. Root cause: local
`main` was ahead of `origin/main` by 10 commits; the code never reached GitHub,
so WP Engine never built it.

**How to apply:** When a feature "works in the repo" but 404s / behaves like old
code in production, check `git log origin/main..HEAD` for unpushed commits before
debugging code. Pushing Replit `main` to GitHub `origin/main` is the missing
publish step (do it from the Replit Git pane, or as a delegated background task —
git push is a mutating op).
