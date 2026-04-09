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
    console.error("Moosend: Missing MOOSEND_API_KEY or MOOSEND_LIST_ID");
    return res.status(200).json({ ok: true });
  }

  try {
    const moosendRes = await fetch(
      `https://api.moosend.com/v3/subscribers/${listId}/subscribe.json?apikey=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Email: email,
          Name: name || "",
        }),
      }
    );

    if (!moosendRes.ok) {
      const text = await moosendRes.text();
      console.error("Moosend subscribe error:", moosendRes.status, text);
    }
  } catch (err) {
    console.error("Moosend subscribe failed:", err.message);
  }

  return res.status(200).json({ ok: true });
}
