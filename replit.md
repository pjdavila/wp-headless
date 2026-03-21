# Faust.js Headless WordPress Frontend

A headless WordPress frontend built with [Faust.js](https://faustjs.org/) and Next.js, scaffolded from the official WP Engine Faust scaffold.

## Architecture

- **Framework**: Next.js 15 + Faust.js 3
- **Data Source**: WordPress via GraphQL (WPGraphQL)
- **Styling**: CSS in `styles/`
- **Templates**: WordPress page/post templates live in `wp-templates/`
- **Components**: Reusable React components in `components/`
- **Pages**: Next.js pages in `pages/` (includes API routes for Faust preview/auth)

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_WORDPRESS_URL` | URL of the WordPress site (set to `https://faustexample.wpengine.com`) |
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
