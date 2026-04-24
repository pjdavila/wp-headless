function parseMoosendDate(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/\/Date\((\d+)\)\//);
  return match ? Number(match[1]) : null;
}

function isNewSubscriber(context) {
  if (!context) return false;
  const createdMs = parseMoosendDate(context.CreatedOn);
  if (createdMs == null) return false;
  const updatedMs = parseMoosendDate(context.UpdatedOn);

  // Primary signal: Moosend leaves UpdatedOn=null only on first creation.
  // Any later re-subscribe sets UpdatedOn (verified empirically: it can
  // happen within seconds of CreatedOn for rapid re-submits), so we treat
  // a non-null UpdatedOn as a re-subscription.
  if (context.UpdatedOn != null) {
    // Tight safety net: if Moosend ever sets UpdatedOn at creation time
    // (millisecond-level delta), still treat as new.
    if (updatedMs != null && Math.abs(createdMs - updatedMs) < 100) return true;
    return false;
  }

  // UpdatedOn is null → brand-new. Recency check (per task spec)
  // guards against stale/replayed responses.
  return Date.now() - createdMs < 60_000;
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
      const { sendWelcomeEmail } = await import("../../lib/welcomeEmail");
      await sendWelcomeEmail({ email, name, variant: "newsletter" });
    } catch (err) {
      console.error("Moosend → welcome email failed:", err.message);
    }
  } else if (data && data.Code === 0) {
    console.info("Moosend: skipping welcome (existing subscriber)");
  }

  return res.status(200).json({ ok: true });
}
