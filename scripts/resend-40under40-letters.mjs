// One-off resend of 40 Under 40 recommendation letters to the forms portal.
//
// Letters live in Cloudflare R2 as 40under40/2026/<nominationId>-recommendationN.pdf.
// Each nomination is resent with its ORIGINAL id; the portal de-duplicates by
// id, keeps the data it already has, and only adds the files it was missing.
//
// Usage:
//   npm run resend:40under40                      # dry run (default): list what would be sent
//   npm run resend:40under40 -- --ids=<id>,<id>   # limit to specific nominations
//   npm run resend:40under40 -- --execute --ids=<id>,<id>
//                                                 # actually send; ids MUST be confirmed by the portal
//                                                 # (needs FORTY_UNDER_40_WEBHOOK_URL/SECRET)
//
// Requires R2_* credentials. Never run --execute without the team's go-ahead.

import {
  getCloudflareObject,
  isCloudflareStorageConfigured,
  listCloudflareObjects,
} from "../lib/cloudflareStorage.js";
import {
  getFortyUnder40WebhookSecret,
  getFortyUnder40WebhookUrl,
  PORTAL_EVENT,
  sendFortyUnder40Webhook,
} from "../lib/fortyUnder40Webhook.js";
import { readAllApplications } from "../lib/fortyUnder40Store.js";

const PREFIX = "40under40/2026/";
const KEY_RE = /^40under40\/2026\/([0-9a-f-]{36})-(recommendation[123])\.pdf$/;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

function parseArgs(argv) {
  const args = { execute: false, ids: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--execute") args.execute = true;
    else if (arg.startsWith("--ids=")) args.ids = arg.slice(6);
    else if (arg === "--ids") args.ids = argv[++i] || "";
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.ids !== null) {
    args.ids = args.ids
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  return args;
}

function formatBytes(n) {
  return n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(n / 1024)} KB`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      "See the header of scripts/resend-40under40-letters.mjs for usage.",
    );
    return;
  }
  if (!isCloudflareStorageConfigured()) {
    throw new Error(
      "Cloudflare R2 is not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET).",
    );
  }
  // A resend of an id the portal does not know creates a new, data-less entry.
  // Execute mode therefore only runs on an explicit list of ids that the
  // portal team has confirmed exist on their side.
  if (args.execute && (!args.ids || args.ids.length === 0)) {
    throw new Error(
      "--execute requires --ids=<id>,<id> with the nomination ids confirmed by the portal.",
    );
  }
  if (args.execute && !getFortyUnder40WebhookUrl()) {
    throw new Error("FORTY_UNDER_40_WEBHOOK_URL is not set — cannot execute.");
  }
  if (args.execute && !getFortyUnder40WebhookSecret()) {
    throw new Error(
      "FORTY_UNDER_40_WEBHOOK_SECRET is not set — cannot execute.",
    );
  }

  const objects = await listCloudflareObjects(PREFIX);
  const byId = new Map();
  const ignored = [];
  for (const obj of objects) {
    const m = KEY_RE.exec(obj.key);
    if (!m) {
      ignored.push(obj.key);
      continue;
    }
    const [, id, field] = m;
    if (!byId.has(id))
      byId.set(id, { id, files: [], firstSeen: obj.lastModified });
    const entry = byId.get(id);
    entry.files.push({ field, key: obj.key, size: obj.size });
    if (
      obj.lastModified &&
      (!entry.firstSeen || obj.lastModified < entry.firstSeen)
    ) {
      entry.firstSeen = obj.lastModified;
    }
  }

  // Local records only exist where the nomination was submitted (the WPE
  // filesystem is wiped on deploy). When present they add the text fields;
  // otherwise only id + files are sent, which the portal treats as a resend.
  const local = new Map((await readAllApplications()).map((r) => [r.id, r]));

  let targets = [...byId.values()].sort((a, b) =>
    a.firstSeen > b.firstSeen ? 1 : -1,
  );
  const missing = [];
  if (args.ids) {
    const wanted = new Set(args.ids);
    targets = targets.filter((t) => wanted.has(t.id));
    for (const id of args.ids) if (!byId.has(id)) missing.push(id);
  }

  console.log(`Mode: ${args.execute ? "EXECUTE" : "dry run"}`);
  console.log(
    `R2 objects under ${PREFIX}: ${objects.length} (${ignored.length} not recognized as letters)`,
  );
  console.log(
    `Nominations with letters: ${byId.size}${args.ids ? `; selected: ${targets.length}` : ""}\n`,
  );

  const summary = [];
  for (const target of targets) {
    target.files.sort((a, b) => a.field.localeCompare(b.field));
    const record = local.get(target.id);
    const tooBig = target.files.filter((f) => f.size > MAX_ATTACHMENT_BYTES);
    console.log(
      `${target.id}  ${target.files.length} letter(s)  ${record ? `local data: ${record.fullName}` : "no local data (id + files only)"}`,
    );
    for (const f of target.files) {
      console.log(
        `    ${f.field}  ${formatBytes(f.size)}${f.size > MAX_ATTACHMENT_BYTES ? "  (over 5 MB — portal will reject)" : ""}`,
      );
    }

    if (!args.execute) {
      summary.push({
        id: target.id,
        result: "dry-run",
        files: target.files.length,
      });
      continue;
    }
    if (tooBig.length > 0) {
      console.log("    → skipped: an attachment is over 5 MB");
      summary.push({ id: target.id, result: "skipped (>5 MB)" });
      continue;
    }

    const documents = [];
    for (const f of target.files) {
      const obj = await getCloudflareObject(f.key);
      documents.push({
        field: f.field,
        filename: obj.filename || `${f.field}.pdf`,
        contentType: "application/pdf",
        buffer: obj.buffer,
      });
    }

    const result = await sendFortyUnder40Webhook({
      event: PORTAL_EVENT,
      submittedAt:
        record?.createdAt ||
        (target.firstSeen
          ? new Date(target.firstSeen).toISOString()
          : undefined),
      application: record
        ? {
            id: target.id,
            applicantType: record.applicantType,
            nominatorName: record.nominatorName,
            nominatorEmail: record.nominatorEmail,
            fullName: record.fullName,
            email: record.email,
            phone: record.phone,
            jobTitle: record.jobTitle,
            company: record.company,
            town: record.town,
            country: record.country,
            linkedin: record.linkedin,
            bio: record.bio,
            consent: record.consent,
          }
        : { id: target.id },
      documents,
    });

    const label =
      result.status !== "ok"
        ? `FAILED — ${result.error}`
        : result.duplicate
          ? `ok (HTTP ${result.httpStatus}, duplicate) added: ${result.addedFiles.join(", ") || "none"}`
          : `ok (HTTP ${result.httpStatus}) NEW entry ${result.entryId || ""} — the portal did not know this id`;
    console.log(`    → ${label}`);
    if (result.warnings?.length)
      console.log(`    warnings: ${result.warnings.join(" | ")}`);
    summary.push({
      id: target.id,
      result: result.status,
      httpStatus: result.httpStatus,
      duplicate: result.duplicate,
      addedFiles: result.addedFiles?.join(", "),
      warnings: result.warnings?.join(" | "),
    });
  }

  if (missing.length > 0) {
    console.log(
      `\nRequested ids with NO letters in R2 (cannot be recovered from here):`,
    );
    for (const id of missing) console.log(`    ${id}`);
  }

  console.log("");
  console.table(summary);
  if (args.execute && summary.some((s) => s.result === "failed"))
    process.exitCode = 1;
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
