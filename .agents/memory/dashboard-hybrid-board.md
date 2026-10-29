---
name: Hybrid economic board rules
description: Non-obvious rules for /dashboard/ mixing live data-layer values with the prototype's fixed AI-collected snapshot.
---
- The prototype snapshot (AI-collected 18 Sept 2026, not editorially validated) must reach the browser only via the authenticated fixed-snapshot API, never bundled in page JS.
  **Why:** the dashboard is members-only and served HTML/JS must carry no economic values.
  **How to apply:** new fixed figures go in the server-only prototype data files, not in components or client config.
- A live indicator replaces a fixed value only when it has usable observations; pending/error sources fall back to the fixed value with its visible "Dato fijo" marker, or an empty state. Never label fixed data as live.
  **Why:** user decision when the board was rebuilt (hybrid data, honest provenance).
- Some live series differ in definition from the prototype's (BLS NSA jobs vs DDEC SA, total IVU vs General Fund share, all PR airports vs SJU); those charts get retitled copy and a note flag instead of silently swapping numbers.
- As of Oct 2026 population/income/poverty (Census needs a key) and electricity price/use are in error, gnp-growth pending — so those tiles show fixed data. That is expected, not a bug.
