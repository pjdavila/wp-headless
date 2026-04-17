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

  if (!moosendRes.ok) {
    return res
      .status(502)
      .json({ error: "Newsletter service rejected the request." });
  }

  let data = null;
  try {
    data = JSON.parse(bodyText);
  } catch {
    // Non-JSON response from Moosend, treat as success since HTTP was 2xx.
    return res.status(200).json({ ok: true });
  }

  // Moosend wraps everything in {Code, Error, Context}. Code 0 = success.
  // Non-zero codes (e.g. already subscribed, invalid email) come back HTTP 200.
  if (data && typeof data.Code === "number" && data.Code !== 0) {
    const message = data.Error || "Subscription could not be completed.";
    // Treat "already subscribed" as a soft success for the user.
    if (/already/i.test(message) || /exists/i.test(message)) {
      return res.status(200).json({ ok: true, code: data.Code, message });
    }
    return res.status(400).json({ error: message, code: data.Code });
  }

  return res.status(200).json({ ok: true });
}
