import { timingSafeEqual } from "crypto";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { password } = req.body || {};
  const sitePassword = process.env.SITE_PASSWORD;

  if (!sitePassword) {
    return res.status(500).json({ message: "Site password not configured" });
  }

  if (typeof password !== "string" || password.length === 0) {
    return res.status(401).json({ message: "Incorrect password" });
  }

  const a = Buffer.from(password.normalize());
  const b = Buffer.from(sitePassword.normalize());

  const isValid = a.length === b.length && timingSafeEqual(a, b);

  if (isValid) {
    const isProduction = process.env.NODE_ENV === "production";
    const secure = isProduction ? "; Secure" : "";
    res.setHeader("Set-Cookie", [
      `site_access=granted; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${secure}`,
    ]);
    return res.status(200).json({ success: true });
  }

  return res.status(401).json({ message: "Incorrect password" });
}
