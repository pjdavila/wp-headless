import fs from "fs";
import {
  contentTypeForStoredName,
  isValidStoredName,
  uploadPath,
  verifyFileSignature,
} from "../../lib/fortyUnder40Files";

/**
 * Serves a 40 Under 40 attachment to whoever holds a valid signed link (the
 * external webhook consumer, the team notification email). Unsigned or expired
 * requests get nothing, so guessing a filename is not enough.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const file = typeof req.query.file === "string" ? req.query.file : "";
  const exp = typeof req.query.exp === "string" ? req.query.exp : "";
  const sig = typeof req.query.sig === "string" ? req.query.sig : "";

  if (!isValidStoredName(file) || !verifyFileSignature(file, exp, sig)) {
    return res.status(403).json({ error: "Invalid or expired link." });
  }

  const filePath = uploadPath(file);
  let data;
  try {
    data = await fs.promises.readFile(filePath);
  } catch (err) {
    if (err.code === "ENOENT") {
      return res.status(404).json({ error: "File not found." });
    }
    console.error("40under40 file read failed:", err.message);
    return res.status(500).json({ error: "Could not read the file." });
  }

  res.setHeader("Content-Type", contentTypeForStoredName(file));
  res.setHeader("Content-Length", data.length);
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Disposition", `inline; filename="${file}"`);
  return res.status(200).send(data);
}
