function sanitize(values: unknown[]): string[] {
  return values
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0);
}

export function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return sanitize(value);
  if (typeof value !== 'string') return [];

  const raw = value.trim();
  if (!raw) return [];

  // Accept JSON array strings for backward compatibility with old rows.
  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return sanitize(parsed);
    } catch {
      // Fall back to comma split below.
    }
  }

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toStoredStringArray(value: unknown): string {
  return parseStringArray(value).join(', ');
}