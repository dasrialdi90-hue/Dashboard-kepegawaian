/**
 * Standard robust RFC 4180-compliant CSV parser.
 * Works perfectly with comma-separated values exported from Google Sheets.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQ = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQ = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQ = true;
      } else if (c === ',') {
        row.push(field.trim());
        field = '';
      } else if (c === '\n' || (c === '\r' && text[i + 1] === '\n')) {
        if (c === '\r') i++;
        row.push(field.trim());
        if (row.some(f => f)) {
          rows.push(row);
        }
        row = [];
        field = '';
      } else {
        field += c;
      }
    }
  }
  
  // Wrap up any remaining fields
  if (field || row.length > 0) {
    row.push(field.trim());
    if (row.some(f => f)) {
      rows.push(row);
    }
  }

  return rows;
}

/**
 * Standardizes Indonesian/Universal Date Strings into JS Date objects
 */
export function parseIndonesianDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Clean whitespace
  const cleaned = dateStr.trim();
  
  // Typical patterns:
  // 1. YYYY-MM-DD
  // 2. DD/MM/YYYY
  // 3. DD-MM-YYYY
  const p1 = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (p1) {
    return new Date(parseInt(p1[1]), parseInt(p1[2]) - 1, parseInt(p1[3]));
  }

  const p2 = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (p2) {
    return new Date(parseInt(p2[3]), parseInt(p2[2]) - 1, parseInt(p2[1]));
  }

  const p3 = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (p3) {
    return new Date(parseInt(p3[3]), parseInt(p3[2]) - 1, parseInt(p3[1]));
  }

  // Fallback direct parser
  const parsed = Date.parse(cleaned);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }

  return null;
}

/**
 * Formats JS dates to Indonesian readable strings
 */
export function formatIndonesianDate(date: Date): string {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
