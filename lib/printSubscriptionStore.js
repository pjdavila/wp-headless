import fs from "fs";
import path from "path";

// Append-only JSONL log of paid print subscription events. The filesystem is
// ephemeral on WPE Atlas, so this is a best-effort local copy — Odoo plus the
// team notification email are the durable records. A cancellation is recorded
// as a second event for the same stripeSubscriptionId; readers should keep
// the latest event per subscription.
const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "print-subscriptions.jsonl");

export async function appendSubscriptionEvent(record) {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  await fs.promises.appendFile(
    FILE_PATH,
    JSON.stringify(record) + "\n",
    "utf8",
  );
}

export async function readAllSubscriptionEvents() {
  let raw;
  try {
    raw = await fs.promises.readFile(FILE_PATH, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
  const out = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed));
    } catch {
      // skip corrupt line
    }
  }
  return out;
}

// Webhook idempotency: Stripe delivers events at least once, so the handler
// records each completed side-effect step per event id. On a retry (or after
// a 500 response asking Stripe to retry), completed steps are skipped.
export async function appendEventStep(eventId, step) {
  await appendSubscriptionEvent({
    type: "event-step",
    eventId,
    step,
    at: new Date().toISOString(),
  });
}

export async function getProcessedSteps(eventId) {
  const events = await readAllSubscriptionEvents();
  const steps = new Set();
  for (const record of events) {
    if (record && record.type === "event-step" && record.eventId === eventId) {
      steps.add(record.step);
    }
  }
  return steps;
}

export const PRINT_SUBSCRIPTIONS_FILE_PATH = FILE_PATH;
