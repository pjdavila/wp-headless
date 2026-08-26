---
name: Lockfile tarball URLs must stay on the public registry
description: Replit's package proxy writes internal-host tarball URLs into package-lock.json, which breaks any install that runs outside Replit.
---

# Lockfile tarball URLs must stay on the public registry

Every `resolved` URL in `package-lock.json` must point at `https://registry.npmjs.org/`.
After installing or updating any dependency inside Replit, check the lockfile for
tarball URLs pointing at Replit's internal package-proxy host and rewrite them back
to the public registry before committing.

**Why:** installing a package inside Replit goes through a local package-firewall
proxy, and npm records that proxy's hostname as the `resolved` URL for every newly
added package. npm only rewrites `resolved` hosts that already point at the *default*
registry, so a proxy hostname is used verbatim by any other builder. Committing such
a lockfile ships an install that only works inside Replit: an external CI or hosting
build (WP Engine Atlas here) cannot resolve that host, and the failure surfaces far
from its cause — the install step dies with a generic npm crash, the buildpack keeps
going with a half-populated `node_modules`, and the build then fails with a
"command not found" for a CLI that should have been installed.

**How to apply:** grep the lockfile for the proxy hostname after any dependency
change; rewrite to the public registry with a plain substitution. Integrity hashes
are content-based, so they stay valid and no reinstall is required. A local
`npm ci` still works afterwards because npm transparently redirects public-registry
URLs back through the proxy at request time. Beware: a later plain `npm install`
re-introduces the proxy URLs, so re-check before every push.

**Related trap:** the same proxy refuses to serve versions it flags with critical
CVEs, which can make a clean `npm ci` impossible locally even though the versions
install fine elsewhere. Fix it by adding `overrides` that bump the offending
transitive package to a patched release, not by bypassing the proxy.
