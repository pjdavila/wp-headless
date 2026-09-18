---
name: Economic dashboard provider API facts
description: Verified external-API behavior for the economic data providers (BLS/EIA/BEA/Census) — key requirements and publication lags that drove design choices.
---

# Economic dashboard provider facts (verified 2026-09-18)

- **Census ACS API now requires a key.** Keyless requests 302-redirect to a
  "Missing Key" HTML page, even though Census docs still imply keyless access
  works at low volume. `CENSUS_API_KEY` is mandatory for the adapter.

**Why:** discovered by probing `api.census.gov` without a key during the data
layer build; a fetch that "should work" silently returns an HTML error page.

- **BEA Regional — Puerto Rico personal income table is unverified.** The API
  guide (April 2026) lists only PRGDP* tables explicitly for PR
  (GeoFips 72000). The adapter tries a fallback chain `SAINC1` → `SQINC1` from
  registry config; if both fail once `BEA_API_KEY` exists, check BEA
  GetParameterValues for the current PR income table and edit
  `providerConfig.tables` in the registry — no code change needed.

- **Federal monthly releases lag ~2 months** (LAUS July data lands late
  August), so monthly staleness thresholds are 90 days; anything tighter flags
  normal, current data as stale. BLS v2 works keyless (25 queries/day,
  10-year windows; key raises to 500/day, 20 years).

**How to apply:** consult before changing economy provider adapters,
staleness thresholds, or the registry's providerConfig; these facts are not
derivable from the code and cost live probes to learn.
