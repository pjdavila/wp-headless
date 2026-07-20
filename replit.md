# Faust.js Headless WordPress Frontend

A headless WordPress frontend for Caribbean Business, powered by Faust.js and Next.js, serving content from WordPress via GraphQL.

## Run & Operate

- **Development**: `npm run dev` (starts on `http://0.0.0.0:5000`)
- **Build**: `npm run build`
- **Production Start**: `npm run start` (WPE Atlas uses port 8080)
- **Required Env Vars**:
    - `NEXT_PUBLIC_WORDPRESS_URL`
    - `NEXT_PUBLIC_SITE_URL`
    - `FAUST_SECRET_KEY`
    - `RECOMBEE_DB_ID`
    - `RECOMBEE_PRIVATE_TOKEN`
    - `FIREBASE_API_KEY`
    - `MOOSEND_API_KEY`
    - `MOOSEND_LIST_ID`
    - `RESEND_API_KEY`
    - `FINNHUB_API_KEY`
- **Optional Env Vars**:
    - `RECOMBEE_REGION`
    - `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
    - `PRINT_EDITION_NOTIFY_EMAIL` (internal address for new print-edition interest notifications)
    - `ADMIN_EXPORT_TOKEN` (token to authorize `/api/print-edition-export` CSV download)
    - `NEWSLETTER_CRON_TOKEN` (token to authorize `/api/send-daily-newsletter`; required for the daily 5pm send)
    - `MOOSEND_NEWSLETTER_SENDER_EMAIL` (verified Moosend sender for the daily newsletter campaign)
    - `ODOO_PRINT_EDITION_URL` (overrides the Odoo endpoint that receives print-edition signups; default `https://vnmedia.odoo.com/caribbean/impresa`)

## Stack

- **Framework**: Next.js 15, Faust.js 3
- **Runtime**: Node.js v20
- **Styling**: CSS Modules, Tailwind CSS v4, HSL custom properties for design tokens
- **ORM**: _Populate as you build_
- **Validation**: _Populate as you build_
- **Build Tool**: Next.js/Faust.js build process, `@wpengine/atlas-next` for WPE Atlas optimizations

## Where things live

- **WordPress Templates**: `wp-templates/` (e.g., `wp-templates/single.js` for article pages)
- **React Components**: `components/`
- **Next.js Pages/API Routes**: `pages/` (e.g., `pages/api/recombee-track.js`)
- **Styling**: `styles/` (global tokens in `styles/globals.css`, component-specific in `.module.css`)
- **Firebase/Recombee/Auth Logic**: `lib/` (e.g., `lib/firebase.js`, `lib/recombee.js`, `lib/useAuth.js`)
- **DB Schema**: WordPress backend
- **API Contracts**: Implicit via GraphQL/REST endpoints (e.g., Recombee API expectations)
- **Theme Files**: `styles/globals.css` for core design tokens and `_app.js` for dark mode initialization

## Architecture decisions

