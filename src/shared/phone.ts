// Métadonnées `max` : valide les plages réelles par pays, pas seulement la longueur.
// Même règle côté app et côté API — c'est l'unique définition d'un numéro valide.
import parsePhoneNumber, { type CountryCode, type E164Number, isSupportedCountry } from 'libphonenumber-js/max';
import { z } from 'zod';

export const PHONE_INTERFACE_ID = 'e164-phone-field';

export const CountryCodeSchema = z.custom<CountryCode>(
	(value) => typeof value === 'string' && isSupportedCountry(value),
);

/** Normalise en E.164. Sans pays, seul un numéro au format international (`+…`) est accepté. */
export function toE164(number: string, country?: CountryCode): E164Number | undefined {
	const phone = parsePhoneNumber(number, country);

	if (!phone?.isValid()) return undefined;

	return phone.number;
}
