---
name: Odoo print subscription endpoint
description: Contract of the VN Media Odoo /caribbean/suscripcion endpoint (as described by the user, 2026-10-29) and why it conflicts with Stripe billing.
---

The source is the user's description of the endpoint. It is not documented anywhere else.

- `POST https://vnmedia.odoo.com/caribbean/suscripcion`. A GET returns 405.
- Fields: `fullName`, `email`, `phone`, `addressLine1`, `addressLine2` (optional), `town`, `zip`, `acepto`, `website` (honeypot, empty).
- What Odoo does with a request:
  - Finds the contact by email, or creates it. An existing contact's data is never overwritten; a new address is added as a delivery address.
  - Creates and confirms a subscription from a template on the plan "Mensual - cobro el día 1".
  - The trial lasts exactly 3 months. The first charge falls on the next day 1 after that, and every later charge is also on day 1.
  - The total is $5.23/month: Delivery $3, Service Fee $2, and IVU $0.23 applied to the fee only.
- Response: order number, dates, monthly total and a `payment_url` on app.vnmedia.co.
- Protections:
  - It validates the email and requires a 5-digit ZIP. Our form allows ZIP+4, so the ZIP must be trimmed before sending.
  - It allows at most 10 requests per hour per IP. Server-side calls all come from one IP, so this limit applies to the whole site.
  - It rejects a second active subscription with the same email.
  - If the Odoo parameter `vnm_suscripcion.token` is set, requests must send it in the `X-VNM-Token` header. Send it from the server only, never from the browser.

**Why it matters:** this endpoint creates its own billed subscription. The site's Stripe checkout charges $4.99/month with no trial. Sending every Stripe subscriber to this endpoint would create two subscriptions, each with its own billing.

**Decision (2026-10-29):** the user chose "Odoo charges, remove Stripe" for the print subscription. The signup form posts to Odoo from the server and redirects the subscriber to `payment_url`.

**How to apply:** never post test records to the endpoint without the user's OK, because each one creates a real Odoo subscription. Stripe-based print features (the account section, the admin panel, the webhook) no longer cover new print subscribers.
