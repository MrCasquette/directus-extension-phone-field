// Directus n'expose pas son i18n aux extensions (directus/directus#3782) :
// dictionnaire embarqué, anglais par défaut, langue lue sur <html lang> que Directus tient à jour.

const en = {
	defaultCountry: 'Default country',
	preferredCountries: 'Preferred countries',
	selectCountry: 'Select country',
	invalidNumber: 'Invalid phone number',
	call: 'Call',
};

type MessageKey = keyof typeof en;

const messages: Record<string, Record<MessageKey, string>> = {
	en,
	fr: {
		defaultCountry: 'Pays par défaut',
		preferredCountries: 'Pays prioritaires',
		selectCountry: 'Choisir le pays',
		invalidNumber: 'Numéro de téléphone invalide',
		call: 'Appeler le',
	},
};

const FALLBACK_LOCALE = 'en-US';

export function currentLocale(): string {
	return document.documentElement.lang || FALLBACK_LOCALE;
}

// `locale` : la locale réactive de vue-i18n dans un composant, <html lang> ailleurs (config d'interface).
export function t(key: MessageKey, locale = currentLocale()): string {
	const language = locale.split('-')[0] ?? '';

	return (messages[language] ?? en)[key];
}
