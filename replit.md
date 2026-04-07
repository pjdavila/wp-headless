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
- **Sidebar**: Recent posts from other categories + ad placeholder
- **Route**: `/blog/category/{slug}/` (mapped via Faust.js catch-all)

## SEO & Analytics

- **SeoHead Component**: Reusable `components/SeoHead.js` renders title, description, OG, Twitter card tags
- **Title Format**: "Page Title | Business Journal Caribe" (homepage uses site name only)
- **OG Tags**: og:title, og:description, og:image, og:type, og:url, og:site_name, og:locale
- **Twitter Cards**: summary_large_image when OG image present, summary otherwise
- **Article Meta**: article:published_time, article:author for posts
- **Hero Image Preload**: `<link rel="preload">` for featured images
- **Google Analytics**: GA4 (G-F4RRT00M6P) loaded via requestIdleCallback ~3s after page load
- **robots.txt**: Blocks /api/ from crawlers
- **Sitemap**: Faust.js built-in sitemap generation via `/sitemap.xml`
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

## Replit Configuration

- Dev server runs on port `5000` with host `0.0.0.0` for Replit proxy compatibility
- Workflow: "Start application" runs `npm run dev`
