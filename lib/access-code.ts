/** Unambiguous alphabet: no I, O, 0 or 1. */
export const ACCESS_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ACCESS_CODE_LENGTH = 6;
export const ACCESS_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

/** Uppercases and strips anything that can't appear in a code. */
export function normalizeAccessCode(raw: unknown) {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-HJ-NP-Z2-9]/g, "")
    .slice(0, ACCESS_CODE_LENGTH);
}

export function isValidAccessCode(code: string) {
  return ACCESS_CODE_PATTERN.test(code);
}

/**
 * Cryptographically random code using rejection sampling so every character is
 * equally likely (32^6 ≈ 1.07 billion combinations).
 */
export function generateAccessCode() {
  const alphabetSize = ACCESS_CODE_ALPHABET.length;
  const limit = 256 - (256 % alphabetSize);
  let code = "";
  while (code.length < ACCESS_CODE_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    for (const byte of bytes) {
      if (byte < limit && code.length < ACCESS_CODE_LENGTH) code += ACCESS_CODE_ALPHABET[byte % alphabetSize];
    }
  }
  return code;
}
