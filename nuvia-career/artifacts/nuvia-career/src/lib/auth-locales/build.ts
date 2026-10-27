import { enUS } from '@clerk/localizations';

/**
 * Builds a Clerk localization from a flat dotted-key map layered over enUS.
 * Keys absent from the flat map keep the vendor English string (reported as
 * untranslated scope: userProfile, organization, billing, etc.,
 * which NUVIA never renders).
 */
export function buildAuthLocale(locale: string, flat: Record<string, string>): typeof enUS {
  const out: Record<string, unknown> = JSON.parse(JSON.stringify(enUS));
  out.locale = locale;
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split('.');
    let node = out;
    for (const p of parts.slice(0, -1)) {
      if (typeof node[p] !== 'object' || node[p] === null) node[p] = {};
      node = node[p] as Record<string, unknown>;
    }
    node[parts[parts.length - 1]] = value;
  }
  return out as typeof enUS;
}
