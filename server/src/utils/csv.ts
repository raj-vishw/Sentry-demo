/**
 * A value starting with =, +, -, or @ can be interpreted as a formula by
 * Excel/Sheets when the CSV is opened — defanged with a leading apostrophe
 * (a plain-text marker both tools respect) since several exported fields
 * (username, email, challenge title) are user-controlled.
 */
function toCsvField(value: string): string {
  const defanged = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\r\n]/.test(defanged)) {
    return `"${defanged.replace(/"/g, '""')}"`;
  }
  return defanged;
}

export function toCsv(header: string[], rows: string[][]): string {
  return [header, ...rows].map((row) => row.map(toCsvField).join(',')).join('\r\n') + '\r\n';
}
