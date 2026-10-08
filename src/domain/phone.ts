/**
 * Normalises Uzbek phone numbers to E.164 (+998XXXXXXXXX).
 * Accepts "+998 90 123-45-67", "998901234567", "90 123 45 67".
 * Returns null when the input is not a valid Uzbek number.
 */
export function normalizeUzPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("998") ? digits.slice(3) : digits;
  if (!/^\d{9}$/.test(local)) return null;
  return `+998${local}`;
}

export function formatUzPhone(e164: string): string {
  const m = /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(e164);
  return m ? `+998 ${m[1]} ${m[2]}-${m[3]}-${m[4]}` : e164;
}
