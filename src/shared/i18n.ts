// Directus n'expose pas son i18n aux extensions (directus/directus#3782) :
// dictionnaire embarqué, anglais par défaut, langue lue sur <html lang> que Directus tient à jour.

const en = {
	defaultCountry: 'Default country',
	preferredCountries: 'Preferred countries',
};

type MessageKey = keyof typeof en;

const messages: Record<string, Record<MessageKey, string>> = {
	en,
	fr: {
		defaultCountry: 'Pays par défaut',
		preferredCountries: 'Pays prioritaires',
	},
};

const FALLBACK_LOCALE = 'en-US';

export function currentLocale(): string {
	return document.documentElement.lang || FALLBACK_LOCALE;
}

export function t(key: MessageKey): string {
	const language = currentLocale().split('-')[0] ?? '';

	return (messages[language] ?? en)[key];
}
