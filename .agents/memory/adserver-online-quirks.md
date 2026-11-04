---
name: Adserver.Online (ASO) delivery quirks
description: How _ASO renders display zones, and traps when detecting fill or styling the creative.
---

- `_ASO.loadAd(id, zone)` REPLACES the `<ins>` with its own `<div class="aid-… zid-…">` (div > div[display:table] > a[target=_blank] > img). React refs to the `<ins>` go stale; detect fill by searching the wrapper for a loaded img/iframe, never via the ins ref.
- `code.min.js` also auto-scans every `.ins-zone` on first load and requests it under its own generated id, so each zone is requested twice on a hard page load (only one creative renders). Pre-existing for all zones; client-side navigations request once.
- No-fill / blocked script leaves the `<ins>` empty — collapse after a timeout (8s used for the scroller).

**Why:** discovered while building the 700x1600 in-article scroller; the stale-ref and double-request behaviour are not visible from our code.

**How to apply:** any new ASO zone that needs fill detection or custom sizing must target the wrapper and force sizes with `:global(div|a|img)` rules.
