import XLSX from 'xlsx';

/**
 * Normalizes and formats the P No value.
 * - Trims spaces
 * - Converts scientific notation to text (e.g. 1.06245e5 -> 106245)
 * - Preserves leading zeros (e.g. "01234" -> "01234")
 * - Strips any trailing ".0" decimals
 */
export function cleanPNo(val: unknown): string {
  if (val === undefined || val === null) return '';
  let str = String(val).trim();
  
  // Handle scientific notation (e.g., 1.23E+5 or 1.23e+5)
  if (/^[+-]?[0-9]+(\.[0-9]+)?[eE][+-]?[0-9]+$/.test(str)) {
    const num = Number(str);
    if (!isNaN(num)) {
      str = String(num);
    }
  }
  
  // Strip trailing decimals like '.0' (Excel often adds .0 to integer values)
  if (str.endsWith('.0')) {
    str = str.slice(0, -2);
  }
  
  return str;
}

/**
 * Validates that the uploaded headers match the expected standardized headers exactly.
 * Ignores casing and leading/trailing spaces for validation purposes, but requires all expected columns in correct order.
 */
export function validateExcelHeaders(uploadedHeaders: string[], expectedHeaders: string[]): string | null {
  const cleanExpected = expectedHeaders.map(h => h.trim().toLowerCase());
  const cleanUploaded = uploadedHeaders.map(h => h.trim().toLowerCase());

  if (cleanUploaded.length !== cleanExpected.length) {
    return `Uploaded columns do not match expected template. Expected ${expectedHeaders.length} columns: [${expectedHeaders.join(', ')}]. Uploaded: [${uploadedHeaders.join(', ')}]`;
  }

  for (let i = 0; i < cleanExpected.length; i++) {
    if (cleanUploaded[i] !== cleanExpected[i]) {
      return `Column header mismatch at position ${i + 1}. Expected: "${expectedHeaders[i]}", Got: "${uploadedHeaders[i] || ''}"`;
    }
  }

  return null;
}

/**
 * Safely converts any value to a trimmed string.
 */
export function toText(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

/**
 * Safely parses any value to a number, using a fallback if invalid.
 */
export function toNumber(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
