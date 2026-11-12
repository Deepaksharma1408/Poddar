// College Finance Portal - Strict Integer Paise Money Engine
// Indian National Rupee (INR) Formatting with en-IN locale

/**
 * Converts a Rupee amount (possibly with decimal paise) to integer paise.
 * Uses Math.round to avoid floating point precision flaws.
 */
export function toPaise(rupees: number | string): number {
  const num = typeof rupees === 'string' ? parseFloat(rupees.replace(/,/g, '')) : rupees;
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Converts integer paise back to Rupee number (for intermediate division).
 */
export function toRupees(paise: number): number {
  if (!Number.isFinite(paise)) return 0;
  return paise / 100;
}

/**
 * Formats integer paise into a clean, professional Indian Rupee string.
 * e.g. 15000000 paise -> '₹1,50,000' or '₹1,50,000.00'
 */
export function formatINR(
  paise: number,
  options: { showPaise?: boolean; prefixSymbol?: boolean } = {}
): string {
  const { showPaise = false, prefixSymbol = true } = options;
  const rupees = toRupees(paise);

  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'decimal',
    minimumFractionDigits: showPaise ? 2 : 0,
    maximumFractionDigits: showPaise ? 2 : 0,
  });

  const formatted = formatter.format(rupees);
  return prefixSymbol ? `₹${formatted}` : formatted;
}

/**
 * Full formal currency string with paise always visible.
 */
export function formatINRExact(paise: number): string {
  return formatINR(paise, { showPaise: true, prefixSymbol: true });
}

/**
 * Formats paise without the ₹ symbol, suitable for tabular inputs or CSV output.
 */
export function formatPlainINR(paise: number, showPaise = true): string {
  return formatINR(paise, { showPaise, prefixSymbol: false });
}

/**
 * Number in words generator for receipts and payment vouchers (Indian numbering system).
 */
export function paiseInWords(paise: number): string {
  const rupees = Math.floor(Math.abs(paise) / 100);
  const remainderPaise = Math.abs(paise) % 100;

  if (rupees === 0 && remainderPaise === 0) return 'Rupees Zero Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let str = '';
    if (hundred) str += ones[hundred] + ' Hundred';
    if (rest) str += (str ? ' and ' : '') + convertTwoDigits(rest);
    return str;
  }

  let words = '';
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const remaining = rupees % 1000;

  if (crore) words += convertTwoDigits(crore) + ' Crore ';
  if (lakh) words += convertTwoDigits(lakh) + ' Lakh ';
  if (thousand) words += convertTwoDigits(thousand) + ' Thousand ';
  if (remaining) words += convertThreeDigits(remaining);

  words = words.trim();
  let result = words ? `Rupees ${words}` : '';
  if (remainderPaise > 0) {
    result += (result ? ' and ' : '') + `${convertTwoDigits(remainderPaise)} Paise`;
  }
  return (result + ' Only').replace(/\s+/g, ' ');
}

