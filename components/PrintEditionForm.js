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

export default function PrintEditionForm() {
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
      errors.fullName = "Escribe tu nombre completo.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = "Email inválido.";
    }
    if (!form.phone.trim() || form.phone.trim().length < 7) {
      errors.phone = "Teléfono requerido.";
    }
    if (!form.addressLine1.trim()) {
      errors.addressLine1 = "Dirección requerida.";
    }
    if (!form.town) {
      errors.town = "Selecciona tu pueblo.";
    }
    if (!/^\d{5}(-\d{4})?$/.test(form.zip.trim())) {
      errors.zip = "Código postal inválido (ej. 00901).";
    }
    if (!form.consent) {
      errors.consent = "Debes aceptar el uso de tus datos.";
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
      const res = await fetch("/api/print-edition-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data?.fields) setFieldErrors(data.fields);
        throw new Error(data?.error || "Algo salió mal. Intenta de nuevo.");
      }

      setStatus("success");
      setForm(INITIAL_FORM);
    } catch (err) {
      setErrorMsg(err.message || "No pudimos enviar el formulario. Intenta de nuevo.");
      setStatus("idle");
    }
  }

  if (status === "success") {
    return (
      <div className={styles.successCard}>
        <div className={styles.successIcon} aria-hidden="true">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className={styles.successHeading}>¡Estás en la lista!</h2>
        <p className={styles.successText}>
          Te enviamos un correo de confirmación. Cuando empecemos a enviar la edición impresa, te
          contactaremos directamente con los detalles del próximo número.
        </p>
      </div>
    );
  }

  const isLoading = status === "loading";

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
        <label htmlFor="website">No completar</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => update("website", e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="fullName" className={styles.label}>
          Nombre completo <span className={styles.required}>*</span>
        </label>
        <input
          id="fullName"
          type="text"
          autoComplete="name"
          className={`${styles.input} ${fieldErrors.fullName ? styles.inputError : ""}`}
          value={form.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          disabled={isLoading}
          required
        />
        {fieldErrors.fullName && <p className={styles.fieldError}>{fieldErrors.fullName}</p>}
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>
            Email <span className={styles.required}>*</span>
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            className={`${styles.input} ${fieldErrors.email ? styles.inputError : ""}`}
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            disabled={isLoading}
            required
          />
          {fieldErrors.email && <p className={styles.fieldError}>{fieldErrors.email}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="phone" className={styles.label}>
            Teléfono <span className={styles.required}>*</span>
          </label>
          <input
            id="phone"
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
          {fieldErrors.phone && <p className={styles.fieldError}>{fieldErrors.phone}</p>}
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="addressLine1" className={styles.label}>
          Dirección <span className={styles.required}>*</span>
        </label>
        <input
          id="addressLine1"
          type="text"
          autoComplete="address-line1"
          placeholder="Calle, número"
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
        <label htmlFor="addressLine2" className={styles.label}>
          Apartamento, suite, etc. <span className={styles.optional}>(opcional)</span>
        </label>
        <input
          id="addressLine2"
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
          <label htmlFor="town" className={styles.label}>
            Pueblo <span className={styles.required}>*</span>
          </label>
          <select
            id="town"
            className={`${styles.input} ${styles.select} ${fieldErrors.town ? styles.inputError : ""}`}
            value={form.town}
            onChange={(e) => update("town", e.target.value)}
            disabled={isLoading}
            required
          >
            <option value="">Selecciona tu pueblo…</option>
            {PR_MUNICIPALITIES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {fieldErrors.town && <p className={styles.fieldError}>{fieldErrors.town}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="zip" className={styles.label}>
            Código postal <span className={styles.required}>*</span>
          </label>
          <input
            id="zip"
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
          {fieldErrors.zip && <p className={styles.fieldError}>{fieldErrors.zip}</p>}
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
            Acepto que mi información sea usada para coordinar el envío de la edición impresa y
            comunicaciones relacionadas con Caribbean Business.
          </span>
        </label>
        {fieldErrors.consent && <p className={styles.fieldError}>{fieldErrors.consent}</p>}
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
            Enviando…
          </>
        ) : (
          "Anotarme en la lista"
        )}
      </button>

      <p className={styles.disclaimer}>
        Este registro es una manifestación de interés. Aún no estamos enviando la edición impresa;
        te contactaremos cuando arranque el programa.
      </p>
    </form>
  );
}
