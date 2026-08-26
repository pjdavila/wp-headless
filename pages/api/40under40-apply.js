import crypto from "crypto";
import { isValidMunicipality } from "../../lib/puertoRicoMunicipalities";
import { sendWelcomeEmail } from "../../lib/welcomeEmail";
import { appendApplication } from "../../lib/fortyUnder40Store";
import { sendFortyUnder40Webhook } from "../../lib/fortyUnder40Webhook";
import {
  isCloudflareStorageConfigured,
  uploadToCloudflare,
} from "../../lib/cloudflareStorage";
import {
  buildSignedFileUrl,
  requestOrigin,
  saveUpload,
  validateUpload,
} from "../../lib/fortyUnder40Files";

// Attachments arrive base64-encoded inside the JSON body, so the default 1 MB
// body limit has to cover two 5 MB files plus ~33% base64 overhead.
export const config = {
  api: {
    bodyParser: { sizeLimit: "16mb" },
  },
};

// Best-effort, in-memory rate limit. Per-process only — does not coordinate
// across serverless instances. Same deterrent used by the print-edition form.
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

async function notifyTeam({ application, photoUrl, resumeUrl, webhook }) {
  const notifyEmail =
    process.env.FORTY_UNDER_40_NOTIFY_EMAIL || process.env.PRINT_EDITION_NOTIFY_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  if (!notifyEmail || !apiKey) return;

  const rows = [
    ["Name", application.fullName],
    ["Email", application.email],
    ["Phone", application.phone],
    ["Title", application.jobTitle],
    ["Company", application.company],
    ["Town", application.town],
    ["Photo", photoUrl ? `<a href="${escapeHtml(photoUrl)}">${escapeHtml(application.photo?.originalName || "photo")}</a>` : "—"],
    ["Résumé", resumeUrl ? `<a href="${escapeHtml(resumeUrl)}">${escapeHtml(application.resume?.originalName || "resume.pdf")}</a>` : "—"],
    ["Webhook", webhook.status],
    ["IP (prefix)", application.ipPrefix],
    ["User-Agent", application.userAgent],
  ]
    .map(([label, value]) => {
      const isHtml = label === "Photo" || label === "Résumé";
      return `<tr><td><strong>${label}:</strong></td><td>${isHtml ? value : escapeHtml(value || "—")}</td></tr>`;
    })
    .join("");

  const html = `
<!DOCTYPE html><html><body style="font-family:Helvetica,Arial,sans-serif;background:#0d0e12;color:#e6e7eb;padding:24px;">
  <h2 style="color:#fff;margin:0 0 12px;">New 40 Under 40 &middot; 2026 submission</h2>
  <table cellpadding="6" style="border-collapse:collapse;font-size:14px;">
    ${rows}
  </table>
  <p style="font-size:12px;color:#6b6e7a;margin-top:16px;">Submission id: ${escapeHtml(application.id)}</p>
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
        subject: `40 Under 40 submission — ${application.fullName.replace(/[\r\n]+/g, " ")}`,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("40under40 team notify failed:", res.status, body.slice(0, 300));
    }
  } catch (err) {
    console.error("40under40 team notify error:", err.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Too many submissions. Please try again in a minute." });
  }

  const body = req.body || {};

  // Honeypot: bots fill it in, humans never see it. Answer 200 so the bot has
  // no signal that the submission was dropped.
  if (typeof body.website === "string" && body.website.trim().length > 0) {
    return res.status(200).json({ ok: true });
  }

  const fullName = sanitize(body.fullName, 120);
  const email = sanitize(body.email, 200).toLowerCase();
  const phone = sanitize(body.phone, 40);
  const jobTitle = sanitize(body.jobTitle, 120);
  const company = sanitize(body.company, 160);
  const town = sanitize(body.town, 60);
  const consent = body.consent === true;

  const errors = {};
  if (!fullName || fullName.length < 2) errors.fullName = "Please enter your full name.";
  if (!email || !isValidEmail(email)) errors.email = "Please enter a valid email address.";
  if (!phone || phone.length < 7) errors.phone = "Please enter a valid phone number.";
  if (!jobTitle) errors.jobTitle = "Please enter your title.";
  if (!company) errors.company = "Please enter your company.";
  if (!town || !isValidMunicipality(town)) errors.town = "Please select a town.";
  if (!consent) errors.consent = "Please accept the terms to submit.";

  const uploads = {};
  for (const field of ["photo", "resume"]) {
    const value = body[field];
    if (value === null || value === undefined || value === "") continue;
    const result = validateUpload(field, value);
    if (!result.ok) {
      errors[field] = result.error;
      continue;
    }
    uploads[field] = result;
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: "Please review the highlighted fields.", fields: errors });
  }

  const id = crypto.randomUUID();
  const ipPrefix = truncateIp(ip);
  const userAgent = sanitize(req.headers["user-agent"] || "", 300);
  const origin = requestOrigin(req);

  // Persist attachments before anything else so the webhook and the team email
  // can reference them. Cloudflare R2 is the real home: it survives deploys and
  // yields a short public URL. Local disk is only the fallback when R2 is not
  // configured or unreachable. A storage failure must not lose the application.
  const stored = {};
  const useCloudflare = isCloudflareStorageConfigured();

  for (const [field, upload] of Object.entries(uploads)) {
    const record = {
      storedName: null,
      url: null,
      storage: null,
      visibility: null,
      originalName: upload.originalName,
      contentType: upload.contentType,
      size: upload.size,
    };

    if (useCloudflare) {
      const key = `40under40/2026/${id}-${field}.${upload.extension}`;
      try {
        // The photo is submitted for publication, so it can live at a permanent
        // public URL. The résumé is personal data and stays behind an expiring
        // link that the export regenerates on demand.
        const result = await uploadToCloudflare({
          key,
          buffer: upload.buffer,
          contentType: upload.contentType,
          originalName: upload.originalName,
          visibility: field === "photo" ? "public" : "private",
        });
        record.url = result.url;
        record.storedName = result.key;
        record.visibility = result.visibility;
        record.storage = "cloudflare-r2";
      } catch (err) {
        console.error(`40under40 Cloudflare upload failed (${field}):`, err.message);
      }
    }

    if (!record.url) {
      try {
        const storedName = await saveUpload({
          id,
          field,
          buffer: upload.buffer,
          extension: upload.extension,
        });
        record.storedName = storedName;
        record.url = buildSignedFileUrl(origin, storedName);
        record.storage = "local";
      } catch (err) {
        console.error(`40under40 upload write failed (${field}):`, err.message);
      }
    }

    if (record.storedName) {
      stored[field] = record;
    }
  }

  const photoUrl = stored.photo?.url || null;
  const resumeUrl = stored.resume?.url || null;

  const application = {
    id,
    createdAt: new Date().toISOString(),
    program: "40-under-40-2026",
    fullName,
    email,
    phone,
    jobTitle,
    company,
    town,
    country: "PR",
    consent: true,
    status: "received",
    photo: stored.photo || null,
    resume: stored.resume || null,
    ipPrefix,
    userAgent,
  };

  // The filesystem is ephemeral on WPE Atlas, so the webhook receives the
  // document bytes inline as well as a signed link — the consumer can archive
  // the file even after the local copy is gone.
  const webhook = await sendFortyUnder40Webhook({
    event: "40under40.application.created",
    submittedAt: application.createdAt,
    application: {
      id,
      program: application.program,
      fullName,
      email,
      phone,
      jobTitle,
      company,
      town,
      country: "PR",
      consent: true,
    },
    documents: [
      stored.photo && {
        field: "photo",
        filename: stored.photo.originalName,
        contentType: stored.photo.contentType,
        size: stored.photo.size,
        url: photoUrl,
        contentBase64: uploads.photo.buffer.toString("base64"),
      },
      stored.resume && {
        field: "resume",
        filename: stored.resume.originalName,
        contentType: stored.resume.contentType,
        size: stored.resume.size,
        url: resumeUrl,
        contentBase64: uploads.resume.buffer.toString("base64"),
      },
    ].filter(Boolean),
    source: { ipPrefix, userAgent },
  });

  try {
    await appendApplication({ ...application, webhook });
  } catch (err) {
    console.error("Local store write failed (40under40Application):", err.message);
  }

  try {
    await sendWelcomeEmail({ email, name: fullName, variant: "forty-under-40" });
  } catch (err) {
    console.error("40under40 acknowledgement email failed:", err.message);
  }

  notifyTeam({ application, photoUrl, resumeUrl, webhook }).catch(() => {});

  return res.status(200).json({ ok: true });
}
