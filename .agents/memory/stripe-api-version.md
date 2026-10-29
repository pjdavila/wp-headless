---
name: Stripe API version quirks
description: Behaviors of the Stripe API version pinned by the installed SDK (dahlia, 2026) that break code written for older versions.
---
- Billing period dates (`current_period_start/end`) live on each subscription **item**, not on the subscription. Code reading `sub.current_period_end` gets `undefined` silently.
- Expanding `data.items.data.price.product` on `subscriptions.list` fails with `property_expansion_max_depth` (older docs say it is allowed). Expand `data.customer` only and look products up with `products.list`.
- The configured Stripe key in this workspace is a live-mode key (Oct 2026: zero subscriptions). Never create test subscriptions with it.

**Why:** both bit the admin subscriptions panel; the first also affects older routes that still read the subscription-level field.
**How to apply:** any new Stripe read code — check the item-level fields and keep expansions at most 4 levels including `data.`.
