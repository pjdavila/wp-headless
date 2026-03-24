# Faust.js Headless WordPress Frontend

A headless WordPress frontend built with [Faust.js](https://faustjs.org/) and Next.js, scaffolded from the official WP Engine Faust scaffold.

## Architecture

- **Framework**: Next.js 15 + Faust.js 3
- **Data Source**: WordPress via GraphQL (WPGraphQL)
- **Styling**: CSS Modules in `styles/` with global design system tokens in `globals.css`
- **Templates**: WordPress page/post templates live in `wp-templates/`
- **Components**: Reusable React components in `components/`
- **Pages**: Next.js pages in `pages/` (includes API routes for Faust preview/auth)

## Design System

- **CSS Tokens**: HSL custom properties in `:root` (light) and `.dark` (dark mode) — see `styles/globals.css`
- **Typography**: Inter (sans-serif, body) loaded from Google Fonts; Georgia (serif, headings) as system font
- **Primary Color**: Green financial brand (`--primary: 130 44% 34%`)
- **Dark Mode**: Default. Toggle persists in `localStorage` key `bj-theme`. Init script in `_app.js` prevents FOUC.
- **Border Radius**: 2px (`--radius`)
- **ThemeToggle**: Component in `components/ThemeToggle.js`, rendered in Header

## Homepage Components

- **FeaturedHero**: Text-first main story with large serif title, excerpt, metadata; 4-card secondary grid alongside
- **StoryCard**: Card with featured image, green category badge, title, excerpt, author, date
- **SidebarStoryCard**: Compact numbered card with thumbnail and relative Spanish timestamps
- **SectionBlock**: Category-grouped StoryCard grid with section title and "Ver más" link
- **MarketWatchlist**: Placeholder financial data sidebar widget
- **Homepage Layout**: Hero → main+sidebar grid (sidebar at 320px, collapses on mobile)
- **Data**: Fetches 20 posts, groups by WordPress category (skips uncategorized)

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_WORDPRESS_URL` | URL of the WordPress site (set to `https://vnmcms.wpenginepowered.com`) |
| `NEXT_PUBLIC_SITE_URL` | Public URL of this frontend |
| `FAUST_SECRET_KEY` | Secret key from WordPress Settings → Headless (required for preview mode) |

## Running the App

```bash
npm run dev      # Start dev server on port 5000
npm run build    # Build for production
npm run start    # Start production server on port 5000
```

## Replit Configuration

- Dev server runs on port `5000` with host `0.0.0.0` for Replit proxy compatibility
- Workflow: "Start application" runs `npm run dev`
