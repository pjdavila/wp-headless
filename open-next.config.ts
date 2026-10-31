// OpenNext configuration for running the site on Cloudflare Workers.
// See https://opennext.js.org/cloudflare/caching
//
// Pages Router only, time-based ISR only (no revalidateTag/revalidatePath),
// so no tag cache is configured.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import queueCache from "@opennextjs/cloudflare/overrides/queue/queue-cache";

export default defineCloudflareConfig({
  // ISR pages live in a private R2 bucket (binding NEXT_INC_CACHE_R2_BUCKET).
  // The regional cache keeps a copy in each Cloudflare location for up to a
  // minute ("short-lived"), so a hot article is not read from R2 on every
  // request, while a regenerated homepage still shows up within a minute.
  incrementalCache: withRegionalCache(r2IncrementalCache, {
    mode: "short-lived",
  }),
  // Durable Object queue: deduplicates background regenerations, so a stale
  // page is rebuilt once (one trip to the slow WordPress server), not once
  // per visitor. queueCache avoids re-sending the same stale page to the
  // queue for a few seconds.
  queue: queueCache(doQueue),
});
