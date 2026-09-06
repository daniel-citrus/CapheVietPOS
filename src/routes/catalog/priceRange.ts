import type { Item } from "shared/domain";
import { formatMoney } from "shared/domain";

/** "$4.50" or "$4.50 – $5.25" across an item's variations. */
export function priceRange(item: Item): string {
  if (item.variations.length === 0) return "—";
  const amounts = item.variations.map((v) => v.price.amount);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const currency = item.variations[0].price.currency;
  if (min === max) return formatMoney({ amount: min, currency });
  return `${formatMoney({ amount: min, currency })} – ${formatMoney({ amount: max, currency })}`;
}
