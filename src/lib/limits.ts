/** Notes longer than this are refused rather than cut, so nothing is silently dropped. */
export const MAX_NOTES_CHARS = 200_000;

/** Questions per launch in every mode except practice by unit. */
export const RUN_LENGTH = 10;

/** At most this many missed questions come back in one launch; the rest wait for the next. */
export const MAX_RETRIES_PER_RUN = 4;
