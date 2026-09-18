/**
 * Dependency-free CSV/date helpers for the government-report providers
 * (indicadores.pr CKAN CSVs and manual-upload files). Deliberately small:
 * adding a spreadsheet/PDF package would bake Replit's internal npm proxy
 * into package-lock.json and break installs off-platform, and these sources
 * publish plain CSV anyway.
 */

const SPANISH_MONTHS = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

/**
 * Parses CSV text into an array of string rows. Handles BOM, CRLF, quoted
 * fields, escaped quotes ("") and embedded newlines — enough for the
 * publisher-generated files this project consumes.
 *
 * @param {string} text
 * @returns {string[][]}
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const input = text.replace(/^/, "");
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Normalizes a header cell for matching: lowercase, strips diacritics and
 * mojibake (non-ASCII publishers' files decoded as UTF-8), collapses
 * punctuation/whitespace to single spaces.
 */
export function normalizeHeader(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Finds a column by header name. `match` is compared against the normalized
 * header; mode "exact" (default) avoids partial hits like "Pasajeros
 * salientes SJU" when the grand-total column is wanted, "endsWith" covers
 * prefixed labels such as "Núm. pasajeros salientes".
 *
 * @returns {number[]} matching column indexes (usually one)
 */
export function findColumns(headerRow, match, { mode = "exact" } = {}) {
  const needle = normalizeHeader(match);
  const indexes = [];
  headerRow.forEach((cell, index) => {
    const normalized = normalizeHeader(cell);
    if (!normalized || !needle) return;
    const hit =
      mode === "endsWith" ? normalized.endsWith(needle) : normalized === needle;
    if (hit) indexes.push(index);
  });
  return indexes;
}

/**
 * Parses the date formats used by the PR government publications:
 *   "2026-04-01" / "2026-04" / "2026"   (ISO, manual uploads)
 *   "5/1/2010", "7/1/26"                (US month-first, CKAN CSVs)
 *   "abril-26", "abril-2026"            (Spanish month-year, CPI file)
 * Returns "YYYY-MM-DD" (first of the period) or null when unparseable —
 * callers treat null as "not a data row", which is what keeps titles, code
 * rows and footnotes out of the series.
 */
export function parseSourceDate(raw) {
  const text = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!text) return null;

  let m = /^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/.exec(text);
  if (m) {
    return `${m[1]}-${String(m[2] ?? 1).padStart(2, "0")}-${String(
      m[3] ?? 1,
    ).padStart(2, "0")}`;
  }

  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(text);
  if (m) {
    const month = Number(m[1]);
    if (month < 1 || month > 12) return null;
    const year = m[3].length === 2 ? expandTwoDigitYear(Number(m[3])) : m[3];
    return `${year}-${String(month).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }

  m = /^([a-záéíóúñ.]+)[-\s](\d{2}|\d{4})$/.exec(text);
  if (m) {
    const month = SPANISH_MONTHS[m[1].replace(/\.$/, "")];
    if (!month) return null;
    const year = m[2].length === 2 ? expandTwoDigitYear(Number(m[2])) : m[2];
    return `${year}-${String(month).padStart(2, "0")}-01`;
  }

  return null;
}

function expandTwoDigitYear(yy) {
  // Source files span 1984→present; anything above 50 is last century.
  return yy > 50 ? 1900 + yy : 2000 + yy;
}

/**
 * Extracts {date, value} observations from parsed CSV rows.
 *
 * The header row is located by the configured column matcher, so title rows
 * above the header (PMI file) are skipped automatically. Only rows whose
 * first cell parses as a date become observations, which drops code rows
 * ("Código") and footnotes. With several column matches (airport arrivals +
 * departures) the values are summed per row.
 *
 * @param {string[][]} rows
 * @param {{column?: string, columns?: string[], matchMode?: "exact"|"endsWith", valueScale?: number, series?: string}} config
 */
export function observationsFromRows(rows, config) {
  const wanted = config.columns ?? [config.column];
  const scale = config.valueScale ?? 1;

  let headerIndex = -1;
  let columnIndexes = [];
  for (let i = 0; i < rows.length; i += 1) {
    const indexes = wanted.flatMap((match) =>
      findColumns(rows[i], match, { mode: config.matchMode }),
    );
    if (indexes.length === wanted.length) {
      headerIndex = i;
      columnIndexes = indexes;
      break;
    }
  }
  if (headerIndex === -1) {
    throw new Error(
      `column(s) ${wanted.map((w) => `"${w}"`).join(", ")} not found in CSV header`,
    );
  }

  const observations = [];
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    const date = parseSourceDate(row[0]);
    if (!date) continue;
    let value = 0;
    let usable = false;
    for (const columnIndex of columnIndexes) {
      const parsed = Number(String(row[columnIndex] ?? "").trim());
      if (Number.isFinite(parsed)) {
        value += parsed;
        usable = true;
      }
    }
    if (!usable) continue;
    observations.push({
      date,
      value: value * scale,
      ...(config.series ? { series: config.series } : {}),
    });
  }
  return observations;
}

/**
 * Convenience wrapper: CSV text → observations. Exported separately from the
 * provider so tests can exercise parsing without network access.
 */
export function observationsFromCsv(text, config) {
  return observationsFromRows(parseCsv(text), config);
}
