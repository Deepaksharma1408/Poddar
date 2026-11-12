// College Finance Portal - CSV Formula Injection Sanitizer
// Protects against Spreadsheet Formula Injection (CSV Injection) attacks.
// Cells starting with =, +, -, @, \t, or \r are neutralized with a leading single quote (').

/**
 * Sanitizes an individual cell string for safe CSV export.
 */
export function sanitizeCSVCell(value: unknown): string {
  if (value === null || value === undefined) return '""';

  let str = String(value);

  // Strip formula injection triggers
  const formulaTriggers = ['=', '+', '-', '@', '\t', '\r'];
  if (formulaTriggers.some(trigger => str.startsWith(trigger))) {
    str = `'${str}`;
  }

  // Escape inner double quotes
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Converts a 2D array of rows into a fully sanitized CSV string.
 */
export function generateSafeCSV(rows: (string | number | boolean | null | undefined)[][]): string {
  return rows.map(row => row.map(sanitizeCSVCell).join(',')).join('\r\n');
}

/**
 * Triggers browser download for a safe CSV file.
 */
export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

