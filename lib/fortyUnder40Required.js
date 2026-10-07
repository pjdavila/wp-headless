// Rules for the required recommendation letter on the 40 Under 40 form.
// Kept dependency-free so it can be tested with plain node
// (npm run test:40under40).

export const REQUIRED_RECOMMENDATION_FIELD = "recommendation1";

export const MISSING_LETTER_ERROR =
  "Please upload at least one recommendation letter.";

export const STORAGE_FAILED_ERROR =
  "We could not save your recommendation letter. Please try submitting again in a few minutes.";

// Validation stage: returns the field error when the required letter is
// absent, or null. An existing (more specific) error for the field wins.
export function missingRequiredLetterError(uploads, errors = {}) {
  if (uploads?.[REQUIRED_RECOMMENDATION_FIELD]) return null;
  if (errors[REQUIRED_RECOMMENDATION_FIELD]) return null;
  return MISSING_LETTER_ERROR;
}

// Persistence stage: the application must not be acknowledged unless the
// required letter was actually stored somewhere.
export function requiredLetterStored(stored) {
  return Boolean(stored?.[REQUIRED_RECOMMENDATION_FIELD]?.storedName);
}
