---
name: Cloudflare Workers (OpenNext) gotchas
description: How to build/preview the Workers version in Replit and the runtime traps found while porting it.
---

- Build in a copy of the repo (tar to another dir excluding node_modules/.next/.git, then `npm ci`), never in the workspace while the dev workflow runs.
  **Why:** `build:cf` and `faust dev` both write `.next`; the dev server then 500s on every route.
- Preview with `wrangler dev` + `CLOUDFLARE_INCLUDE_PROCESS_ENV=true` (what `npm run preview:cf` does). `opennextjs-cloudflare preview` hides process env, so no secret reaches the Worker.
- Worker logs in wrangler dev: POST SQL to `/cdn-cgi/local/explorer/api/local/observability/query` (table `logs`: ts_ms, level, message). The HTTP body of a crashed page is only "Internal Server Error".
- Cache debugging: run wrangler dev with `NEXT_PRIVATE_DEBUG_CACHE=1`.
- Traps already fixed; re-check on any OpenNext/Next upgrade:
  - Packages that import `next/router`/`next/head` from node_modules get separate React contexts in the esbuild bundle ("NextRouter was not mounted"). Fix: `transpilePackages` (done for @faustwp/core).
  - Next's router-server context key ("" vs "..") mismatches → `notFound` pages return bare text instead of pages/404. Fixed in the Worker entry.
  - Anything using `eval`/`new Function` (old js-sha256, Firestore's protobufjs codegen) crashes the Worker at import time.
  - Top-level `fs.readFileSync` of a bundled file crashes every route that imports the module.
  - Stripe: use `constructEventAsync`.
- Testing an npm package in a throwaway worker is misleading: wrangler bundles with browser conditions (AWS SDK then needs DOMParser), unlike OpenNext's node-condition bundle. Test through the real app build instead.
