/**
 * Ethiopian Phone Number Validation and Normalization Helper
 *
 * Valid Ethiopian mobile formats:
 * - International: +2519XXXXXXXX or +2517XXXXXXXX
 * - Local with trunk: 09XXXXXXXX or 07XXXXXXXX
 * - Local without trunk: 9XXXXXXXX or 7XXXXXXXX
 * - Country code without plus: 2519XXXXXXXX or 2517XXXXXXXX
 *
 * Normalized storage format: +251XXXXXXXXX (e.g. +251912345678 or +251712345678)
 */

export const ETHIOPIAN_PHONE_REGEX = /^\+251[79]\d{8}$/;
export const ETHIOPIAN_PHONE_ERROR = 'Phone number must be an Ethiopian mobile number (+251 followed by 9 digits starting with 9 or 7)';

export function normalizeEthiopianPhone(input: string): string {
  if (!input) return '';
  const cleaned = input.trim().replace(/[\s\-()]/g, '');

  // 09XXXXXXXX or 07XXXXXXXX (10 digits)
  if (/^0[79]\d{8}$/.test(cleaned)) {
    return '+251' + cleaned.slice(1);
  }
  // 9XXXXXXXX or 7XXXXXXXX (9 digits)
  if (/^[79]\d{8}$/.test(cleaned)) {
    return '+251' + cleaned;
  }
  // 2519XXXXXXXX or 2517XXXXXXXX (12 digits)
  if (/^251[79]\d{8}$/.test(cleaned)) {
    return '+' + cleaned;
  }
  // +2519XXXXXXXX or +2517XXXXXXXX (13 chars)
  if (ETHIOPIAN_PHONE_REGEX.test(cleaned)) {
    return cleaned;
  }

  return cleaned;
}

export function isValidEthiopianPhone(input: string): boolean {
  if (!input || !input.trim()) return false;
  const normalized = normalizeEthiopianPhone(input);
  return ETHIOPIAN_PHONE_REGEX.test(normalized);
}

export function formatEthiopianPhoneInput(value: string): string {
  let val = value.replace(/[^\d+]/g, '');
  if (val && !val.startsWith('+251')) {
    val = '+251' + val.replace(/\+/g, '').replace(/^251/, '').replace(/^0/, '');
  }
  return val;
}
