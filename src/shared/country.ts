// Côté app uniquement : dépend du DOM (polyfill) et d'Intl.
import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';
import { type CountryCode, getCountries, getCountryCallingCode } from 'libphonenumber-js/max';

// Chromium sous Windows n'a pas de glyphes drapeaux : police de repli limitée aux drapeaux.
polyfillCountryFlagEmojis();

export const FLAG_FONT_FAMILY = "'Twemoji Country Flags', var(--theme--fonts--sans--font-family)";

const REGIONAL_INDICATOR_OFFSET = 0x1f1e6 - 'A'.charCodeAt(0);

export type CountryOption = { value: CountryCode; text: string };

export function flag(country: CountryCode): string {
	return String.fromCodePoint(...[...country].map((letter) => letter.charCodeAt(0) + REGIONAL_INDICATOR_OFFSET));
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
