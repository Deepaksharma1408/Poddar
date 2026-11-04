export function installment(principal: number, annualRate: number, months: number, method: string) {
  if (principal <= 0 || months <= 0) return { monthly: 0, interest: 0, total: 0 };
  const r = annualRate / 1200;
  const monthly = r === 0 ? principal / months : method === 'Flat interest' ? (principal + principal * annualRate / 100 * months / 12) / months : principal * r * (1+r) ** months / ((1+r) ** months - 1);
  return { monthly, interest: monthly * months - principal, total: monthly * months };
}
export const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
export const moneyPrecise = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
