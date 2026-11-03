---
name: Recombee catalog writers
description: Who writes Recombee item properties, how their ids differ, and the state of the catalog as of Oct 2026.
---

# Recombee catalog writers

- The RSS catalog feed set up in the Recombee admin creates items with 32-hex
  hashed ids (not md5 of the link). It last imported in mid-April 2026 and looks
  stalled; all its ~93 items point at articles that now 404 on the site.
- View tracking creates items whose id is the post slug. These are the bulk of
  the catalog and the only ones that resolve to live articles.
- Our writers fill only empty properties, so feed and app never overwrite each
  other.

**Why:** The task that removed WordPress from the recommend route had to
guarantee the two writers could not clobber each other.

**How to apply:** Never "fix" a feed item's values from WordPress by overwriting;
if you need fresh values, change the fill-empty rule deliberately. WordPress
answers 502/525 to 50-slug `nameIn` batches under load; keep batches ~20 with a
retry.
