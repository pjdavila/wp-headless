const DEFAULT_ODOO_URL = "https://vnmedia.odoo.com/caribbean/impresa";
const ODOO_TIMEOUT_MS = 8000;

export function getOdooPrintEditionUrl() {
  return process.env.ODOO_PRINT_EDITION_URL || DEFAULT_ODOO_URL;
}

export async function sendPrintEditionToOdoo({
  fullName,
  email,
  phone,
  addressLine1,
  addressLine2,
  town,
  zip,
}) {
  const url = getOdooPrintEditionUrl();
  const direccion =
    addressLine2 && addressLine2.trim()
      ? `${addressLine1}, ${addressLine2}`
      : addressLine1;

  const payload = {
    nombre: fullName,
    email,
    telefono: phone,
    direccion,
    pueblo: town,
    zip,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ODOO_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Odoo responded ${res.status}: ${body.slice(0, 300)}`);
  }

  return true;
}
