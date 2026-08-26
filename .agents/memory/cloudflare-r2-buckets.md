---
name: Cloudflare R2 buckets and the img.caribbean.business domain
description: What the site's R2 bucket actually exposes, and why attachment "privacy" is a bucket-level decision here.
---

# The image domain is a public R2 bucket

`img.caribbean.business` is a Cloudflare custom domain attached to the site's R2
bucket. Everything written to that bucket is world-readable at
`https://img.caribbean.business/<object key>` — no credentials, no signature.
Verified by uploading a probe object and fetching it anonymously.

**Why it matters:** R2 grants public access per *bucket*, never per object. A
`private` flag, an ACL, or a `no-store` cache header in application code does
not make an object in that bucket unreachable. The only real controls are (a) a
different bucket with no public domain, or (b) accepting that the URL itself is
the only protection.

**How to apply:** before storing anything with personal data (résumés, IDs,
private documents) in R2, check which bucket it lands in. If it is the one
served by the public domain, say so plainly to the user instead of describing
the object as private — and offer a separate private bucket with presigned URLs
as the alternative. For the 40 Under 40 form the team explicitly chose short
permanent public links over expiring ones, with the exposure understood.

# Deleting an object does not invalidate the edge cache

After deleting an object from the bucket, its public URL kept returning `200`
from the Cloudflare edge. Publicly served objects therefore need a short
`Cache-Control` max-age if they may ever need to be revoked; a long
`immutable` TTL should be reserved for content meant to live forever.
