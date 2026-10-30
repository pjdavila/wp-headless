---
name: Homepage single WordPress query
description: Why the homepage must keep making only one WordPress request per rebuild.
---

The homepage makes exactly one WordPress GraphQL request per ISR rebuild and is deliberately not a Faust template (details in replit.md).

**Why:** the user's WordPress server is slow and low on resources, and Cloudflare never caches the GraphQL POSTs. Faust's template path cost 5 requests per rebuild.

**How to apply:** new homepage data goes into that single query, never a new `useQuery` or a second request.
