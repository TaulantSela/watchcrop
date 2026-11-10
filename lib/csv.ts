/**
 * Quotes a CSV field, and defuses spreadsheet formula injection: a value
 * starting with = + - @ would otherwise run as a formula when opened.
 */
export function csvField(v: unknown): string {
  let s = v instanceof Date ? v.toISOString() : String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
