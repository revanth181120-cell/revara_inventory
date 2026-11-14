export const MAX_BARCODE_VALUE_LENGTH = 80;

const PRINTABLE_ASCII_RE = /^[\x20-\x7E]+$/;

export function normalizeProductCodeInput(code: string): string {
  return code.trim();
}

export function getProductCodeValidationError(code: string): string | null {
  const normalized = normalizeProductCodeInput(code);
  if (!normalized) {
    return 'Product code is required.';
  }
  if (normalized.length > MAX_BARCODE_VALUE_LENGTH) {
    return `Product code must be ${MAX_BARCODE_VALUE_LENGTH} characters or fewer.`;
  }
  if (!PRINTABLE_ASCII_RE.test(normalized)) {
    return 'Product code can only use letters, numbers, spaces, and keyboard symbols supported by CODE128 barcodes.';
  }
  return null;
}

export function canRenderCode128(value: string): boolean {
  return value === normalizeProductCodeInput(value) && getProductCodeValidationError(value) === null;
}
