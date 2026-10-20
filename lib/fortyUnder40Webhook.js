import { Blob } from "node:buffer";

/**
 * Delivery of 40 Under 40 nominations to the forms portal.
 *
 * Contract (agreed with the portal team):
 *  - POST multipart/form-data to FORTY_UNDER_40_WEBHOOK_URL (ends in
 *    /api/forms-webhook/40-under-40-caribbean-business), server-side only.
 *  - Key in the `x-form-secret` header (FORTY_UNDER_40_WEBHOOK_SECRET).
 *  - Fixed field names/values (see buildPortalFields). `id` is the nomination
 *    id and makes resends idempotent: same id => 200 { duplicate: true } and
 *    only missing files are added.
 *  - Files as real attachments (`recommendation1..3`, PDF, ≤ 5 MB each).
 *    `<field>Url` links are only accepted from a short list of hosts, so links
 *    on any other host are not sent.
 *  - 201 created, 200 duplicate, 401 bad key/URL, 400 malformed, 413 file too
 *    large, 5xx portal failure (retry later with the same id). The response's
 *    `warnings` say when a file could not be saved.
 */

export const PORTAL_EVENT = "application.created";
export const PORTAL_PROGRAM = "40under40";

const WEBHOOK_TIMEOUT_MS = 15000;
const RETRY_DELAY_MS = 750;
const MAX_ATTEMPTS = 2;

// Hosts the portal will download `<field>Url` links from. A host matches when
// it equals the domain or is a subdomain of it.
export const PORTAL_ALLOWED_LINK_DOMAINS = [
  "caribbeanbusiness.com",
  "vnmedia.co",
  "jotform.com",
  "drive.google.com",
  "docs.google.com",
  "drive.usercontent.google.com",
];

export function getFortyUnder40WebhookUrl() {
  return (process.env.FORTY_UNDER_40_WEBHOOK_URL || "").trim();
}

export function getFortyUnder40WebhookSecret() {
  return (process.env.FORTY_UNDER_40_WEBHOOK_SECRET || "").trim();
}

export function isPortalAllowedLink(url) {
  if (!url || typeof url !== "string") return false;
  let host;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    host = parsed.hostname.toLowerCase();
  } catch {
    return false;
  }
  return PORTAL_ALLOWED_LINK_DOMAINS.some(
    (d) => host === d || host.endsWith(`.${d}`),
  );
}

// The form uses "colleague" for third-party nominations; the portal calls it
// "nominate".
export function toPortalApplicantType(applicantType) {
  return applicantType === "colleague" || applicantType === "nominate"
    ? "nominate"
    : "self";
}

/**
 * Text fields exactly as the portal names them. Empty values are omitted.
 * Unknown/extra fields are deliberately not sent: the portal would store them
 * as "additional data" and clutter the record.
 */
export function buildPortalFields({ event, submittedAt, application, source }) {
  const fields = {
    id: application?.id,
    event: event || PORTAL_EVENT,
    submittedAt,
    program: PORTAL_PROGRAM,
    applicantType:
      application?.applicantType !== undefined
        ? toPortalApplicantType(application.applicantType)
        : undefined,
    nominatorName: application?.nominatorName,
    nominatorEmail: application?.nominatorEmail,
    name: application?.fullName,
    email: application?.email,
    phone: application?.phone,
    jobTitle: application?.jobTitle,
    company: application?.company,
    town: application?.town,
    country: application?.country,
    linkedin: application?.linkedin,
    bio: application?.bio,
    consent:
      application?.consent === undefined
        ? undefined
        : application.consent
          ? "true"
          : "false",
    ipPrefix: source?.ipPrefix,
    userAgent: source?.userAgent,
  };

  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null && value !== "")
      out[key] = String(value);
  }
  return out;
}

function documentBytes(doc) {
  if (doc.buffer)
    return Buffer.isBuffer(doc.buffer) ? doc.buffer : Buffer.from(doc.buffer);
  if (doc.contentBase64) return Buffer.from(doc.contentBase64, "base64");
  return null;
}

/**
 * Multipart body for one delivery. Each document is attached as a real file
 * part; its link is added only when the portal accepts that host.
 */
export function buildPortalFormData(payload) {
  const form = new FormData();
  for (const [key, value] of Object.entries(buildPortalFields(payload))) {
    form.append(key, value);
  }
  for (const doc of payload.documents || []) {
    const bytes = documentBytes(doc);
    if (bytes && bytes.length > 0) {
      form.append(
        doc.field,
        new Blob([bytes], { type: doc.contentType || "application/pdf" }),
        doc.filename || `${doc.field}.pdf`,
      );
    }
    if (isPortalAllowedLink(doc.url)) {
      form.append(`${doc.field}Url`, doc.url);
    }
  }
  return form;
}

