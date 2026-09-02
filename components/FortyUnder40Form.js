import { useRef, useState } from "react";
import { PR_MUNICIPALITIES } from "../lib/puertoRicoMunicipalities";
import FortyUnder40TermsModal from "./FortyUnder40TermsModal";
import styles from "../styles/forty-under-40-form.module.css";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_BIO_LENGTH = 1000;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const RESUME_TYPES = ["application/pdf"];
const RECOMMENDATION_TYPES = ["application/pdf"];
const FILE_TYPES_BY_FIELD = {
  photo: PHOTO_TYPES,
  resume: RESUME_TYPES,
  recommendation: RECOMMENDATION_TYPES,
};

const STEPS = [
  { id: "contact", label: "Contact" },
  { id: "professional", label: "Professional" },
  { id: "documents", label: "Documents" },
  { id: "review", label: "Review" },
];

const INITIAL_FORM = {
  applicantType: "self",
  nominatorName: "",
  nominatorEmail: "",
  fullName: "",
  email: "",
  phone: "",
  jobTitle: "",
  company: "",
  town: "",
  bio: "",
  linkedin: "",
  consent: false,
  website: "",
};

function isValidUrl(value) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("We could not read that file."));
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}

export default function FortyUnder40Form() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [files, setFiles] = useState({ photo: null, resume: null, recommendation: null });
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [termsOpen, setTermsOpen] = useState(false);

  const photoInputRef = useRef(null);
  const resumeInputRef = useRef(null);
  const recommendationInputRef = useRef(null);
  const termsButtonRef = useRef(null);

  function update(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    clearError(name);
  }

  function clearError(name) {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function validateStep(index) {
    const errors = {};
    if (index === 0) {
      if (form.applicantType === "colleague") {
        if (form.nominatorName.trim().length < 2) {
          errors.nominatorName = "Please enter your full name.";
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.nominatorEmail.trim())) {
          errors.nominatorEmail = "Please enter a valid email address.";
        }
      }
      if (form.fullName.trim().length < 2) errors.fullName = "Please enter your full name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        errors.email = "Please enter a valid email address.";
      }
      if (form.phone.trim().length < 7) errors.phone = "Please enter a valid phone number.";
    }
    if (index === 1) {
      if (!form.jobTitle.trim()) errors.jobTitle = "Please enter your title.";
      if (!form.company.trim()) errors.company = "Please enter your company.";
      if (!form.town) errors.town = "Please select your town.";
      if (form.bio.length > MAX_BIO_LENGTH) {
        errors.bio = `The bio must be ${MAX_BIO_LENGTH} characters or fewer.`;
      }
      if (!form.linkedin.trim()) {
        errors.linkedin = "Please enter your LinkedIn profile URL.";
      } else if (!isValidUrl(form.linkedin)) {
        errors.linkedin = "Please enter a valid URL.";
      }
    }
    if (index === 2) {
      if (!files.photo) errors.photo = "Please upload a professional photo.";
    }
    if (index === 3) {
      if (!form.consent) errors.consent = "Please accept the terms to submit.";
    }
    return errors;
  }

  function goNext() {
    const errors = validateStep(step);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setErrorMsg("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setErrorMsg("");
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleFile(field, file) {
    if (!file) return;
    const allowed = FILE_TYPES_BY_FIELD[field] || [];
    if (!allowed.includes(file.type)) {
      setFieldErrors((prev) => ({
        ...prev,
        [field]:
          field === "photo"
            ? "The photo must be a JPG, PNG or WebP image."
            : field === "recommendation"
              ? "The recommendation letter must be a PDF file."
              : "The résumé must be a PDF file.",
      }));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFieldErrors((prev) => ({ ...prev, [field]: "That file is larger than 5 MB." }));
      return;
    }
    clearError(field);
    setFiles((prev) => ({ ...prev, [field]: file }));
  }

  function removeFile(field) {
    setFiles((prev) => ({ ...prev, [field]: null }));
    clearError(field);
    const ref =
      field === "photo"
        ? photoInputRef
        : field === "recommendation"
          ? recommendationInputRef
          : resumeInputRef;
    if (ref.current) ref.current.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    // Re-run every step's rules, not just the current one — a candidate can
    // reach Review and then edit an earlier field.
    const allErrors = STEPS.reduce((acc, _s, i) => ({ ...acc, ...validateStep(i) }), {});
    if (Object.keys(allErrors).length > 0) {
      setFieldErrors(allErrors);
      const firstBrokenStep = STEPS.findIndex((_s, i) => Object.keys(validateStep(i)).length > 0);
      if (firstBrokenStep >= 0) setStep(firstBrokenStep);
      return;
    }

    setStatus("loading");

    try {
      const payload = { ...form };
      for (const field of ["photo", "resume", "recommendation"]) {
        const file = files[field];
        if (!file) continue;
        payload[field] = {
          name: file.name,
          contentType: file.type,
          data: await readFileAsBase64(file),
        };
      }

      const res = await fetch("/api/40under40-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data?.fields) setFieldErrors(data.fields);
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }

      setStatus("success");
      setForm(INITIAL_FORM);
      setFiles({ photo: null, resume: null, recommendation: null });
    } catch (err) {
      setErrorMsg(err.message || "We could not submit your entry. Please try again.");
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
        <h2 className={styles.successHeading}>Your entry is in.</h2>
        <p className={styles.successText}>
          Thank you for entering 40 Under 40 · 2026. We sent a confirmation to your email. Our
          editors review every submission and will reach out if we need anything else.
        </p>
      </div>
    );
  }

  const isLoading = status === "loading";
  const isLastStep = step === STEPS.length - 1;

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
        <label htmlFor="website">Do not fill</label>
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

      <ol className={styles.progress} aria-label="Form progress">
        {STEPS.map((s, i) => (
          <li
            key={s.id}
            className={`${styles.progressStep} ${i === step ? styles.progressCurrent : ""} ${i < step ? styles.progressDone : ""}`}
            aria-current={i === step ? "step" : undefined}
          >
            <span className={styles.progressDot}>{i < step ? "✓" : i + 1}</span>
            <span className={styles.progressLabel}>{s.label}</span>
          </li>
        ))}
      </ol>
      <p className={styles.stepCount}>
        Step {step + 1} of {STEPS.length}
      </p>

      {step === 0 && (
        <div className={styles.step}>
          <div className={styles.field}>
            <label htmlFor="applicantType" className={styles.label}>
              Who are you nominating? <span className={styles.required}>*</span>
            </label>
            <select
              id="applicantType"
              className={`${styles.input} ${styles.select}`}
              value={form.applicantType}
              onChange={(e) => update("applicantType", e.target.value)}
              disabled={isLoading}
            >
              <option value="self">I&rsquo;m nominating myself</option>
              <option value="colleague">I&rsquo;m nominating a colleague</option>
            </select>
          </div>

          {form.applicantType === "colleague" && (
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="nominatorName" className={styles.label}>
                  Your name <span className={styles.required}>*</span>
                </label>
                <input
                  id="nominatorName"
                  type="text"
                  autoComplete="name"
                  className={`${styles.input} ${fieldErrors.nominatorName ? styles.inputError : ""}`}
                  value={form.nominatorName}
                  onChange={(e) => update("nominatorName", e.target.value)}
                  disabled={isLoading}
                />
                {fieldErrors.nominatorName && (
                  <p className={styles.fieldError}>{fieldErrors.nominatorName}</p>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="nominatorEmail" className={styles.label}>
                  Your email <span className={styles.required}>*</span>
                </label>
                <input
                  id="nominatorEmail"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  className={`${styles.input} ${fieldErrors.nominatorEmail ? styles.inputError : ""}`}
                  value={form.nominatorEmail}
                  onChange={(e) => update("nominatorEmail", e.target.value)}
                  disabled={isLoading}
                />
                {fieldErrors.nominatorEmail && (
                  <p className={styles.fieldError}>{fieldErrors.nominatorEmail}</p>
                )}
              </div>
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="fullName" className={styles.label}>
              Nominee <span className={styles.required}>*</span>
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              className={`${styles.input} ${fieldErrors.fullName ? styles.inputError : ""}`}
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              disabled={isLoading}
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
              />
              {fieldErrors.email && <p className={styles.fieldError}>{fieldErrors.email}</p>}
            </div>

            <div className={styles.field}>
              <label htmlFor="phone" className={styles.label}>
                Phone <span className={styles.required}>*</span>
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
              />
              {fieldErrors.phone && <p className={styles.fieldError}>{fieldErrors.phone}</p>}
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className={styles.step}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="jobTitle" className={styles.label}>
                Title <span className={styles.required}>*</span>
              </label>
              <input
                id="jobTitle"
                type="text"
                autoComplete="organization-title"
                placeholder="Chief Operating Officer"
                className={`${styles.input} ${fieldErrors.jobTitle ? styles.inputError : ""}`}
                value={form.jobTitle}
                onChange={(e) => update("jobTitle", e.target.value)}
                disabled={isLoading}
              />
              {fieldErrors.jobTitle && <p className={styles.fieldError}>{fieldErrors.jobTitle}</p>}
            </div>

            <div className={styles.field}>
              <label htmlFor="company" className={styles.label}>
                Company <span className={styles.required}>*</span>
              </label>
              <input
                id="company"
                type="text"
                autoComplete="organization"
                className={`${styles.input} ${fieldErrors.company ? styles.inputError : ""}`}
                value={form.company}
                onChange={(e) => update("company", e.target.value)}
                disabled={isLoading}
              />
              {fieldErrors.company && <p className={styles.fieldError}>{fieldErrors.company}</p>}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="town" className={styles.label}>
              Town <span className={styles.required}>*</span>
            </label>
            <select
              id="town"
              className={`${styles.input} ${styles.select} ${fieldErrors.town ? styles.inputError : ""}`}
              value={form.town}
              onChange={(e) => update("town", e.target.value)}
              disabled={isLoading}
            >
              <option value="">Select your town…</option>
              {PR_MUNICIPALITIES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            {fieldErrors.town && <p className={styles.fieldError}>{fieldErrors.town}</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor="linkedin" className={styles.label}>
              LinkedIn <span className={styles.required}>*</span>
            </label>
            <input
              id="linkedin"
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://www.linkedin.com/in/your-name"
              className={`${styles.input} ${fieldErrors.linkedin ? styles.inputError : ""}`}
              value={form.linkedin}
              onChange={(e) => update("linkedin", e.target.value)}
              disabled={isLoading}
            />
            {fieldErrors.linkedin && <p className={styles.fieldError}>{fieldErrors.linkedin}</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor="bio" className={styles.label}>
              Bio <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              id="bio"
              rows={5}
              maxLength={MAX_BIO_LENGTH}
              placeholder="A short professional bio…"
              className={`${styles.input} ${fieldErrors.bio ? styles.inputError : ""}`}
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              disabled={isLoading}
            />
            <p className={styles.stepIntro}>
              {form.bio.length}/{MAX_BIO_LENGTH} characters
            </p>
            {fieldErrors.bio && <p className={styles.fieldError}>{fieldErrors.bio}</p>}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={styles.step}>
          <p className={styles.stepIntro}>
            The professional photo is required. The résumé and recommendation letter are optional
            but help our editors build your profile. Max 5 MB each.
          </p>

          <FileField
            id="photo"
            label="Professional photo"
            hint="JPG, PNG or WebP · up to 5 MB"
            accept="image/jpeg,image/png,image/webp"
            inputRef={photoInputRef}
            file={files.photo}
            error={fieldErrors.photo}
            disabled={isLoading}
            onSelect={(file) => handleFile("photo", file)}
            onRemove={() => removeFile("photo")}
          />

          <FileField
            id="resume"
            label="Résumé or bio"
            hint="PDF · up to 5 MB"
            accept="application/pdf"
            inputRef={resumeInputRef}
            file={files.resume}
            error={fieldErrors.resume}
            disabled={isLoading}
            onSelect={(file) => handleFile("resume", file)}
            onRemove={() => removeFile("resume")}
          />

          <FileField
            id="recommendation"
            label="Recommendation letter"
            hint="PDF · up to 5 MB"
            accept="application/pdf"
            inputRef={recommendationInputRef}
            file={files.recommendation}
            error={fieldErrors.recommendation}
            disabled={isLoading}
            onSelect={(file) => handleFile("recommendation", file)}
            onRemove={() => removeFile("recommendation")}
          />
        </div>
      )}

      {step === 3 && (
        <div className={styles.step}>
          <p className={styles.stepIntro}>Review your entry before you submit.</p>

          <dl className={styles.summary}>
            {form.applicantType === "colleague" && (
              <>
                <SummaryRow label="Nominated by" value={form.nominatorName} />
                <SummaryRow label="Nominator email" value={form.nominatorEmail} />
              </>
            )}
            <SummaryRow label="Name" value={form.fullName} />
            <SummaryRow label="Email" value={form.email} />
            <SummaryRow label="Phone" value={form.phone} />
            <SummaryRow label="Title" value={form.jobTitle} />
            <SummaryRow label="Company" value={form.company} />
            <SummaryRow label="Town" value={form.town} />
            <SummaryRow label="LinkedIn" value={form.linkedin} />
            <SummaryRow label="Bio" value={form.bio ? form.bio : "Not included"} />
            <SummaryRow label="Photo" value={files.photo ? files.photo.name : "Not included"} />
            <SummaryRow label="Résumé" value={files.resume ? files.resume.name : "Not included"} />
            <SummaryRow
              label="Recommendation letter"
              value={files.recommendation ? files.recommendation.name : "Not included"}
            />
          </dl>

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
                I confirm the information above is accurate and I agree that Caribbean Business may
                use it to evaluate and, if selected, publish my 40 Under 40 profile. I accept the{" "}
                <button
                  ref={termsButtonRef}
                  type="button"
                  className={styles.termsLink}
                  onClick={() => setTermsOpen(true)}
                  aria-haspopup="dialog"
                >
                  Terms and Conditions
                </button>
                .
              </span>
            </label>
            {fieldErrors.consent && <p className={styles.fieldError}>{fieldErrors.consent}</p>}
          </div>
        </div>
      )}

      {errorMsg && (
        <p className={styles.formError} role="alert" aria-live="polite">
          {errorMsg}
        </p>
      )}

      <div className={styles.actions}>
        {step > 0 && (
          <button type="button" className={styles.backBtn} onClick={goBack} disabled={isLoading}>
            Back
          </button>
        )}
        {isLastStep ? (
          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? (
              <>
                <span className={styles.spinner} aria-hidden="true" />
                Submitting…
              </>
            ) : (
              "Submit"
            )}
          </button>
        ) : (
          <button type="button" className={styles.submitBtn} onClick={goNext} disabled={isLoading}>
            Continue
          </button>
        )}
      </div>

      <p className={styles.disclaimer}>
        Entering does not guarantee selection. Honorees are chosen by the Caribbean Business
        editorial team.
      </p>

      <FortyUnder40TermsModal
        isOpen={termsOpen}
        onClose={() => setTermsOpen(false)}
        returnFocusRef={termsButtonRef}
      />
    </form>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className={styles.summaryRow}>
      <dt className={styles.summaryLabel}>{label}</dt>
      <dd className={styles.summaryValue}>{value || "—"}</dd>
    </div>
  );
}

function FileField({ id, label, hint, accept, inputRef, file, error, disabled, onSelect, onRemove }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label} <span className={styles.optional}>(optional)</span>
      </label>

      {file ? (
        <div className={styles.fileChip}>
          <span className={styles.fileName}>{file.name}</span>
          <span className={styles.fileSize}>{formatBytes(file.size)}</span>
          <button type="button" className={styles.fileRemove} onClick={onRemove} disabled={disabled}>
            Remove
          </button>
        </div>
      ) : (
        <label className={`${styles.dropzone} ${error ? styles.dropzoneError : ""}`} htmlFor={id}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className={styles.dropzoneText}>Choose a file</span>
          <span className={styles.dropzoneHint}>{hint}</span>
        </label>
      )}

      <input
        id={id}
        ref={inputRef}
        type="file"
        accept={accept}
        className={styles.fileInput}
        disabled={disabled}
        onChange={(e) => onSelect(e.target.files?.[0] || null)}
      />

      {error && <p className={styles.fieldError}>{error}</p>}
    </div>
  );
}
