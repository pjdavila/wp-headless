import fs from "node:fs";
import path from "node:path";
import { parseCsv, parseSourceDate } from "./csv.js";
import { PendingSourceError } from "./pending.js";

/**
 * Manual-upload provider factory for PR government sources that publish
 * only PDF reports (Hacienda IVU collections, Junta de Planificación GNP,
 * Tourism Company hotel occupancy).
 *
 * The operator downloads the published report, transcribes the relevant
 * table into lib/economy/manual/<indicatorId>.csv (format documented in
 * lib/economy/manual/README.md), and commits it. The next scheduled
 * `npm run ingest-economy` run feeds those rows through the exact same
 * normalize → snapshot pipeline as the automated sources; snapshots land
 * in R2, so a single upload survives redeploys.
 *
 * Until the file exists the provider reports the indicator as PENDING via
 * PendingSourceError — the dashboard keeps showing real metadata with no
 * fabricated values.
 */

const MANUAL_DIR = path.join(process.cwd(), "lib", "economy", "manual");

export function manualFilePath(indicatorId) {
  return path.join(MANUAL_DIR, `${indicatorId}.csv`);
}

export function createManualProvider({ id, name, publisherUrl, sourceDocs }) {
  return {
    id,
    getMetadata() {
      return {
        provider: name,
        publisherUrl,
        pending: false,
        ingestionMethod: `manual-upload: lib/economy/manual/<indicatorId>.csv (${sourceDocs})`,
      };
    },
    async getSeries(indicator) {
      const filePath = manualFilePath(indicator.id);
      if (!fs.existsSync(filePath)) {
        throw new PendingSourceError(
          `${name}: no manual upload for ${indicator.id} yet — transcribe ${sourceDocs} into lib/economy/manual/${indicator.id}.csv (see lib/economy/manual/README.md)`,
        );
      }
      const text = await fs.promises.readFile(filePath, "utf8");
      const observations = parseManualCsv(text, indicator.id);
      if (observations.length === 0) {
        throw new Error(
          `${name}: lib/economy/manual/${indicator.id}.csv contained no usable rows (expected date,value[,series])`,
        );
      }
      return { observations };
    },
  };
}

/**
 * Manual upload format: one header row (date,value[,series]) optional,
 * `#` comment lines allowed, dates in any format parseSourceDate accepts
 * (ISO preferred). Exported for tests.
 */
export function parseManualCsv(text, indicatorId = "unknown") {
  const observations = [];
  for (const row of parseCsv(text)) {
    const first = String(row[0] ?? "").trim();
    if (!first || first.startsWith("#")) continue;
    const date = parseSourceDate(first);
    if (!date) continue; // header row / notes
    const value = Number(String(row[1] ?? "").trim());
    if (!Number.isFinite(value)) {
      throw new Error(
        `manual upload ${indicatorId}: row "${row.join(",")}" has a non-numeric value`,
      );
    }
    const series = String(row[2] ?? "").trim();
    observations.push({
      date,
      value,
      ...(series ? { series } : {}),
    });
  }
  return observations;
}
