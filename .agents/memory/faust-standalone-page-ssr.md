---
name: Faust standalone pages don't SSR their queries
description: Why content on a pages/ route renders as a loading state in the HTML, and what to do instead
---

Listing a GraphQL document in `SomePage.queries` and calling Faust's
`getNextStaticProps` does **not** put that data in the server-rendered HTML for a
plain Next `pages/` route. Only the WordPress templates (routed through the
catch-all node route) get seeded data, because Faust resolves the seed node and
its template queries during static generation.

On a standalone page the Apollo cache is empty on the server, so `useQuery`
returns `loading: true` and the HTML ships the loading/skeleton branch. Crawlers
and social scrapers see nothing.

**Why:** discovered while building a page that had to be indexable — the HTML was
~18KB of chrome plus "Loading…", while a template-driven page rendered ~330KB of
real content from the same kind of query.

**How to apply:** when a `pages/` route must be server-rendered, fetch the data
yourself inside `getStaticProps` (POST to the WPGraphQL endpoint, `print()` the
gql document), pass it down as props, and merge the result into what
`getNextStaticProps` returns — spread the Faust props, add your own, and repeat
`revalidate` at the top level. Keep `Page.queries` only for the chrome (site
settings, header menu), which the rest of the site already tolerates hydrating
client-side.
