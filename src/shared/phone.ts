// Métadonnées `max` : valide les plages réelles par pays, pas seulement la longueur.
// Même règle côté app et côté API — c'est l'unique définition d'un numéro valide.
import parsePhoneNumber, { type CountryCode, type E164Number, isSupportedCountry } from 'libphonenumber-js/max';
import { z } from 'zod';

export const PHONE_INTERFACE_ID = 'e164-phone-field';

// Route de l'endpoint qui sert la police des drapeaux, sous `/<PHONE_INTERFACE_ID>`.
export const FLAGS_FONT_PATH = '/flags.woff2';

export const CountryCodeSchema = z.custom<CountryCode>(
	(value) => typeof value === 'string' && isSupportedCountry(value),
);

/**
 * Normalise en E.164. Sans pays, seul un numéro au format international (`+…`) est accepté.
 * Un poste (`ext 12`) est refusé : E.164 ne peut pas le stocker, il serait perdu.
 */
export function toE164(number: string, country?: CountryCode): E164Number | undefined {
	const phone = parsePhoneNumber(number, country);

	if (!phone?.isValid() || phone.ext) return undefined;

	return phone.number;
}
