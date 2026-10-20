---
name: 40 Under 40 forms portal contract
description: Where the portal's delivery contract comes from and the rules for resending nominations.
---

The forms portal (receiver of 40 Under 40 nominations) is owned by another team / Replit. Its contract was given as a pasted spec (attached_assets, "Instrucciones para el Replit del formulario de Caribbean Business", Oct 2026): x-form-secret header, fixed field names, applicantType nominate|self, PDF attachments ≤ 5 MB, link hosts allow-list.

**Why:** before that spec the site sent Bearer auth and its own field names; production nominations arrived with no files.

**How to apply:** if the portal changes, update the spec-derived constants and tests together. Resending with the same id is safe (portal de-duplicates and only adds missing files), but a 201 on a resend means the portal did not know that id and created a new, data-less entry, so only resend ids the portal reports. Do not run the resend in execute mode without the user's explicit go-ahead.
