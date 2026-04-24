import { sendWelcomeEmail } from "../../lib/welcomeEmail";

function parseMoosendDate(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/\/Date\((\d+)\)\//);
  return match ? Number(match[1]) : null;
}

function isNewSubscriber(context) {
  if (!context) return false;
  const createdMs = parseMoosendDate(context.CreatedOn);
  if (createdMs == null) return false;
  // Moosend returns UpdatedOn === null only for brand-new subscribers.
  // Any later re-subscribe sets UpdatedOn to a real timestamp, even if it
  // happens seconds after creation. We use UpdatedOn as the single source
  // of truth to avoid double-sending the welcome email.
  return context.UpdatedOn == null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, name } = req.body || {};

  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email is required" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  const apiKey = process.env.MOOSEND_API_KEY;
  const listId = process.env.MOOSEND_LIST_ID;

  if (!apiKey || !listId) {
    console.error(
      "Moosend: missing config",
      { hasApiKey: !!apiKey, hasListId: !!listId }
    );
    return res
      .status(500)
      .json({ error: "Newsletter is not configured. Please try again later." });
  }

  let moosendRes;
  let bodyText;
  try {
    moosendRes = await fetch(
      `https://api.moosend.com/v3/subscribers/${encodeURIComponent(listId)}/subscribe.json?apikey=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Email: email,
          Name: name || "",
        }),
      }
    );
    bodyText = await moosendRes.text();
  } catch (err) {
    console.error("Moosend subscribe network error:", err.message);
    return res
      .status(502)
      .json({ error: "Could not reach the newsletter service. Try again." });
  }

  console.info(
    `Moosend subscribe → status=${moosendRes.status} body=${bodyText.slice(0, 500)}`
  );

  let data = null;
  try {
    data = JSON.parse(bodyText);
  } catch {
    // Non-JSON body — fall through with data = null.
  }

  if (!moosendRes.ok) {
    const message =
      (data && (data.Error || data.Message)) ||
      "Newsletter service rejected the request.";
    return res.status(502).json({ error: message });
  }

  // Moosend wraps everything in {Code, Error, Context}. Code 0 = success.
  // Non-zero codes (e.g. already subscribed, invalid email) come back HTTP 200
  // and are treated as soft outcomes so the UI shows success consistently.
  if (data && typeof data.Code === "number" && data.Code !== 0) {
    return res.status(200).json({
      ok: true,
      code: data.Code,
      message: data.Error || "Subscription processed.",
    });
  }

  // Welcome email: only on first-time subscription, never block the response.
  if (data && data.Code === 0 && isNewSubscriber(data.Context)) {
    try {
      await sendWelcomeEmail({ email, name, variant: "newsletter" });
    } catch (err) {
      console.error("Moosend → welcome email failed:", err.message);
    }
  } else if (data && data.Code === 0) {
    console.info("Moosend: skipping welcome (existing subscriber)");
  }

  return res.status(200).json({ ok: true });
}
