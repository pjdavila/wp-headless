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
- **Homepage Layout**: Hero → ExploreCategories → main+sidebar grid (sidebar at 320px, collapses on mobile)
- **Data**: Fetches 20 posts, groups by WordPress category (skips uncategorized)

## Article Page Components

- **ShareMenu**: Facebook, X, LinkedIn share + copy-to-clipboard with tooltip
- **PhotoGallery**: Lightbox with keyboard navigation for posts with 2+ embedded images
- **Reading Time**: Word count estimator (200 WPM), shown in metadata bar
- **Related Posts**: Up to 3 posts from same category via nested GraphQL query
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

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_WORDPRESS_URL` | URL of the WordPress multisite (set to `https://vnmcms.wpenginepowered.com/cbusiness`) |
| `NEXT_PUBLIC_SITE_URL` | Public URL of this frontend |
| `FAUST_SECRET_KEY` | Secret key from WordPress Settings → Headless (required for preview mode) |

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
