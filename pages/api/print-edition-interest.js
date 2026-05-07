import { isValidMunicipality } from "../../lib/puertoRicoMunicipalities";
import { sendWelcomeEmail } from "../../lib/welcomeEmail";
import { appendInterest } from "../../lib/printEditionStore";

// Best-effort, in-memory rate limit. Per-process only — does not coordinate
// across serverless instances. Acceptable as a basic abuse deterrent given
// the absence of a shared store (Redis/firebase-admin) in this codebase.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const ipHits = new Map();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) {
    return fwd.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function truncateIp(ip) {
  if (!ip || ip === "unknown") return "unknown";
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return parts.slice(0, 4).join(":") + "::";
  }
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  return "unknown";
}

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
    ipHits.set(ip, { start: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT_MAX;
}

function sanitize(value, max = 200) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidZip(value) {
  return /^\d{5}(-\d{4})?$/.test(value);
}

async function notifyTeam({
  fullName,
  email,
  phone,
  addressLine1,
  addressLine2,
  town,
  zip,
  userAgent,
  ipPrefix,
}) {
  const notifyEmail = process.env.PRINT_EDITION_NOTIFY_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  if (!notifyEmail || !apiKey) return;

  const eFullName = escapeHtml(fullName);
  const eEmail = escapeHtml(email);
  const ePhone = escapeHtml(phone);
  const eAddr1 = escapeHtml(addressLine1);
  const eAddr2 = addressLine2 ? escapeHtml(addressLine2) : "";
  const eTown = escapeHtml(town);
  const eZip = escapeHtml(zip);
  const eUA = escapeHtml(userAgent || "");
  const eIp = escapeHtml(ipPrefix || "");

  const html = `
<!DOCTYPE html><html><body style="font-family:Helvetica,Arial,sans-serif;background:#0d0e12;color:#e6e7eb;padding:24px;">
  <h2 style="color:#fff;margin:0 0 12px;">Nuevo interesado en la edición impresa</h2>
  <table cellpadding="6" style="border-collapse:collapse;font-size:14px;">
    <tr><td><strong>Nombre:</strong></td><td>${eFullName}</td></tr>
    <tr><td><strong>Email:</strong></td><td>${eEmail}</td></tr>
    <tr><td><strong>Teléfono:</strong></td><td>${ePhone}</td></tr>
    <tr><td><strong>Dirección 1:</strong></td><td>${eAddr1}</td></tr>
    <tr><td><strong>Dirección 2:</strong></td><td>${eAddr2}</td></tr>
    <tr><td><strong>Pueblo:</strong></td><td>${eTown}</td></tr>
    <tr><td><strong>Código postal:</strong></td><td>${eZip}</td></tr>
    <tr><td><strong>IP (prefijo):</strong></td><td>${eIp}</td></tr>
    <tr><td><strong>User-Agent:</strong></td><td>${eUA}</td></tr>
  </table>
</body></html>`.trim();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Caribbean Business <noreply@caribbean.business>",
        to: [notifyEmail],
        subject: `Nuevo interesado: edición impresa — ${fullName.replace(/[\r\n]+/g, " ")}`,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("Print interest team notify failed:", res.status, body.slice(0, 300));
    }
  } catch (err) {
    console.error("Print interest team notify error:", err.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Demasiadas solicitudes. Intenta de nuevo en un minuto." });
  }

  const body = req.body || {};

  if (typeof body.website === "string" && body.website.trim().length > 0) {
    return res.status(200).json({ ok: true });
  }

  const fullName = sanitize(body.fullName, 120);
  const email = sanitize(body.email, 200).toLowerCase();
  const phone = sanitize(body.phone, 40);
  const addressLine1 = sanitize(body.addressLine1, 200);
  const addressLine2 = sanitize(body.addressLine2, 200);
  const town = sanitize(body.town, 60);
  const zip = sanitize(body.zip, 10);
  const consent = body.consent === true;

  const errors = {};
  if (!fullName || fullName.length < 2) errors.fullName = "Nombre requerido";
  if (!email || !isValidEmail(email)) errors.email = "Email inválido";
  if (!phone || phone.length < 7) errors.phone = "Teléfono requerido";
  if (!addressLine1) errors.addressLine1 = "Dirección requerida";
  if (!town || !isValidMunicipality(town)) errors.town = "Pueblo inválido";
  if (!zip || !isValidZip(zip)) errors.zip = "Código postal inválido";
  if (!consent) errors.consent = "Debes aceptar el uso de datos";

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: "Revisa los campos del formulario.", fields: errors });
  }

  const ipPrefix = truncateIp(ip);
  const userAgent = sanitize(req.headers["user-agent"] || "", 300);

  try {
    await appendInterest({
      fullName,
      email,
      phone,
      addressLine1,
      addressLine2: addressLine2 || null,
      town,
      zip,
      country: "PR",
      status: "pending",
      consent: true,
      ipPrefix,
      userAgent,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Local store write failed (printEditionInterest):", err.message);
    return res.status(500).json({ error: "No pudimos guardar tu registro. Intenta de nuevo en unos minutos." });
  }

  try {
    await sendWelcomeEmail({ email, name: fullName, variant: "print-edition-interest" });
  } catch (err) {
    console.error("Print interest welcome email failed:", err.message);
  }

  notifyTeam({
    fullName,
    email,
    phone,
    addressLine1,
    addressLine2,
    town,
    zip,
    userAgent,
    ipPrefix,
  }).catch(() => {});

  return res.status(200).json({ ok: true });
}
