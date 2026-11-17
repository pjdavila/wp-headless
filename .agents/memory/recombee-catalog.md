---
name: Recombee catalog writers
description: Who writes Recombee item properties, how their ids differ, and why writers only fill empty values.
---

# Recombee catalog writers

- Two writers exist: the RSS catalog feed configured in the Recombee admin
  (32-hex hashed ids, not md5 of the link; it has stalled before and its items
  can point at deleted articles) and view tracking (ids are post slugs, which
  resolve to live articles).
- Our writers fill only empty properties, so feed and app never overwrite each
  other.
- The fill runs a few seconds after the view response. On Cloudflare Workers it
  must be handed to `ctx.waitUntil`, or it is cancelled and items stay untitled
  (and the recommend route skips untitled items).

**Why:** The task that removed WordPress from the recommend route had to
guarantee the two writers could not clobber each other.

**How to apply:** Never "fix" a feed item's values from WordPress by overwriting;
if you need fresh values, change the fill-empty rule deliberately. WordPress
answers 502/525 to 50-slug `nameIn` batches under load; keep batches ~20 with a
retry.
