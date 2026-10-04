export type FxRate = { jpyPerUsd: number; asOf: string };
export type PriceDisplay = { usd: string | null; jpy: string | null };

function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?)?$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]!;
}

export function formatReferencePrice(usd: string | null, fx: FxRate | null): PriceDisplay {
  if (usd === null || !/^\d+(?:\.\d{1,2})?$/.test(usd.trim())) return { usd: null, jpy: null };
  const [whole, fraction = ''] = usd.trim().split('.');
  const cents = BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) return { usd: null, jpy: null };
  const label = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
    .formatToParts(cents / 100n)
    .map(part => part.type === 'fraction' ? (cents % 100n).toString().padStart(2, '0') : part.value).join('');
  if (fx === null || !Number.isFinite(fx.jpyPerUsd) || fx.jpyPerUsd <= 0 || !isIsoDate(fx.asOf)) return { usd: label, jpy: null };
  // Treat the rate's canonical decimal spelling as its supplied decimal value.
  // Integer rational arithmetic avoids intermediate IEEE-754 money rounding.
  const [mantissa, exponent = '0'] = fx.jpyPerUsd.toString().split('e');
  const [rateWhole, rateFraction = ''] = mantissa!.split('.');
  const coefficient = BigInt(rateWhole! + rateFraction);
  const scale = rateFraction.length - Number(exponent);
  const numerator = cents * coefficient * (scale < 0 ? 10n ** BigInt(-scale) : 1n);
  const denominator = 100n * (scale > 0 ? 10n ** BigInt(scale) : 1n);
  const yen = (2n * numerator + denominator) / (2n * denominator);
  if (yen > BigInt(Number.MAX_SAFE_INTEGER)) return { usd: label, jpy: null };
  return { usd: label, jpy: new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(yen) };
}