export function buildPortalHeaders(secret) {
  const headers = { Accept: "application/json" };
  if (secret) headers["x-form-secret"] = secret;
  return headers;
}

const STATUS_HINTS = {
  400: "Portal rejected the payload as malformed — check the code.",
  401: "Portal rejected the key or the URL — check FORTY_UNDER_40_WEBHOOK_SECRET / FORTY_UNDER_40_WEBHOOK_URL.",
  413: "An attachment is larger than the portal's 5 MB limit — it must be sent as a link.",
};

function asStringList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) =>
      typeof v === "string"
        ? v
        : v && typeof v === "object"
          ? JSON.stringify(v)
          : String(v),
    )
    .map((v) => v.slice(0, 300))
    .slice(0, 20);
}

/**
 * Turns one portal response into a stored result. Never throws.
 * `retryable` is true only for portal-side failures (5xx, 408, 429).
 */
export function interpretPortalResponse(httpStatus, body) {
  const json = body && typeof body === "object" ? body : {};
  const ok = httpStatus >= 200 && httpStatus < 300;
  const result = {
    ok,
    retryable:
      !ok && (httpStatus >= 500 || httpStatus === 408 || httpStatus === 429),
    httpStatus,
    entryId:
      typeof json.entryId === "string" || typeof json.entryId === "number"
        ? String(json.entryId)
        : null,
    duplicate: json.duplicate === true,
    warnings: asStringList(json.warnings),
    addedFiles: asStringList(json.addedFiles),
    files: asStringList(json.files),
  };
  if (!ok) {
    const detail =
      typeof json.error === "string"
        ? json.error
        : typeof body === "string"
          ? body
          : "";
    result.error = [
      `Portal responded ${httpStatus}`,
      STATUS_HINTS[httpStatus],
      detail.slice(0, 300),
    ]
      .filter(Boolean)
      .join(" — ");
  }
  return result;
}

async function postOnce({ url, secret, payload, fetchImpl, timeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: buildPortalHeaders(secret),
      body: buildPortalFormData(payload),
      signal: controller.signal,
    });
    const text = await res.text().catch(() => "");
    let body = text;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      // keep raw text for the error message
    }
    return interpretPortalResponse(res.status, body);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Delivers one nomination to the portal. Retries portal-side failures and
 * timeouts once with the same id (safe: the portal de-duplicates by id). Never
 * throws, so a broken portal cannot lose an application or break the
 * submission for the candidate.
 *
 * Returns { status: "ok" | "skipped" | "failed", httpStatus?, entryId?,
 * duplicate?, warnings?, addedFiles?, error?, attempts }.
 */
export async function sendFortyUnder40Webhook(payload, options = {}) {
  const url = options.url ?? getFortyUnder40WebhookUrl();
  if (!url) {
    return {
      status: "skipped",
      reason: "FORTY_UNDER_40_WEBHOOK_URL not configured",
      attempts: 0,
    };
  }
  const secret = options.secret ?? getFortyUnder40WebhookSecret();
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs ?? WEBHOOK_TIMEOUT_MS;
  const retryDelayMs = options.retryDelayMs ?? RETRY_DELAY_MS;

  let last = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let result;
    try {
      result = await postOnce({ url, secret, payload, fetchImpl, timeoutMs });
    } catch (err) {
      const message =
        err?.name === "AbortError"
          ? `Timed out after ${timeoutMs}ms`
          : err?.message || "Network error";
      result = {
        ok: false,
        retryable: true,
        httpStatus: null,
        error: message,
        warnings: [],
        addedFiles: [],
      };
    }

    if (result.ok) {
      const { ok: _ok, retryable: _r, ...rest } = result;
      if (rest.warnings.length > 0) {
        console.warn(
          `40under40 portal warnings (${payload?.application?.id}):`,
          rest.warnings.join(" | "),
        );
      }
      return { status: "ok", ...rest, attempts: attempt };
    }

    last = { ...result, attempts: attempt };
    console.error(
      `40under40 portal delivery attempt ${attempt} failed (${payload?.application?.id}):`,
      result.error,
    );
    if (!result.retryable || attempt === MAX_ATTEMPTS) break;
    await new Promise((r) => setTimeout(r, retryDelayMs));
  }

  const { ok: _ok, retryable: _r, ...rest } = last;
  return {
    status: "failed",
    ...rest,
    error: String(rest.error || "").slice(0, 400),
  };
}