- **Server-side Recommendation Proxy**: Recombee integration uses server-side API routes to protect private tokens, with client-side fetching to avoid blocking ISR caching.
- **Markets Widget (live)**: The homepage "Mercados" widget (`components/MarketWatchlist.js`) fetches live quotes client-side from `/api/markets`, which proxies Finnhub (`pages/api/markets.js`, key `FINNHUB_API_KEY`) to protect the key. Because Finnhub's free tier does not cover indices, gold, or crypto directly, the route uses ETF proxies (`SPY`≈S&P 500, `DIA`≈Dow Jones, `QQQ`≈Nasdaq, `GLD`≈Gold, `IBIT`≈Bitcoin) and rows are labeled with the ETF ticker (not the index name) so the displayed ETF price is not mistaken for the index/spot level. Response cached 60s (`s-maxage=60, stale-while-revalidate=300`); the client re-fetches every 60s. If no data is returned the widget hides. `components/MarketTicker.js` still holds static demo data and is not currently rendered.
- **Magazine Cover & Flipbook (live)**: `/magazine` and the home "Latest Edition" banner (`components/EpaperBanner.js`) pull the current flipbook URL and cover thumbnail from the VN Media portal API (`https://portal.vnmedia.co/api/public/caribbean-cover`, override via `MAGAZINE_COVER_API_URL`), proxied by `pages/api/magazine-cover.js` (cached 5 min, s-w-r 1 h) and fetched client-side via `lib/useMagazineCover.js` (module-level cache, one fetch per page load). Fallbacks if the API fails: the old pdf-flip URL on `/magazine` and the static `/epaper/portada-actual.webp` cover. `img.vnmedia.co` was added to `next/image` remotePatterns.
- **Dynamic `robots.txt`**: Generated via `getServerSideProps` for environment-specific configuration and blocking `/api/` routes.
- **Dark Mode First**: Default dark mode with `localStorage` persistence and FOUC prevention in `_app.js`.
- **Firebase Integration**: Comprehensive Firebase services (Auth, Firestore, FCM) integrated via context providers and hooks for modularity and reusability.
- **Transactional Email with Resend**: Server-side Resend API for welcome emails, with internal logging of message IDs for deliverability tracking.
- **Daily Lead Newsletter**: fetches posts tagged `portada` OR `lead` published in the last 24h (via `dateGmt`), orders `portada` stories first (a post with both tags counts once, in the `portada` group), caps the email at 6 stories, builds a dark-themed English HTML email (`lib/dailyNewsletter.js`) with the CB logo header and 16:9 cover-cropped story images, and sends a Moosend campaign (create + send) to `MOOSEND_LIST_ID` from `MOOSEND_NEWSLETTER_SENDER_EMAIL`. If there are no qualifying posts it skips sending. Two ways to trigger it:
    - **Scheduled Deployment (primary)**: `npm run send-newsletter` (script `scripts/send-daily-newsletter.mjs`) runs the send logic directly — no HTTP/token needed. Configure a Replit Scheduled Deployment with run command `npm run send-newsletter` at **21:00 UTC** (= 5pm AST; Puerto Rico has no DST so it never shifts). The script exits 0 on success or when there are no posts, and exits 1 on failure so the job is flagged. Supports `npm run send-newsletter -- --dry-run` to build the email without sending. Deployment secrets required: `MOOSEND_API_KEY`, `MOOSEND_LIST_ID`, `MOOSEND_NEWSLETTER_SENDER_EMAIL`, `NEXT_PUBLIC_WORDPRESS_URL`, `NEXT_PUBLIC_SITE_URL`.
    - **HTTP endpoint (backup / manual)**: `/api/send-daily-newsletter` (protected by `NEWSLETTER_CRON_TOKEN`, sent as `Bearer`, `?token=`, or `x-cron-token`) runs the same logic and returns `{ok:true, sent:false, reason:"no-lead-posts"}` when there are no posts. Useful for an external cron or manual triggering.
- **Print Edition Waitlist**: `/edicion-impresa/` collects interest in the future printed edition. On submit, `pages/api/print-edition-interest.js` POSTs each signup to an **Odoo endpoint** (`lib/odooPrintEdition.js`, default `https://vnmedia.odoo.com/caribbean/impresa`, JSON body with fields `fullName`, `email`, `phone`, `addressLine1`, `addressLine2`, `city` (from the selected town), `zip`, `website` (honeypot, normally empty)) — this is the persistent source of truth. It also: appends a best-effort JSON line to a local file (`data/print-edition-interest.jsonl` via `lib/printEditionStore.js`, ephemeral on WPE Atlas), triggers a Spanish confirmation email via Resend, and sends a full-detail backup notification to the team inbox (`PRINT_EDITION_NOTIFY_EMAIL`). The Odoo POST and local write are non-fatal: if either fails, the signup still succeeds for the user and the team backup email guarantees no data is lost. Admins can download a CSV of the local copy via `/api/print-edition-export` using `ADMIN_EXPORT_TOKEN`.

## Product

