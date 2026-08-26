---
name: Building absolute URLs back to this site
description: Two traps when server code needs to emit a URL pointing at this frontend — the CMS-valued site URL env var, and forced trailing slashes on API routes.
---

# Building absolute URLs back to this site

Two independent traps, both easy to miss because they fail quietly (a redirect or
a wrong host, not an exception).

## 1. `NEXT_PUBLIC_SITE_URL` is the WordPress CMS, not the frontend

The env var is set to the headless CMS origin, so any absolute URL built from it
points at WordPress, not at the public site. Fine for the existing SEO/JSON-LD
code that already lives with it, but wrong for links a third party is expected to
fetch (webhook payloads, emails, download links).

**How to apply:** derive the origin from the incoming request
(`x-forwarded-proto` / `x-forwarded-host`, falling back to `host`) whenever the
URL has to actually resolve for an outside consumer.

## 2. `trailingSlash: true` also applies to `/api/*`

`next.config.js` forces trailing slashes site-wide, and the rewrite is not
limited to pages. A generated link like `/api/thing?x=1` answers **308** before
the handler runs. A browser follows it, but a webhook consumer, a `curl` without
`-L`, or any POST-preserving client may not.

**Why:** this was hit for real while testing signed document links — the link in
the payload returned 308 with a 159-byte body instead of the file.

**How to apply:** write `/api/thing/?x=1` (slash *before* the query string) in
any URL this codebase emits, and when testing API routes by hand, always include
the trailing slash or `curl` will show a redirect instead of the handler's
response.
