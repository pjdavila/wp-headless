/**
 * Stub adapters for Puerto Rico government sources that publish economic
 * data only as PDF/Excel reports, not as a queryable API.
 *
 * These providers deliberately implement the same interface as the live
 * adapters but report `pending` and return no observations — per the product
 * rules, a source that cannot be integrated automatically is wired up and
 * clearly flagged, and its values are NEVER fabricated.
 *
 * Each stub documents the safest known ingestion method so a future task can
 * swap the stub for a real implementation (or a manual-upload flow) without
 * touching the registry, pipeline, or API.
 */

export function createPendingProvider({
  id,
  name,
  ingestionMethod,
  publisherUrl,
}) {
  return {
    id,
    pending: true,
    ingestionMethod,
    getMetadata() {
      return {
        provider: name,
        publisherUrl,
        pending: true,
        ingestionMethod,
      };
    },
    async getSeries(indicator) {
      throw new Error(
        `${name}: no automated ingestion for ${indicator.id} — ${ingestionMethod}`,
      );
    },
  };
}
