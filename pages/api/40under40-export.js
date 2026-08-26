import crypto from "crypto";
import { readAllApplications } from "../../lib/fortyUnder40Store";
import { buildSignedFileUrl, requestOrigin } from "../../lib/fortyUnder40Files";

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

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toRow(record, origin) {
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
    photoUrl: record.photo?.storedName ? buildSignedFileUrl(origin, record.photo.storedName) : "",
    resumeName: record.resume?.originalName || "",
    resumeUrl: record.resume?.storedName ? buildSignedFileUrl(origin, record.resume.storedName) : "",
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
  const csv = toCsv(records.map((r) => toRow(r, origin)));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="40under40-applications.csv"');
  return res.status(200).send(csv);
}
