import { AsYouType, type CountryCode, getCountryCallingCode } from 'libphonenumber-js/max';

export type Formatted = {
	text: string;
	/** Saisie normalisée réellement formatée : un préfixe d'appel international (00, 011…) y est remplacé par `+`. */
	digits: string;
	country: CountryCode | undefined;
	/** Indicatif d'une saisie internationale, connu avant que le pays ne le soit (+44 7911… incomplet). */
	callingCode: string | undefined;
};

/**
 * Formate à la frappe. Certains pays (FR…) ne formatent le national qu'avec le préfixe `0` :
 * sans lui, on formate comme la suite de l'indicatif affiché (`6 12 34 56 78` après `+33`).
 */
export function formatAsYouType(digits: string, country: CountryCode | undefined): Formatted {
	const formatter = new AsYouType(country);
	const national = formatter.input(digits);

	// `011 33…` depuis les US : réécrit en `+33…`, sinon le pays détecté réinterpréterait la suite de la saisie.
	const callingCode = formatter.getCallingCode();
	const e164 = formatter.getNumberValue();
	if (formatter.isInternational() && !digits.startsWith('+') && callingCode && e164) return formatAsYouType(e164, country);

	const result = { digits, country: formatter.getCountry(), callingCode: formatter.isInternational() ? callingCode : undefined };

	const unformatted = national === digits && formatter.getNumber()?.nationalNumber === digits;
	if (!country || digits.startsWith('+') || !unformatted) return { ...result, text: national };

	const prefix = `+${getCountryCallingCode(country)} `;
	const international = new AsYouType(country).input(prefix + digits);

	return { ...result, text: international.startsWith(prefix) ? international.slice(prefix.length) : national };
}

