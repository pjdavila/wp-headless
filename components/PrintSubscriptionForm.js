import { useState } from "react";
import { PR_MUNICIPALITIES } from "../lib/puertoRicoMunicipalities";
import styles from "../styles/print-edition-form.module.css";

const INITIAL_FORM = {
  fullName: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  town: "",
  zip: "",
  consent: false,
  website: "",
};

export default function PrintSubscriptionForm() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  function update(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  function validateClient() {
    const errors = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      errors.fullName = "Enter your full name.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = "Invalid email.";
    }
    if (!form.phone.trim() || form.phone.trim().length < 7) {
      errors.phone = "Phone number required.";
    }
    if (!form.addressLine1.trim()) {
      errors.addressLine1 = "Address required.";
    }
    if (!form.town) {
      errors.town = "Select your town.";
    }
    if (!/^00[6-9]\d{2}(-\d{4})?$/.test(form.zip.trim())) {
      errors.zip = "Puerto Rico ZIP code (e.g. 00901).";
    }
    if (!form.consent) {
      errors.consent = "You must accept the recurring monthly charge.";
    }
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setFieldErrors({});

    const errors = validateClient();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch("/api/print-subscription-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.url) {
        if (data?.fields) setFieldErrors(data.fields);
        throw new Error(
          data?.error || "Something went wrong. Please try again.",
        );
      }

      // Hand off to Stripe Checkout. Keep the loading state — the browser
      // is leaving the page.
      window.location.assign(data.url);
    } catch (err) {
      setErrorMsg(
        err.message || "We couldn't start the payment. Please try again.",
      );
      setStatus("idle");
    }
  }

  const isLoading = status === "loading";

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
        <label htmlFor="sub-website">Leave empty</label>
        <input
          id="sub-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => update("website", e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="sub-fullName" className={styles.label}>
          Full name <span className={styles.required}>*</span>
        </label>
        <input
          id="sub-fullName"
          type="text"
          autoComplete="name"
          className={`${styles.input} ${fieldErrors.fullName ? styles.inputError : ""}`}
          value={form.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          disabled={isLoading}
          required
        />
        {fieldErrors.fullName && (
          <p className={styles.fieldError}>{fieldErrors.fullName}</p>
        )}
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="sub-email" className={styles.label}>
            Email <span className={styles.required}>*</span>
          </label>
          <input
            id="sub-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            className={`${styles.input} ${fieldErrors.email ? styles.inputError : ""}`}
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            disabled={isLoading}
            required
          />
          {fieldErrors.email && (
            <p className={styles.fieldError}>{fieldErrors.email}</p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="sub-phone" className={styles.label}>
            Phone <span className={styles.required}>*</span>
          </label>
          <input
            id="sub-phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="787-555-0100"
            className={`${styles.input} ${fieldErrors.phone ? styles.inputError : ""}`}
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            disabled={isLoading}
            required
          />
          {fieldErrors.phone && (
            <p className={styles.fieldError}>{fieldErrors.phone}</p>
          )}
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="sub-addressLine1" className={styles.label}>
          Shipping address <span className={styles.required}>*</span>
        </label>
        <input
          id="sub-addressLine1"
          type="text"
          autoComplete="address-line1"
          placeholder="Street, number"
          className={`${styles.input} ${fieldErrors.addressLine1 ? styles.inputError : ""}`}
          value={form.addressLine1}
          onChange={(e) => update("addressLine1", e.target.value)}
          disabled={isLoading}
          required
        />
        {fieldErrors.addressLine1 && (
          <p className={styles.fieldError}>{fieldErrors.addressLine1}</p>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="sub-addressLine2" className={styles.label}>
          Apartment, suite, etc.{" "}
          <span className={styles.optional}>(optional)</span>
        </label>
        <input
          id="sub-addressLine2"
          type="text"
          autoComplete="address-line2"
          className={styles.input}
          value={form.addressLine2}
          onChange={(e) => update("addressLine2", e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="sub-town" className={styles.label}>
            Town <span className={styles.required}>*</span>
          </label>
          <select
            id="sub-town"
            className={`${styles.input} ${styles.select} ${fieldErrors.town ? styles.inputError : ""}`}
            value={form.town}
            onChange={(e) => update("town", e.target.value)}
            disabled={isLoading}
            required
          >
            <option value="">Select your town…</option>
            {PR_MUNICIPALITIES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          {fieldErrors.town && (
            <p className={styles.fieldError}>{fieldErrors.town}</p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="sub-zip" className={styles.label}>
            ZIP code <span className={styles.required}>*</span>
          </label>
          <input
            id="sub-zip"
            type="text"
            autoComplete="postal-code"
            inputMode="numeric"
            placeholder="00901"
            maxLength={10}
            className={`${styles.input} ${fieldErrors.zip ? styles.inputError : ""}`}
            value={form.zip}
            onChange={(e) => update("zip", e.target.value)}
            disabled={isLoading}
            required
          />
          {fieldErrors.zip && (
            <p className={styles.fieldError}>{fieldErrors.zip}</p>
          )}
        </div>
      </div>

      <div className={styles.consentField}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={form.consent}
            onChange={(e) => update("consent", e.target.checked)}
            disabled={isLoading}
          />
          <span>
            I accept the recurring $4.99 USD monthly charge, the use of my
            information to coordinate the print edition delivery, and that I can
            cancel anytime.
          </span>
        </label>
        {fieldErrors.consent && (
          <p className={styles.fieldError}>{fieldErrors.consent}</p>
        )}
      </div>

      {errorMsg && (
        <p className={styles.formError} role="alert" aria-live="polite">
          {errorMsg}
        </p>
      )}

      <button type="submit" className={styles.submitBtn} disabled={isLoading}>
        {isLoading ? (
          <>
            <span className={styles.spinner} aria-hidden="true" />
            Redirecting to secure checkout…
          </>
        ) : (
          "Subscribe — $4.99/month"
        )}
      </button>

      <p className={styles.disclaimer}>
        Payment is processed securely by Stripe. We only ship to addresses in
        Puerto Rico. You can cancel anytime from the &ldquo;Manage
        subscription&rdquo; section on this page.
      </p>
    </form>
  );
}
