const UNIT_PATTERN = /^(\d+)\s*(?:-|to)?\s*(\d+)?\s*-?\s*(day|week|month)s?$/i;

/**
 * Normalizes a free-typed delivery time ("1day", "1WEEK", "3Month",
 * "2 to 3 weeks", ...) into the canonical "N-unit" / "N-N-unit" form
 * ("1-day", "3-months", "2-3-weeks"). Case, spacing, and separator (hyphen,
 * "to", or nothing) between the number and unit are all accepted.
 *
 * Text that doesn't match a number + day/week/month shape (e.g. "Contact
 * us", "Same day dispatch") is returned trimmed but otherwise untouched —
 * this field is free text, so an unrecognized value is left for a human to
 * read rather than silently discarded or rejected.
 */
export function formatDeliveryTime(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  const match = trimmed.match(UNIT_PATTERN);
  if (!match) return trimmed;

  const [, startStr, endStr, unit] = match;
  const start = Number(startStr);
  const end = endStr ? Number(endStr) : undefined;
  const pluralizingCount = end ?? start;
  const unitWord = pluralizingCount === 1 ? unit.toLowerCase() : `${unit.toLowerCase()}s`;

  return end === undefined ? `${start}-${unitWord}` : `${start}-${end}-${unitWord}`;
}
