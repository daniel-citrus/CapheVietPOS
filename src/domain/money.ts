/**
 * Money is stored the way Square stores it: an integer amount in the currency's
 * minor unit (cents for USD) plus an ISO currency code. Never a float.
 */
export interface Money {
  /** Integer amount in the minor unit, e.g. 450 === $4.50 */
  amount: number;
  /** ISO 4217 code, e.g. "USD" */
  currency: string;
}

export const zeroMoney = (currency = "USD"): Money => ({ amount: 0, currency });

export function formatMoney(money: Money, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
  }).format(money.amount / 100);
}

/** Parse a user-entered string like "4.50" into Money. Returns null if invalid. */
export function parseMoney(input: string, currency = "USD"): Money | null {
  const trimmed = input.trim().replace(/[$,]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return { amount: Math.round(parseFloat(trimmed) * 100), currency };
}
