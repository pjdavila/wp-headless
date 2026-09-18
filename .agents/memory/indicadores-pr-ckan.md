---
name: indicadores.pr CKAN portal
description: The Instituto de Estadísticas' open-data portal is a CKAN instance — the integration path for PR government series, plus its broken TLS chain and per-month resource rotation.
---

# indicadores.pr CKAN portal (verified 2026-09-18)

- **PR government series are machine-readable after all.** The Instituto de
  Estadísticas publishes CPI, PRM-PMI, cement sales, external trade
  (x_naics/m_naics), and airport passengers (BTS T-100) as CSVs on
  https://indicadores.pr, a CKAN portal. NOT on the portal: IVU collections,
  GNP, hotel occupancy — those stay on the manual-upload path
  (lib/economy/manual/).
- **Never hardcode a file URL.** Resources are re-uploaded monthly with
  date-stamped names (ipc_abril2026.csv → ipc_mayo2026.csv). Resolve via
  `/api/3/action/package_show?id=<dataset>` and match the resource URL/name.
- **Broken TLS chain.** indicadores.pr serves only its leaf cert; Node fetch
  and curl both fail with UNABLE_TO_VERIFY_LEAF_SIGNATURE while browsers
  succeed (AIA fetching). Fix: node:https with the RapidSSL TLS RSA CA G1
  intermediate bundled at lib/economy/providers/certs/ (appended to
  tls.rootCertificates). The intermediate expires 2027-11-02.
- **Avoid new npm deps for parsing.** A ~100-line CSV helper parses these
  files fine; the lockfile-registry problem (Replit proxy URLs baked into
  package-lock.json) makes new deps costly.

**Why:** these facts cost live probes to learn — the TLS failure looks like a
network problem, and the resource rotation breaks any bookmarked URL.

**How to apply:** consult before touching the estadisticas-pr provider or
adding another PR-government indicator; if CKAN fetches start failing with
certificate errors after Nov 2027, re-download the intermediate from the
leaf cert's AIA "CA Issuers" URL.
