import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 storage for 40 Under 40 attachments.
 *
 * The WPE Atlas filesystem is ephemeral, so anything written to `data/` is gone
 * after a deploy. R2 keeps the files permanently and gives the team a Cloudflare
 * URL instead of a long signed link back to this server.
 *
 * Two buckets, on purpose. R2 public access is granted per *bucket* (a r2.dev
 * URL or a custom domain exposes every object in it), so privacy cannot be a
 * per-object flag — it has to be a storage boundary:
 *
 *  - `R2_BUCKET` — private, no public domain. Holds the résumé, which is
 *    personal data, reachable only through a presigned URL that expires.
 *  - `R2_PUBLIC_BUCKET` + `R2_PUBLIC_BASE_URL` — optional public bucket for the
 *    candidate photo, which is submitted for publication. Gives a short,
 *    permanent URL. When it is not configured the photo simply lives in the
 *    private bucket behind an expiring link too.
 *
 * When R2 is not configured at all the caller falls back to local storage, so
 * the form keeps working in development and if the credentials are removed.
 */

const ACCOUNT_ID = () => (process.env.R2_ACCOUNT_ID || "").trim();
const ACCESS_KEY_ID = () => (process.env.R2_ACCESS_KEY_ID || "").trim();
const SECRET_ACCESS_KEY = () => (process.env.R2_SECRET_ACCESS_KEY || "").trim();
const PRIVATE_BUCKET = () => (process.env.R2_BUCKET || "").trim();
const PUBLIC_BUCKET = () => (process.env.R2_PUBLIC_BUCKET || "").trim();
const PUBLIC_BASE_URL = () => (process.env.R2_PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");

// SigV4 caps presigned URLs at 7 days.
export const PRESIGNED_TTL_SECONDS = 7 * 24 * 60 * 60;

const OBJECT_KEY_RE = /^[a-zA-Z0-9/._-]{1,200}$/;

export function isCloudflareStorageConfigured() {
  return Boolean(ACCOUNT_ID() && ACCESS_KEY_ID() && SECRET_ACCESS_KEY() && PRIVATE_BUCKET());
}

/**
 * A public URL is only usable when it belongs to a bucket that is *not* the
 * private one — otherwise publishing it would expose every résumé as well.
 */
export function hasCloudflarePublicBucket() {
  const pub = PUBLIC_BUCKET();
  return Boolean(pub && PUBLIC_BASE_URL() && pub !== PRIVATE_BUCKET());
}

let cachedClient = null;
let cachedClientKey = "";

function getClient() {
  const key = `${ACCOUNT_ID()}:${ACCESS_KEY_ID()}`;
  if (cachedClient && cachedClientKey === key) return cachedClient;
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${ACCOUNT_ID()}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ACCESS_KEY_ID(),
      secretAccessKey: SECRET_ACCESS_KEY(),
    },
  });
  cachedClientKey = key;
  return cachedClient;
}

function bucketFor(visibility) {
  return visibility === "public" ? PUBLIC_BUCKET() : PRIVATE_BUCKET();
}

function sanitizeFilename(originalName) {
  return String(originalName || "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/["\\]/g, "")
    .slice(0, 120);
}

/**
 * Builds the URL for an object already in R2. Public objects get the permanent
 * bucket URL; private objects get a fresh presigned URL. Returns null when the
 * URL cannot be produced.
 */
export async function getCloudflareFileUrl({ key, visibility }) {
  if (!isCloudflareStorageConfigured() || !OBJECT_KEY_RE.test(key || "")) return null;

  if (visibility === "public") {
    return hasCloudflarePublicBucket() ? `${PUBLIC_BASE_URL()}/${key}` : null;
  }

  try {
    return await getSignedUrl(
      getClient(),
      new GetObjectCommand({ Bucket: PRIVATE_BUCKET(), Key: key }),
      { expiresIn: PRESIGNED_TTL_SECONDS }
    );
  } catch (err) {
    console.error("R2 presign failed:", err.message);
    return null;
  }
}

/**
 * Uploads one attachment and returns `{ key, url, visibility }`.
 * Throws on failure so the caller can fall back to local storage.
 *
 * `visibility: "public"` degrades to private when no separate public bucket is
 * configured — a document is never left without a working link, and a private
 * one is never written into a publicly readable bucket.
 */
export async function uploadToCloudflare({ key, buffer, contentType, originalName, visibility }) {
  if (!isCloudflareStorageConfigured()) {
    throw new Error("Cloudflare R2 is not configured");
  }
  if (!OBJECT_KEY_RE.test(key)) {
    throw new Error(`Refusing to upload unsafe object key: ${key}`);
  }

  const resolvedVisibility =
    visibility === "public" && hasCloudflarePublicBucket() ? "public" : "private";
  const bucket = bucketFor(resolvedVisibility);
  const safeName = sanitizeFilename(originalName);

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // `inline` so a photo opens in the browser instead of downloading.
      ContentDisposition: safeName ? `inline; filename="${safeName}"` : undefined,
      // Personal documents must not sit in shared caches.
      CacheControl:
        resolvedVisibility === "public"
          ? "public, max-age=31536000, immutable"
          : "private, no-store",
    })
  );

  const url = await getCloudflareFileUrl({ key, visibility: resolvedVisibility });
  if (!url) {
    // The object exists but is unreachable, and the caller is about to store the
    // file locally instead. Remove it rather than leaving an orphan behind.
    try {
      await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    } catch (err) {
      console.error("R2 cleanup of unreachable object failed:", key, err.message);
    }
    throw new Error("Uploaded to R2 but could not build a URL for the object");
  }

  return { key, url, visibility: resolvedVisibility };
}
