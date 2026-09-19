import crypto from "crypto";

// Stateless, short-lived, HMAC-signed tokens for the "manage subscription"
// magic link. The token proves the requester controls the subscriber's inbox:
// it is only ever sent to the email on file, never returned in the API
// response.
const TOKEN_TTL_MS = 15 * 60 * 1000;

function getSigningSecret() {
  const secret =
    process.env.SESSION_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "No hay secreto para firmar enlaces del portal: falta SESSION_SECRET en las variables de entorno.",
    );
  }
  return secret;
}

function base64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function sign(payloadB64) {
  return crypto
    .createHmac("sha256", getSigningSecret())
    .update(payloadB64)
    .digest("base64url");
}

export function createPortalToken(customerId, email) {
  const payload = base64url(
    JSON.stringify({
      cid: customerId,
      em: email,
      exp: Date.now() + TOKEN_TTL_MS,
    }),
  );
  return `${payload}.${sign(payload)}`;
}

export function verifyPortalToken(token) {
  if (typeof token !== "string" || token.length > 2048) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let data;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!data || typeof data.cid !== "string" || typeof data.exp !== "number")
    return null;
  if (Date.now() > data.exp) return null;
  return {
    customerId: data.cid,
    email: typeof data.em === "string" ? data.em : "",
  };
}
