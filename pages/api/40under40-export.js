import crypto from "crypto";
import { readAllApplications } from "../../lib/fortyUnder40Store";
import { buildSignedFileUrl, requestOrigin } from "../../lib/fortyUnder40Files";
import { getCloudflareFileUrl } from "../../lib/cloudflareStorage";

const COLUMNS = [
  "createdAt",
  "id",
  "fullName",
  "email",
  "phone",
  "jobTitle",
  "company",
  "town",
  "country",
  "consent",
  "photoName",
  "photoUrl",
  "resumeName",
  "resumeUrl",
  "webhookStatus",
  "ipPrefix",
  "userAgent",
];

/**
 * Links are always regenerated at export time, never read from the stored
 * record: both the local signed links and the R2 presigned links expire, so a
 * saved URL would export dead by the time someone opens the file.
 */
async function fileUrl(file, origin) {
  if (!file || !file.storedName) return "";
  if (file.storage === "cloudflare-r2") {
    const url = await getCloudflareFileUrl({
      key: file.storedName,
      visibility: file.visibility || "private",
    });
    return url || "";
  }
  return buildSignedFileUrl(origin, file.storedName) || "";
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function toRow(record, origin) {
  return {
    createdAt: record.createdAt,
    id: record.id,
    fullName: record.fullName,
    email: record.email,
    phone: record.phone,
    jobTitle: record.jobTitle,
    company: record.company,
    town: record.town,
    country: record.country,
    consent: record.consent,
    photoName: record.photo?.originalName || "",
    photoUrl: await fileUrl(record.photo, origin),
    resumeName: record.resume?.originalName || "",
    resumeUrl: await fileUrl(record.resume, origin),
    webhookStatus: record.webhook?.status || "",
    ipPrefix: record.ipPrefix,
    userAgent: record.userAgent,
  };
}

function toCsv(rows) {
  const lines = [COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(COLUMNS.map((c) => csvEscape(row[c])).join(","));
  }
  return lines.join("\n") + "\n";
}

function timingSafeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const expected = process.env.ADMIN_EXPORT_TOKEN;
  if (!expected) {
    return res.status(503).json({ error: "Export not configured." });
  }

  const provided =
    (typeof req.headers["x-admin-token"] === "string" && req.headers["x-admin-token"]) ||
    (typeof req.query.token === "string" && req.query.token) ||
    "";

  if (!provided || !timingSafeEqual(provided, expected)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let records;
  try {
    records = await readAllApplications();
  } catch (err) {
    console.error("40under40 export read failed:", err.message);
    return res.status(500).json({ error: "Could not read the applications file." });
  }

  const origin = requestOrigin(req);
  const csv = toCsv(await Promise.all(records.map((r) => toRow(r, origin))));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="40under40-applications.csv"');
  return res.status(200).send(csv);
}
