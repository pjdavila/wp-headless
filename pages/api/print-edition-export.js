import crypto from "crypto";
import { readAllInterests } from "../../lib/printEditionStore";

const COLUMNS = [
  "createdAt",
  "fullName",
  "email",
  "phone",
  "addressLine1",
  "addressLine2",
  "town",
  "zip",
  "country",
  "status",
  "consent",
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
    return res.status(405).json({ error: "Method not allowed" });
  }

  const expected = process.env.ADMIN_EXPORT_TOKEN;
  if (!expected) {
    return res.status(503).json({ error: "Export no configurado." });
  }

  const provided =
    (typeof req.headers["x-admin-token"] === "string" && req.headers["x-admin-token"]) ||
    (typeof req.query.token === "string" && req.query.token) ||
    "";

  if (!provided || !timingSafeEqual(provided, expected)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let rows;
  try {
    rows = await readAllInterests();
  } catch (err) {
    console.error("Print interest export read failed:", err.message);
    return res.status(500).json({ error: "No pudimos leer el archivo." });
  }

  const csv = toCsv(rows);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="print-edition-interest.csv"'
  );
  return res.status(200).send(csv);
}
