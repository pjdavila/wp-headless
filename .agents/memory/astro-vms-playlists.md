---
name: Astro VMS playlists
description: Verified quirks of the Astro VMS playlist API and its thumbnail CDN used by /videos and the video archives.
---
- Playlist responses are paginated: no params = first 10 items only. `page_offset` is a 1-based page number, `page_limit` the size (100 works). Anything that must see every video (archives, video lookups by id) has to follow the pages.
  **Why:** the /videos page and /video/<id> lookups silently missed everything past item 10.
- The Bunny CDN serving many thumbnails (vz-*.b-cdn.net) has referer hotlink protection: Replit preview/127.0.0.1 referers get 403, no referer or the production domain gets 200.
  **How to apply:** use `referrerPolicy="no-referrer"` on video thumbnails; broken thumbs only in preview are not a data problem.
