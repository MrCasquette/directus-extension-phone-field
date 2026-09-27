// Côté app uniquement : dépend du DOM (polyfill) et d'Intl.
import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';
import { type CountryCode, getCountries, getCountryCallingCode } from 'libphonenumber-js/max';
import { FLAGS_FONT_PATH, PHONE_INTERFACE_ID } from './phone';

const FLAG_FONT_NAME = 'Twemoji Country Flags';

export const FLAG_FONT_FAMILY = `'${FLAG_FONT_NAME}', var(--theme--fonts--sans--font-family)`;

let flagFontPolyfilled = false;

/**
 * Chromium sous Windows n'a pas de glyphes drapeaux : police de repli limitée aux drapeaux, servie par notre endpoint.
 * Appelé au montage des composants, pas au chargement de l'app ; le polyfill ne télécharge la police que si nécessaire.
 */
export function polyfillFlags() {
	if (flagFontPolyfilled) return;

	flagFontPolyfilled = true;

	// <base href> pointe sur `/admin/` (sous-chemin de PUBLIC_URL compris) : l'endpoint est à la racine voisine.
	polyfillCountryFlagEmojis(FLAG_FONT_NAME, new URL(`../${PHONE_INTERFACE_ID}${FLAGS_FONT_PATH}`, document.baseURI).href);
}

const REGIONAL_INDICATOR_OFFSET = 0x1f1e6 - 'A'.charCodeAt(0);

export type CountryOption = { value: CountryCode; text: string };

export function flag(country: CountryCode): string {
	return String.fromCodePoint(...[...country].map((letter) => letter.charCodeAt(0) + REGIONAL_INDICATOR_OFFSET));
}

export function countryName(country: CountryCode, locale: string): string {
	return new Intl.DisplayNames([locale], { type: 'region' }).of(country) ?? country;
}

export function countryOptions(locale: string): CountryOption[] {
	const names = new Intl.DisplayNames([locale], { type: 'region' });

	return getCountries()
		.map((country) => ({ country, name: names.of(country) ?? country }))
		.sort((a, b) => a.name.localeCompare(b.name, locale))
		.map(({ country, name }) => ({
			value: country,
			text: `${flag(country)} ${name} (+${getCountryCallingCode(country)})`,
		}));
}
