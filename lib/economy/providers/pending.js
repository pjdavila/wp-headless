/**
 * "Pending source" signaling for Puerto Rico government series whose
 * publishers offer no machine-readable feed (Hacienda IVU, Junta de
 * Planificación GNP, Tourism Company hotel occupancy).
 *
 * These sources are integrated through the documented manual-upload path
 * (see lib/economy/manual/README.md): an operator drops a transcribed CSV
 * into lib/economy/manual/ and the regular ingestion run picks it up.
 * Until that file exists, the provider throws a PendingSourceError and the
 * ingestion pipeline records status "pending" — never "error", and never
 * with fabricated values.
 */

export const PENDING_SOURCE_CODE = "ECONOMY_SOURCE_PENDING";

export class PendingSourceError extends Error {
  constructor(message) {
    super(message);
    this.name = "PendingSourceError";
    this.code = PENDING_SOURCE_CODE;
  }
}

export function isPendingSourceError(err) {
  return err?.code === PENDING_SOURCE_CODE;
}
