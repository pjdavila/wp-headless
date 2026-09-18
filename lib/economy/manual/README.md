# Manual uploads — PR government PDF sources

Three dashboard indicators come from sources that publish **PDF reports only**
(no API, no CSV, unstable file URLs). They are integrated through this
folder: an operator transcribes the published table into a CSV here, commits
it, and the next scheduled `npm run ingest-economy` run feeds the rows
through the same normalize → snapshot pipeline as the automated sources
(snapshots land in R2, so one upload survives redeploys and redeploys alone
never erase data).

**Never invent or estimate values.** If a file is absent the indicator shows
as `pending` on the dashboard — that is the correct state until real
published numbers are transcribed.

## File format

One file per indicator, named `<indicatorId>.csv`:

```csv
date,value
2025-07-01,123.4
2025-08-01,125.1
```

- `date`: first day of the period. ISO `YYYY-MM-DD` preferred; `YYYY-MM`,
  `YYYY`, `M/D/YYYY` and Spanish month-year (`julio-2025`) also parse.
- `value`: the published figure, in the indicator's registry unit
  (millions of USD for IVU, percent for GNP growth and hotel occupancy).
- Lines starting with `#` and a header row are ignored. Always add a
  `# source:` comment with the exact report URL and retrieval date.

After committing a file, run `node scripts/ingest-economy.mjs --force --only=<indicatorId>`
(or wait for the scheduled run) and check the dashboard.

## Per-indicator sources

### `ivu-collections.csv` — Departamento de Hacienda (monthly, millions of USD)

Page: https://hacienda.pr.gov/inversionistas/estadisticas-y-recaudos-statistics-and-revenues/ingresos-del-impuesto-sobre-ventas-y-uso-ivu-sales-and-use-tax-sut-revenues
("Distribución Mensual Recaudos IVU" — one PDF per fiscal year, e.g.
`distribucion_de_recaudos_mensuales-_ivu-junio_2026.pdf`). Transcribe the
monthly **total IVU collections** row. Fiscal years run July–June; convert
each row to a calendar date (e.g. "julio" of FY2025-26 → `2025-07-01`).

### `gnp-growth.csv` — Junta de Planificación (annual, percent)

Page: https://jp.pr.gov/informe-economico-al-gobernador — the Apéndice
Estadístico of the Informe Económico al Gobernador (annual PDF). Transcribe
the **real GNP growth** row (constant dollars, fiscal years). Date =
`YYYY-01-01` of the fiscal year's calendar start (FY2024 → `2023-01-01` is
NOT used; use `2024-01-01` labeled by fiscal year, per the report's own
labeling). Update once a year when the new Informe appears.

### `hotel-occupancy.csv` — Puerto Rico Tourism Company (monthly, percent)

Page: https://tourism.pr.gov/statistics-2 — the monthly "Selected Lodging
Properties" report (PDF, e.g. `selected-lodgs-monthly-report.pdf`).
Transcribe the island-wide **occupancy rate** per month.
