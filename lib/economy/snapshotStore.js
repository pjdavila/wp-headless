import fs from "fs";
import path from "path";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * Durable snapshot cache for economic indicators.
 *
 * Snapshots are public government data (no PII, no user data), so they are
 * safe to keep in the project's existing R2 bucket. They are keyed by
 * indicator (`economy/snapshots/<indicatorId>.json`) so reads NEVER hit
 * government APIs.
 *
 * Storage strategy follows the existing S3 wrapper pattern in
 * lib/cloudflareStorage.js but serves JSON documents instead of attachment
 * files, and reads stay server-side (no presigned URLs — the economy API is
 * the only reader):
 *
 *   - R2 configured  → write to R2 (durable across WPE Atlas redeploys, whose
 *                      filesystem is ephemeral) AND best-effort local copy.
 *   - R2 unconfigured → local file under data/economy/ (development).
 *
 * Read order is R2 first, then the local copy, so development without any
 * keys still serves the last stored snapshot.
 *
 * NOTE (bucket visibility): R2 grants public access per bucket, and in this
 * project the default bucket may be served publicly (img.caribbean.business).
 * That is acceptable here because snapshots contain only public government
 * statistics; never store anything else under this prefix.
 */

const LOCAL_DIR = path.join(process.cwd(), "data", "economy");
const R2_PREFIX = "economy/snapshots/";

const ACCOUNT_ID = () => (process.env.R2_ACCOUNT_ID || "").trim();
const ACCESS_KEY_ID = () => (process.env.R2_ACCESS_KEY_ID || "").trim();
const SECRET_ACCESS_KEY = () => (process.env.R2_SECRET_ACCESS_KEY || "").trim();
const BUCKET = () => (process.env.R2_BUCKET || "").trim();

export function isSnapshotStorageRemote() {
  return Boolean(
    ACCOUNT_ID() && ACCESS_KEY_ID() && SECRET_ACCESS_KEY() && BUCKET(),
  );
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

function objectKey(indicatorId) {
  return `${R2_PREFIX}${indicatorId}.json`;
}

function localPath(indicatorId) {
  return path.join(LOCAL_DIR, `${indicatorId}.json`);
}

async function writeLocal(indicatorId, snapshot) {
  await fs.promises.mkdir(LOCAL_DIR, { recursive: true });
  await fs.promises.writeFile(
    localPath(indicatorId),
    JSON.stringify(snapshot, null, 2),
    "utf8",
  );
}

async function readLocal(indicatorId) {
  try {
    return JSON.parse(
      await fs.promises.readFile(localPath(indicatorId), "utf8"),
    );
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

/**
 * @param {import("./types").IndicatorSnapshot} snapshot
 * @returns {Promise<"r2"|"local">} where the durable copy landed
 */
export async function writeSnapshot(indicatorId, snapshot) {
  if (isSnapshotStorageRemote()) {
    await getClient().send(
      new PutObjectCommand({
        Bucket: BUCKET(),
        Key: objectKey(indicatorId),
        Body: JSON.stringify(snapshot),
        ContentType: "application/json",
        // Public data, but snapshots are overwritten in place — a short TTL
        // keeps edge copies from lagging a re-ingestion for long.
        CacheControl: "public, max-age=300",
      }),
    );
    // Best-effort local copy so dev reads work even if R2 later drops out.
    await writeLocal(indicatorId, snapshot).catch(() => {});
    return "r2";
  }
  await writeLocal(indicatorId, snapshot);
  return "local";
}

/**
 * @returns {Promise<import("./types").IndicatorSnapshot|null>}
 */
export async function readSnapshot(indicatorId) {
  if (isSnapshotStorageRemote()) {
    try {
      const res = await getClient().send(
        new GetObjectCommand({ Bucket: BUCKET(), Key: objectKey(indicatorId) }),
      );
      const body = await res.Body.transformToString("utf8");
      return JSON.parse(body);
    } catch (err) {
      if (err.name !== "NoSuchKey" && err.$metadata?.httpStatusCode !== 404) {
        // Transient R2 problems degrade to the local copy rather than 500s.
        console.error(
          `economy snapshots: R2 read failed for ${indicatorId}:`,
          err.message,
        );
      }
    }
  }
  return readLocal(indicatorId);
}

/**
 * Lists every stored snapshot id (R2 listing, else local directory scan).
 * Used by the API index route; contents are read per id afterwards.
 */
export async function listSnapshotIds() {
  if (isSnapshotStorageRemote()) {
    try {
      const ids = [];
      let continuationToken;
      do {
        const res = await getClient().send(
          new ListObjectsV2Command({
            Bucket: BUCKET(),
            Prefix: R2_PREFIX,
            ContinuationToken: continuationToken,
          }),
        );
        for (const object of res.Contents || []) {
          const match = /^economy\/snapshots\/([a-z0-9-]+)\.json$/.exec(
            object.Key || "",
          );
          if (match) ids.push(match[1]);
        }
        continuationToken = res.IsTruncated
          ? res.NextContinuationToken
          : undefined;
      } while (continuationToken);
      return ids;
    } catch (err) {
      console.error("economy snapshots: R2 list failed:", err.message);
    }
  }
  try {
    const files = await fs.promises.readdir(LOCAL_DIR);
    return files
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(/\.json$/, ""));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}
