// Rules for the required recommendation letters on the 40 Under 40 form.
// All three letters are required. Shared by the form and the API, and kept
// dependency-free so it can be tested with plain node (npm run test:40under40).

export const REQUIRED_RECOMMENDATION_FIELDS = [
  "recommendation1",
  "recommendation2",
  "recommendation3",
];

export const MISSING_LETTER_ERROR = "Please upload this recommendation letter.";

export const STORAGE_FAILED_ERROR =
  "We could not save your recommendation letters. Please try submitting again in a few minutes.";

// Validation stage: returns { field: error } for every required letter that is
// absent. An existing (more specific) error for a field wins and is not
// overwritten. Returns an empty object when every letter is present.
export function missingRequiredLetterErrors(uploads, errors = {}) {
  const missing = {};
  for (const field of REQUIRED_RECOMMENDATION_FIELDS) {
    if (uploads?.[field]) continue;
    if (errors[field]) continue;
    missing[field] = MISSING_LETTER_ERROR;
  }
  return missing;
}

// Persistence stage: the application must not be acknowledged unless every
// required letter was actually stored somewhere.
export function requiredLettersStored(stored) {
  return REQUIRED_RECOMMENDATION_FIELDS.every((field) =>
    Boolean(stored?.[field]?.storedName),
  );
}
