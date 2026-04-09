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

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("Resend: Missing RESEND_API_KEY");
    return res.status(200).json({ ok: true });
  }

  const safeName = (name || "").replace(/[<>&"'/]/g, "").trim();
  const firstName = safeName ? safeName.split(" ")[0] : "";
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#0d0e12;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0e12;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#151720;border-radius:12px;overflow:hidden;">
          <!-- Banner Image -->
          <tr>
            <td style="padding:0;line-height:0;">
              <a href="https://caribbean.business" target="_blank" style="display:block;">
                <img src="https://img.caribbean.business/welcome-email.jpeg" alt="Welcome to Caribbean Business" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
              </a>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#ffffff;">
                Welcome to Caribbean Business
              </h2>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#b0b3bf;">
                ${greeting}
              </p>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#b0b3bf;">
                Thank you for joining Caribbean Business — your trusted source for business news, economic insights, and market analysis across the Caribbean region.
              </p>
              <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#b0b3bf;">
                Stay informed with the latest stories on economy, energy, technology, jobs, and more. We're glad to have you.
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:#2a9d6a;border-radius:8px;">
                    <a href="https://caribbean.business" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">
                      Explore Latest News
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #252836;text-align:center;">
              <p style="margin:0;font-size:13px;color:#6b6e7a;line-height:1.5;">
                &copy; ${new Date().getFullYear()} Caribbean Business &mdash; A Vision News Media Publication
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#4e5060;">
                <a href="https://caribbean.business" style="color:#2a9d6a;text-decoration:none;">caribbean.business</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Caribbean Business <noreply@caribbean.business>",
        to: [email],
        subject: "Welcome to Caribbean Business",
        html,
      }),
    });

    if (!resendRes.ok) {
      const text = await resendRes.text();
      console.error("Resend error:", resendRes.status, text);
    }
  } catch (err) {
    console.error("Resend send failed:", err.message);
  }

  return res.status(200).json({ ok: true });
}
