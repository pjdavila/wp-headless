---
name: Headless browser checks
description: How to verify ad/video behaviour that the screenshot tool cannot (timing, clicks, sessionStorage, network requests).
---

The screenshot tool cannot click or wait for late client-side state (IMA ads, idle-loaded widgets). A real Chromium exists at `/repl/tools/bin/chromium`; install `puppeteer-core` in a throwaway dir under `/tmp` (never in the project, to keep package-lock clean) and drive it with `--autoplay-policy=no-user-gesture-required`.

**Why:** verifying the floating VAST video ad needed request logs, clicks on mute/close and sessionStorage checks that a static screenshot cannot show.

**How to apply:** for VAST ad testing, temporarily swap in Google's IMA sample tag (`pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples...`), test, then revert. Adserver.Online zones often return an empty `<VAST version="3.0"></VAST>` (no fill), so that path must stay silent.

Do not fake an iPhone by setting an iOS user agent in Chromium for IMA tests: IMA then picks the HLS (m3u8) ad rendition, Chromium can't play it, and you get AdError 400 — a false failure. Use an Android UA or just a narrow viewport instead.
