# Faust.js Headless WordPress Frontend

A headless WordPress frontend built with [Faust.js](https://faustjs.org/) and Next.js, scaffolded from the official WP Engine Faust scaffold.

## Architecture

- **Framework**: Next.js 15 + Faust.js 3
- **Data Source**: WordPress via GraphQL (WPGraphQL)
- **Styling**: CSS Modules in `styles/` with global design system tokens in `globals.css`
- **Templates**: WordPress page/post templates live in `wp-templates/`
- **Components**: Reusable React components in `components/`
- **Pages**: Next.js pages in `pages/` (includes API routes for Faust preview/auth)

## Design System (2026 Refresh)

- **CSS Tokens**: HSL custom properties in `:root` (light) and `.dark` (dark mode) — see `styles/globals.css`
- **Tailwind CSS v4**: Installed for ad component responsive breakpoints (`hidden`, `block`, `md:`, `lg:` utilities). Configured via `@import "tailwindcss" source(none)` in globals.css with explicit `@source` directives. PostCSS config in `postcss.config.js` uses `@tailwindcss/postcss`.
- **Typography**: Playfair Display for headings (Google Fonts, 400/700/800), Source Sans 3 for body/UI text (Google Fonts, 400/600/700)
- **Primary Color**: Green financial brand (`--primary: 152 56% 38%` light / `152 56% 45%` dark)
- **Dark Mode**: Default. Toggle persists in `localStorage` key `bj-theme`. Init script in `_app.js` prevents FOUC.
- **Border Radius**: `--radius: 12px`, `--radius-sm: 8px`, `--radius-lg: 16px`, `--radius-xl: 20px`
- **Shadows**: `--shadow-sm`, `--shadow-md`, `--shadow-lg` (replaces border-based card styling)
- **Header**: Mercado-style layout — MarketTicker on top, logo bar (hamburger left | centered logo | theme toggle right), centered nav bar. Always-dark header: scoped CSS variable overrides on `.header` force dark-mode colors regardless of page theme. Logo always uses `logo-dark.webp`. Glassmorphism effect (`backdrop-filter: blur(20px) saturate(180%)`). Hamburger always visible, opens left drawer. On mobile, nav links hide.
- **Cards**: Hover lift/scale effects (`translateY(-4px)`, image `scale(1.05)`)
- **Badges**: Gradient fills and pill-style category tags
- **ThemeToggle**: Component in `components/ThemeToggle.js`, rendered in Header

## Homepage Components

- **FeaturedHero** (Nerio-style): 2-column layout — large featured image with gradient overlay + text (category badge, title, author, date) on left, 4 stacked horizontal mini-cards on right. Mini-cards show thumbnail + category + title + author + date.
- **ExploreCategories**: Horizontal scrollable row of category cards with background images (from most recent post) and category name overlay. Placed between hero and category sections.
- **StoryCard**: Card with featured image, green category badge, title, excerpt, author, date
- **SidebarStoryCard**: Compact numbered card with thumbnail and relative Spanish timestamps
- **SectionBlock**: Category-grouped StoryCard grid with section title and "Ver más" link
- **MarketWatchlist**: Placeholder financial data sidebar widget
- **Recommended For You**: Client-side personalized section below category sections. Fetches from Recombee `RecommendItemsToUser` after page load. Hidden if no recommendations. Does not affect ISR cache.
- **Homepage Layout**: Hero → ExploreCategories → main+sidebar grid (sidebar at 320px, collapses on mobile) → Recommended For You
- **Data**: Fetches 20 posts, groups by WordPress category (skips uncategorized)

## Article Page Components

- **ShareMenu**: Facebook, X, LinkedIn share + copy-to-clipboard with tooltip
- **PhotoGallery**: Lightbox with keyboard navigation for posts with 2+ embedded images
- **Reading Time**: Word count estimator (200 WPM), shown in metadata bar
- **Related Posts**: AI-powered via Recombee (item-to-item recommendations). Falls back to same-category posts if Recombee returns empty or errors.
- **View Tracking**: Fires `AddDetailView` to Recombee on article load (fire-and-forget)
- **Sidebar**: "Lo Más Reciente" with 6 numbered recent posts

## Category/Archive Pages

- **Template**: `wp-templates/archive.js` renders category and tag archives
- **Grid**: 3-column StoryCard grid (responsive: 3→2→1)
- **Pagination**: Load-more button with fetchMore (BATCH_SIZE=9)
- **Sidebar**: Recent posts from other categories + SidebarBanner ad
- **Route**: `/blog/category/{slug}/` (mapped via Faust.js catch-all)

## SEO & Analytics (2026 Optimization)

- **SeoHead Component**: `components/SeoHead.js` — title, description, OG (image, type, url, site_name, locale, image:alt, image:type), Twitter card (summary_large_image, twitter:site @cbusinesspr, twitter:image:alt), article meta (published_time, modified_time, author, section). Supports webp/svg/png/jpeg image type detection.
- **JSON-LD Structured Data**: `components/JsonLd.js` — OrganizationJsonLd, WebSiteJsonLd (front-page.js), ArticleJsonLd + BreadcrumbJsonLd (single.js), BreadcrumbJsonLd (archive.js). XSS-safe serialization via `safeJsonLd()` (escapes `<`/`>` in script tags). HTML-stripped descriptions.
- **Title Format**: "Page Title | Caribbean Business" (homepage uses site name only)
- **Hero Image Preload**: `<link rel="preload">` for featured images
- **Google Analytics**: GA4 (G-F4RRT00M6P) loaded via requestIdleCallback ~3s after page load
- **robots.txt**: Dynamic via `pages/robots.txt.js` (getServerSideProps, text/plain). Uses `NEXT_PUBLIC_SITE_URL` for sitemap URL. Blocks /api/.
- **_document.js**: `lang="en"`, theme-color meta (dark/light), apple-touch-icon (180x180), favicon SVG
- **Canonical URLs**: Set on all pages

## Recombee AI Recommendations

- **Architecture**: Server-side proxy pattern. Private Token stays in API routes. Recommendations fetched client-side after cached page renders (ISR-safe).
- **Server Utilities**: `lib/recombee.js` — singleton ApiClient using `RECOMBEE_DB_ID` + `RECOMBEE_PRIVATE_TOKEN`. Optional `RECOMBEE_REGION` env var.
- **Client Utilities**: `lib/visitor-id.js` — anonymous visitor ID in localStorage (key `cb-visitor-id`). `lib/useRecombee.js` — `useTrackView(itemId)` + `useRecommendations({type, itemId, count})` hooks.
- **API Routes**:
  - `pages/api/recombee-track.js` — POST `{userId, itemId}` → `AddDetailView` (cascadeCreate)
  - `pages/api/recombee-recommend.js` — GET `?type=item-to-item|user&userId=...&itemId=...&count=6` → `{items: [...]}` with `returnProperties: true`
- **Fallback**: If Recombee returns no items or errors, related posts fall back to category-based query. Homepage "Recommended" section simply hidden.
- **Catalog Sync**: Done in WordPress CMS (not frontend). Items need properties: title, excerpt, uri, date, image_url, category, category_uri.

## Firebase Integration

- **Project**: `caribbean-business` (Firebase Console)
- **Services**: Authentication, Firestore, Cloud Messaging (FCM)
- **Config Module**: `lib/firebase.js` — initializes Firebase app, exports `auth` (Auth), `db` (Firestore), `messaging` (FCM, client-only), `app`, and `firebaseConfig`
- **Context Provider**: `components/FirebaseProvider.js` — wraps app in `_app.js`, provides `useFirebase()` hook returning `{ auth, db, messaging }`
- **Notification Prompt**: `components/NotificationPrompt.js` — auto-requests notification permission 10s after page load (once per visitor, dismissal saved in localStorage)
- **Cloud Messaging Hook**: `lib/useFirebaseMessaging.js` — `useFirebaseMessaging()` returns `{ fcmToken, permission, requestPermission }`. Handles foreground messages, permission request, and FCM token retrieval.
- **Service Worker**: `public/firebase-messaging-sw.js` — generated at build time by `scripts/generate-firebase-sw.js` (runs as `predev`/`prebuild`/`wpe-build` step). Injects `FIREBASE_API_KEY` from env vars. File is gitignored since it's generated.
- **Auth Hook**: `lib/useAuth.js` — `useAuth()` returns `{ user, loading }` from `onAuthStateChanged`. Used in Header for login/avatar state.
- **Auth Modal**: `components/AuthModal.js` + `styles/auth-modal.module.css` — Sign In / Sign Up tabs with email+password and Google Sign-In (`signInWithPopup`). Dark-themed modal with Escape-to-close, body scroll lock, `role="dialog"` / `aria-modal`. Sanitized error messages.
- **Header Auth Button**: Next to ThemeToggle in `rightActions`. Shows "Sign In" button (icon-only on mobile) when logged out, avatar with dropdown (email + Sign Out) when logged in. Outside-click closes dropdown.
- **Moosend Integration**: On new user registration (email/password or first-time Google Sign-In), a fire-and-forget POST is sent to `/api/moosend-subscribe` which subscribes the email to the Moosend list. API key stays server-side. Failures are logged but never block the auth flow.
- **Usage**: Any component can access Firebase via `const { auth, db } = useFirebase()`. For FCM: `const { requestPermission, fcmToken } = useFirebaseMessaging()`.

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_WORDPRESS_URL` | URL of the WordPress multisite (set to `https://vnmcms.wpenginepowered.com/cbusiness`) |
| `NEXT_PUBLIC_SITE_URL` | Public URL of this frontend |
| `FAUST_SECRET_KEY` | Secret key from WordPress Settings → Headless (required for preview mode) |
| `RECOMBEE_DB_ID` | Recombee database identifier (server-side only) |
| `RECOMBEE_PRIVATE_TOKEN` | Recombee private API token (server-side only, secret) |
| `RECOMBEE_REGION` | Optional Recombee region (e.g. `us-west`, `eu-west`) |
| `FIREBASE_API_KEY` | Firebase API key (mapped to `NEXT_PUBLIC_FIREBASE_API_KEY` via next.config.js for client-side use; restricted by Firebase Security Rules) |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Optional FCM VAPID key for web push (from Firebase Console → Cloud Messaging → Web Push certificates) |
| `MOOSEND_API_KEY` | Moosend API key for email list subscriptions (server-side only, secret) |
| `MOOSEND_LIST_ID` | Moosend mailing list ID to subscribe new users to |

## WPEngine Atlas Deployment

- **Node.js**: v20 (set via `engines` in package.json)
- **Build**: `wpe-build` script runs `faust build`
- **Start**: `faust start` (uses Atlas default port 8080)
- **`@wpengine/atlas-next`**: Wraps Next.js config for ISR + Atlas optimizations
- **`package-lock.json`**: Committed (removed from .gitignore) for deterministic `npm ci` builds

## Running the App

```bash
npm run dev      # Start dev server on port 5000 (local/Replit)
npm run build    # Build for production
npm run start    # Start production server (Atlas uses port 8080)
```

## AdButler Ad Units

- **Account ID**: 188652
- **Ad Components**: All in `components/ads/`
  - `AdIframe.js` — shared base iframe component
  - `StaticBanner.js` — responsive header banner (desktop 970x90 zone 909696, tablet 728x90 zone 921050, mobile 320x100 zone 921049)
  - `StickyBottomBanner.js` — fixed bottom banner (same zones as StaticBanner)
  - `SidebarBanner.js` — 300x250 sidebar ad (zone 921047)
  - `ArticleBanner.js` — in-article 300x250 ad wrapper
  - `MobileBanner.js` — 320x100 mobile-only ad (zone 909696)
  - `InterstitialAd.js` — modal overlay ad, max 1/session, 3s delay, 5s countdown (desktop 700x500, mobile 320x480)
- **Placements**: StaticBanner in Header, StickyBottomBanner in _app.js, SidebarBanner in front-page/single/archive sidebars, ArticleBanner in single post content, MobileBanner in SectionBlock, InterstitialAd in front-page/single

## Tailwind CSS

- **Version**: Tailwind CSS v4 via `@tailwindcss/postcss`
- **Config**: `postcss.config.js` with `@tailwindcss/postcss` plugin
- **Usage**: `@import "tailwindcss" source(none)` in `globals.css` with explicit `@source` directives to prevent dev server recompilation loops
- **Purpose**: Responsive utility classes for ad components (`hidden`, `block`, `md:`, `lg:` prefixes)

## Post-Merge Setup

- **Script**: `scripts/post-merge.sh` — runs `npm install` after task merges
- **Timeout**: 120s

## Replit Configuration

- Dev server runs on port `5000` with host `0.0.0.0` for Replit proxy compatibility
- Workflow: "Start application" runs `npm run dev`
