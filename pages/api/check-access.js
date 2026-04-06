import { createHmac } from "crypto";

function signToken(secret) {
  return createHmac("sha256", secret).update("site_access_granted").digest("hex");
}

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) {
    return res.status(200).json({ granted: false });
  }

  const cookies = req.headers.cookie || "";
  const match = cookies.split(";").find((c) => c.trim().startsWith("site_access="));
  if (!match) {
    return res.status(200).json({ granted: false });
  }

  const token = match.split("=")[1]?.trim();
  const expected = signToken(sitePassword);

  if (token === expected) {
    return res.status(200).json({ granted: true });
  }

  return res.status(200).json({ granted: false });
}