- **Content Display**: Homepage with various featured content sections (Hero, Categories, Story Cards, Videos, Shorts), category/archive pages, and detailed article pages.
- **User Engagement**: AI-powered content recommendations (Recombee), article audio player, social sharing, push notifications, and a robust authentication system with email/password and Google Sign-In.
- **Live Streaming**: Dedicated `/live` page with dynamic player states, live metadata, and integrated advertising.
- **Monetization**: Integrated ad slots via Vnmedia/ASO loader, including sticky banners and sidebar ads.
- **SEO & Analytics**: Comprehensive SEO meta-tagging, JSON-LD structured data, and Google Analytics 4 integration.

## User preferences

- I prefer short, concise responses.
- Please use bullet points or numbered lists when presenting information for clarity.
- When suggesting code changes, include the full path to the file.
- I prefer to iterate on solutions; please provide a starting point and I will give feedback.
- If there are multiple ways to achieve something, explain the trade-offs of each.
- I like functional programming paradigms where applicable.
- Please ask for confirmation before making significant changes or adding new features.
- I prefer to manage environment variables myself; just tell me what's needed.
- Do not make changes to files in the `node_modules` directory.
- Do not make changes to the `package-lock.json` file.
- Do not make changes to the `.env` file directly.

## Gotchas

- **Faust.js Preview Mode**: Requires `FAUST_SECRET_KEY` from WordPress settings.
- **Recombee Fallback**: If Recombee fails or returns no items, related posts default to category-based and homepage "Recommended" section hides.
- **Tailwind CSS v4 Import**: Ensure `@import "tailwindcss" source(none)` is used in `globals.css` with explicit `@source` directives to prevent recompilation loops.
- **Firebase Service Worker**: `public/firebase-messaging-sw.js` is generated at build time and should not be manually edited or committed.
- **Moosend Welcome Email**: Logic prevents re-sending welcome emails on subsequent newsletter subscriptions if the contact already exists.
- **WPE Atlas Deployment**: Requires Node.js v20 and uses `wpe-build` and `faust start` scripts.
- **Print Edition Local Storage**: `data/print-edition-interest.jsonl` is per-container and not synced across instances; on WPE Atlas it may be wiped on redeploys. It is now only a best-effort local copy — **Odoo is the persistent source of truth** for print-edition signups (with the team notification email as backup). Optional env var `ODOO_PRINT_EDITION_URL` overrides the Odoo endpoint.
- **Coming Soon Gate Disabled**: The password gate in `pages/_app.js` is hard-coded off (`isComingSoonEnabled = false`). To re-enable it, restore the original env-var check (`COMING_SOON === "true"` / `NEXT_PUBLIC_COMING_SOON === "true"`) and ensure `SITE_PASSWORD` is set. The `ComingSoon` component and `/api/check-access`, `/api/verify-access` endpoints are kept for that purpose.
- **Live Page Disabled**: The `/live` page is temporarily off. `pages/live.js` is a 307 redirect to `/`, the OFF AIR / Live button is removed from `components/Header.js` (both desktop nav and mobile drawer), and the home `FeaturedVideosWidget` "Ver todo" now points to `/videos` instead of `/live`. The `useLiveStatus` polling import was removed from the Header to stop periodic `/api/live-status` requests. `components/LivePlayer.js`, `components/LiveStreamHeader.js`, `lib/useLiveStatus.js`, `pages/api/live-status.js` and `styles/live.module.css` are intact. To reactivate: restore the original `pages/live.js` (LivePage component + queries), re-add the `useLiveStatus` import + JSX buttons in `components/Header.js`, and point the widget link back to `/live`.

## Pointers

- **Faust.js Documentation**: [https://faustjs.org/docs](https://faustjs.org/docs)
- **Next.js Documentation**: [https://nextjs.org/docs](https://nextjs.org/docs)
- **Recombee API Reference**: _Populate as you build_
- **Firebase Documentation**: [https://firebase.google.com/docs](https://firebase.google.com/docs)
- **Moosend API Documentation**: _Populate as you build_
- **Resend API Documentation**: [https://resend.com/docs](https://resend.com/docs)
- **Tailwind CSS v4 Documentation**: [https://tailwindcss.com/docs/upgrade-guide](https://tailwindcss.com/docs/upgrade-guide)
- **WPGraphQL Documentation**: [https://www.wpgraphql.com/docs/](https://www.wpgraphql.com/docs/)