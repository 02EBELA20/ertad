/**
 * Converts what a person typed into E.164 (+15551234567).
 * - 10 digits           -> US number
 * - 11 digits, 1 first  -> US number
 * - starts with "+"     -> international, 8-15 digits
 * Returns null if the input is not a plausible number.
 */
export function toE164(input: string): string | null {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, '');

  if (trimmed.startsWith('+')) {
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}
