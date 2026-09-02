import crypto from "crypto";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOAD_DIR = path.join(DATA_DIR, "40under40-uploads");

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB per file

// field -> accepted content types -> canonical extension.
export const UPLOAD_FIELDS = {
  photo: {
    label: "Professional photo",
    types: {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    },
  },
  resume: {
    label: "Résumé / bio (PDF)",
    types: {
      "application/pdf": "pdf",
    },
  },
  recommendation: {
    label: "Recommendation letter (PDF)",
    types: {
      "application/pdf": "pdf",
    },
  },
};

const STORED_NAME_RE = /^[a-f0-9-]{36}-(photo|resume|recommendation)\.(jpg|png|webp|pdf)$/;

/**
 * Content sniffing so a renamed executable cannot pass as an image just because
 * the browser (or a scripted client) declared a friendly content type.
 */
function sniffMatches(buffer, contentType) {
  if (buffer.length < 12) return false;
  switch (contentType) {
    case "application/pdf":
      return buffer.subarray(0, 5).toString("latin1") === "%PDF-";
    case "image/png":
      return buffer.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      );
    case "image/jpeg":
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/webp":
      return (
        buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
        buffer.subarray(8, 12).toString("latin1") === "WEBP"
      );
    default:
      return false;
  }
}

/**
 * Validates one client-submitted attachment. Returns either
 * `{ ok: true, buffer, extension, contentType, originalName, size }`
 * or `{ ok: false, error }` with an English, user-facing message.
 */
export function validateUpload(field, value) {
  const spec = UPLOAD_FIELDS[field];
  if (!spec) return { ok: false, error: "Unknown attachment." };

  if (!value || typeof value !== "object") {
    return { ok: false, error: "Invalid attachment." };
  }

  const contentType = typeof value.contentType === "string" ? value.contentType.toLowerCase() : "";
  const extension = spec.types[contentType];
  if (!extension) {
    return {
      ok: false,
      error:
        field === "resume"
          ? "The résumé must be a PDF file."
          : field === "recommendation"
            ? "The recommendation letter must be a PDF file."
            : "The photo must be a JPG, PNG or WebP image.",
    };
  }

  const data = typeof value.data === "string" ? value.data : "";
  // Accept both a bare base64 payload and a data: URL.
  const base64 = data.includes(",") && data.startsWith("data:") ? data.slice(data.indexOf(",") + 1) : data;
  if (!base64 || !/^[A-Za-z0-9+/=\s]+$/.test(base64)) {
    return { ok: false, error: "We could not read that file. Try uploading it again." };
  }

  let buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return { ok: false, error: "We could not read that file. Try uploading it again." };
  }

  if (buffer.length === 0) {
    return { ok: false, error: "That file is empty." };
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "That file is larger than 5 MB." };
  }
  if (!sniffMatches(buffer, contentType)) {
    return {
      ok: false,
      error:
        "That file does not look like a valid " +
        (field === "resume" || field === "recommendation" ? "PDF." : "image."),
    };
  }

  const rawName = typeof value.name === "string" ? value.name : "";
  const originalName =
    rawName.replace(/[\u0000-\u001F\u007F]/g, "").replace(/[\\/]/g, "-").trim().slice(0, 120) ||
    `${field}.${extension}`;

  return { ok: true, buffer, extension, contentType, originalName, size: buffer.length };
}

export async function saveUpload({ id, field, buffer, extension }) {
  const storedName = `${id}-${field}.${extension}`;
  if (!STORED_NAME_RE.test(storedName)) {
    throw new Error(`Refusing to write unsafe upload name: ${storedName}`);
  }
  await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.promises.writeFile(path.join(UPLOAD_DIR, storedName), buffer);
  return storedName;
}

export function isValidStoredName(name) {
  return typeof name === "string" && STORED_NAME_RE.test(name);
}

export function uploadPath(storedName) {
  if (!isValidStoredName(storedName)) return null;
  return path.join(UPLOAD_DIR, storedName);
}

export function contentTypeForStoredName(storedName) {
  if (storedName.endsWith(".pdf")) return "application/pdf";
  if (storedName.endsWith(".png")) return "image/png";
  if (storedName.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function fileSecret() {
  return process.env.SESSION_SECRET || process.env.ADMIN_EXPORT_TOKEN || "";
}

export function signStoredName(storedName, expiresAt) {
  const secret = fileSecret();
  if (!secret) return "";
  return crypto.createHmac("sha256", secret).update(`${storedName}:${expiresAt}`).digest("hex");
}

export function verifyFileSignature(storedName, expiresAt, signature) {
  if (!isValidStoredName(storedName)) return false;
  const exp = Number(expiresAt);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = signStoredName(storedName, String(expiresAt));
  if (!expected || typeof signature !== "string" || signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

const DEFAULT_LINK_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

/**
 * Signed, expiring URL so the webhook consumer (and the team) can fetch a
 * document without an admin token, while the file stays unreachable to anyone
 * who merely guesses the filename.
 */
export function buildSignedFileUrl(baseUrl, storedName, ttlMs = DEFAULT_LINK_TTL_MS) {
  if (!storedName || !baseUrl) return null;
  const expiresAt = String(Date.now() + ttlMs);
  const sig = signStoredName(storedName, expiresAt);
  if (!sig) return null;
  const params = new URLSearchParams({ file: storedName, exp: expiresAt, sig });
  // Trailing slash matters: next.config.js sets `trailingSlash: true`, so the
  // slashless form answers with a 308 before the file is ever served.
  return `${baseUrl.replace(/\/+$/, "")}/api/40under40-file/?${params.toString()}`;
}

/**
 * NEXT_PUBLIC_SITE_URL points at the WordPress CMS in this project, so the
 * public origin of the frontend has to come from the request itself.
 */
export function requestOrigin(req) {
  const proto =
    (typeof req.headers["x-forwarded-proto"] === "string" &&
      req.headers["x-forwarded-proto"].split(",")[0].trim()) ||
    "https";
  const host =
    (typeof req.headers["x-forwarded-host"] === "string" &&
      req.headers["x-forwarded-host"].split(",")[0].trim()) ||
    req.headers.host;
  if (!host) return "";
  return `${proto}://${host}`;
}
