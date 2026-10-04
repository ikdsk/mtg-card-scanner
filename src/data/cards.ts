export type Face = { name: string; printed_name?: string; printed_text?: string; oracle_text?: string; type_line?: string; printed_type_line?: string; mana_cost?: string };
export type Card = Face & { id: string; oracle_id: string; lang: string; set: string; set_name: string; collector_number: string; finishes: string[]; prices: Record<string, string | null>; legalities: Record<string, string>; card_faces?: Face[]; scryfall_uri?: string };
export function finishPrice(card: Card, finish: string): string | null {
  if (!card.finishes.includes(finish)) return null;
  const key = { nonfoil: 'usd', foil: 'usd_foil', etched: 'usd_etched' }[finish];
  return key ? card.prices[key] ?? null : null;
}
