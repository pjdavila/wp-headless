import { Blob } from "node:buffer";

const WEBHOOK_TIMEOUT_MS = 10000;
const RETRY_DELAY_MS = 500;

export function getFortyUnder40WebhookUrl() {
  const url = process.env.FORTY_UNDER_40_WEBHOOK_URL || "";
  return url.trim();
}

function getFortyUnder40WebhookSecret() {
  const secret = process.env.FORTY_UNDER_40_WEBHOOK_SECRET || "";
  return secret.trim();
}

/**
 * The receiving form service reads flat fields and real file parts: sending the
 * same data as a JSON body is accepted but arrives with no documents attached,
 * so the payload is always built as multipart/form-data.
 */
function buildFormData({ event, submittedAt, application, documents, source }) {
  const form = new FormData();

  const fields = {
    event,
    submittedAt,
    id: application.id,
    program: application.program,
    applicantType: application.applicantType,
    nominatorName: application.nominatorName,
    nominatorEmail: application.nominatorEmail,
    // Sent under both names because the receiver matches on common field names.
    name: application.fullName,
    fullName: application.fullName,
    email: application.email,
    phone: application.phone,
    jobTitle: application.jobTitle,
    title: application.jobTitle,
    company: application.company,
    town: application.town,
    city: application.town,
    linkedin: application.linkedin,
    bio: application.bio,
    country: application.country,
    consent: application.consent ? "true" : "false",
    ipPrefix: source?.ipPrefix,
    userAgent: source?.userAgent,
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null && value !== "") {
      form.append(key, String(value));
    }
  }

  for (const doc of documents) {
    // The signed link is sent alongside the bytes: the bytes are what survive,
    // the link is what a human in the receiving inbox can click.
    if (doc.url) {
      form.append(`${doc.field}Url`, doc.url);
    }
    const bytes = Buffer.from(doc.contentBase64, "base64");
    form.append(
      doc.field,
      new Blob([bytes], { type: doc.contentType }),
      doc.filename,
    );
  }

  return form;
}

async function postOnce(url, secret, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  const headers = { Accept: "application/json" };
  if (secret) {
    headers.Authorization = `Bearer ${secret}`;
  }

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: buildFormData(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Webhook responded ${res.status}: ${body.slice(0, 300)}`);
  }

  return true;
}

/**
 * Delivers one application to the external webhook. Bounded by a timeout with a
 * single retry; never throws, so a broken webhook cannot lose an application or
 * break the submission for the candidate.
 *
 * Returns { status: "ok" | "skipped" | "failed", error?, attempts }.
 */
export async function sendFortyUnder40Webhook(payload) {
  const url = getFortyUnder40WebhookUrl();
  if (!url) {
    return { status: "skipped", reason: "FORTY_UNDER_40_WEBHOOK_URL not configured", attempts: 0 };
  }

  const secret = getFortyUnder40WebhookSecret();

  let lastError = "";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await postOnce(url, secret, payload);
      return { status: "ok", attempts: attempt };
    } catch (err) {
      lastError = err?.name === "AbortError" ? `Timed out after ${WEBHOOK_TIMEOUT_MS}ms` : err.message;
      console.error(`40under40 webhook attempt ${attempt} failed:`, lastError);
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }

  return { status: "failed", error: lastError.slice(0, 300), attempts: 2 };
}
