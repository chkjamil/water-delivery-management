/**
 * Shared validation helpers — single source of truth.
 * Import from here instead of duplicating regex in every component.
 */

// Pakistan mobile: 03XX-XXXXXXX (11 digits) or +923XX-XXXXXXX (13 with country code)
// Valid prefixes: 030x–036x (Jazz, Zong, Ufone, Telenor, Warid, SCO)
const PK_PHONE_RE = /^(\+92|0)3[0-9]{9}$/;

/** Strip formatting characters (spaces, dashes, parens) */
export function stripFormatting(value: string): string {
  return value.replace(/[\s\-().]/g, "");
}

/** Returns true if value is a valid Pakistani mobile number */
export function isValidPKPhone(raw: string): boolean {
  return PK_PHONE_RE.test(stripFormatting(raw));
}

/**
 * Normalize a Pakistan phone number to E.164 (+92XXXXXXXXX).
 * Input can be 03XX... or +923XX...
 */
export function normalizePKPhone(raw: string): string {
  const digits = stripFormatting(raw);
  return digits.startsWith("0") ? "+92" + digits.slice(1) : digits;
}

/** Returns true if value is a non-empty string after trimming */
export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

/** Returns true if password meets minimum requirements (8+ chars) */
export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

/** Returns true if two password fields match */
export function passwordsMatch(a: string, b: string): boolean {
  return a === b;
}
