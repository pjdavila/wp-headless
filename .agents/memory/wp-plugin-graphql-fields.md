---
name: Plugin-only WPGraphQL fields must be fetched separately
description: Why frontend queries must never inline GraphQL fields that only exist when a custom WordPress plugin is installed, and the pattern used instead.
---

# Plugin-only WPGraphQL fields must be fetched in their own error-swallowing request

When the frontend needs data that only exists because a custom WordPress plugin
registered it, do **not** add that field to the page's main GraphQL query. Fetch
it in a separate request that catches errors and returns null, then inject the
result as a prop server-side.

**Why:** GraphQL validates the whole document up front. If a field is not in the
schema, the server rejects the *entire* query with
`Cannot query field "x" on type "Y"` — it does not return partial data. So one
unknown plugin field takes down the whole page, not just that field. This
matters because the CMS and the frontend repo deploy independently: the frontend
can ship before the plugin is installed on WP Engine, and an editor can
deactivate a plugin at any time. The site must keep working in both states.

**How to apply:** Keep page queries to core/vanilla schema fields only. Fetch
plugin-dependent fields separately, swallowing every failure mode (network,
timeout, GraphQL validation), and do it server-side so the value is still
rendered for SEO. Have the UI hide anything empty. Group plugin fields under a
single custom object field rather than several flat ones, so only one field name
has to be probed and failure is all-or-nothing rather than partial.

Note you cannot detect the plugin's presence by inspecting the schema: public
introspection is blocked on this CMS. You have to attempt the query and handle
the failure.
