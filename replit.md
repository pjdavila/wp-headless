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
- **Optional Env Vars**:
    - `RECOMBEE_REGION`
    - `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
    - `PRINT_EDITION_NOTIFY_EMAIL` (internal address for new print-edition interest notifications)

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
- **Dynamic `robots.txt`**: Generated via `getServerSideProps` for environment-specific configuration and blocking `/api/` routes.
- **Dark Mode First**: Default dark mode with `localStorage` persistence and FOUC prevention in `_app.js`.
- **Firebase Integration**: Comprehensive Firebase services (Auth, Firestore, FCM) integrated via context providers and hooks for modularity and reusability.
- **Transactional Email with Resend**: Server-side Resend API for welcome emails, with internal logging of message IDs for deliverability tracking.
- **Print Edition Waitlist**: `/edicion-impresa/` collects interest in the future printed edition. Submissions are stored in Firestore collection `printEditionInterest` (status, town, address, IP prefix), trigger a Spanish confirmation email via Resend, and optionally notify a team inbox (`PRINT_EDITION_NOTIFY_EMAIL`).

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

## Pointers

- **Faust.js Documentation**: [https://faustjs.org/docs](https://faustjs.org/docs)
- **Next.js Documentation**: [https://nextjs.org/docs](https://nextjs.org/docs)
- **Recombee API Reference**: _Populate as you build_
- **Firebase Documentation**: [https://firebase.google.com/docs](https://firebase.google.com/docs)
- **Moosend API Documentation**: _Populate as you build_
- **Resend API Documentation**: [https://resend.com/docs](https://resend.com/docs)
- **Tailwind CSS v4 Documentation**: [https://tailwindcss.com/docs/upgrade-guide](https://tailwindcss.com/docs/upgrade-guide)
- **WPGraphQL Documentation**: [https://www.wpgraphql.com/docs/](https://www.wpgraphql.com/docs/)