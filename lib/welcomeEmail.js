const COPY = {
  account:
    "Thank you for joining Caribbean Business — your trusted source for business news, economic insights, and market analysis across the Caribbean region.",
  newsletter:
    "Thank you for subscribing to the Caribbean Business newsletter — your trusted source for business news, economic insights, and market analysis across the Caribbean region.",
};

const SPANISH_COPY = {
  "print-edition-interest": {
    subject: "Te anotamos en la lista de la edición impresa",
    heading: "Bienvenido a la lista de espera",
    greetingFallback: "Hola,",
    body: [
      "Gracias por tu interés en recibir la edición impresa de Caribbean Business en tu casa.",
      "Por ahora estás en nuestra lista de espera. Aún no estamos enviando ejemplares, pero apenas arranque el programa de distribución te contactaremos por correo electrónico con los detalles del próximo número.",
      "Si tus datos cambian o necesitas actualizar tu dirección, escríbenos respondiendo a este correo.",
    ],
    ctaLabel: "Visitar Caribbean Business",
    footerNote: "© {year} Caribbean Business — Una publicación de Vision News Media",
  },
};

function buildSpanishHtml({ greeting, copy }) {
  const year = new Date().getFullYear();
  const paragraphs = copy.body
    .map(
      (p) =>
        `<p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#b0b3bf;">${p}</p>`
    )
    .join("");
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#0d0e12;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0e12;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#151720;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:0;line-height:0;">
              <a href="https://caribbean.business" target="_blank" style="display:block;">
                <img src="https://img.caribbean.business/welcome-email.jpeg" alt="Caribbean Business" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#ffffff;">
                ${copy.heading}
              </h2>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#b0b3bf;">
                ${greeting}
              </p>
              ${paragraphs}
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:#2a9d6a;border-radius:8px;">
                    <a href="https://caribbean.business" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">
                      ${copy.ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #252836;text-align:center;">
              <p style="margin:0;font-size:13px;color:#6b6e7a;line-height:1.5;">
                ${copy.footerNote.replace("{year}", year)}
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
}

function buildHtml({ greeting, intro }) {
  const year = new Date().getFullYear();
  return `
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
          <tr>
            <td style="padding:0;line-height:0;">
              <a href="https://caribbean.business" target="_blank" style="display:block;">
                <img src="https://img.caribbean.business/welcome-email.jpeg" alt="Welcome to Caribbean Business" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#ffffff;">
                Welcome to Caribbean Business
              </h2>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#b0b3bf;">
                ${greeting}
              </p>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#b0b3bf;">
                ${intro}
              </p>
              <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#b0b3bf;">
                Stay informed with the latest stories on economy, energy, technology, jobs, and more. We're glad to have you.
              </p>
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
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #252836;text-align:center;">
              <p style="margin:0;font-size:13px;color:#6b6e7a;line-height:1.5;">
                &copy; ${year} Caribbean Business &mdash; A Vision News Media Publication
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
}

export async function sendWelcomeEmail({ email, name, variant } = {}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("Resend: Missing RESEND_API_KEY — skipping welcome email");
    return { ok: true, skipped: true };
  }

  if (!email || typeof email !== "string") {
    return { ok: false, error: "Email is required" };
  }

  const safeName = (name || "").replace(/[<>&"'/]/g, "").trim();
  const firstName = safeName ? safeName.split(" ")[0] : "";

  const spanishCopy = SPANISH_COPY[variant];
  let html;
  let subject;
  let greetingForLog;

  if (spanishCopy) {
    const greeting = firstName ? `Hola ${firstName},` : spanishCopy.greetingFallback;
    html = buildSpanishHtml({ greeting, copy: spanishCopy });
    subject = spanishCopy.subject;
    greetingForLog = variant;
  } else {
    const safeVariant = variant === "newsletter" ? "newsletter" : "account";
    const intro = COPY[safeVariant];
    const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
    html = buildHtml({ greeting, intro });
    subject = "Welcome to Caribbean Business";
    greetingForLog = safeVariant;
  }

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
        subject,
        html,
      }),
    });

    const responseBody = await resendRes.text();

    if (!resendRes.ok) {
      console.error("Resend error:", resendRes.status, responseBody);
      return { ok: false, status: resendRes.status };
    }

    // Surface the Resend message id so any future delivery issue can be
    // looked up in the dashboard without needing to re-run a diagnostic.
    let messageId = "";
    try {
      messageId = JSON.parse(responseBody)?.id || "";
    } catch {
      /* non-JSON body — skip id extraction */
    }
    console.info(
      `Resend: welcome email sent (variant=${greetingForLog}) to ${email}` +
        (messageId ? ` id=${messageId}` : "")
    );
    return { ok: true, id: messageId };
  } catch (err) {
    console.error("Resend send failed:", err.message);
    return { ok: false, error: err.message };
  }
}
