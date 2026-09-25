import { defineInterface } from '@directus/extensions-sdk';
import { countryOptions } from '../shared/country';
import { currentLocale, t } from '../shared/i18n';
import { PHONE_INTERFACE_ID } from '../shared/phone';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: PHONE_INTERFACE_ID,
	name: 'Phone',
	icon: 'phone',
	description: 'Phone number input with country selector',
	component: InterfaceComponent,
	types: ['string'],
	recommendedDisplays: [PHONE_INTERFACE_ID],
	// Fonction : évaluée à l'ouverture de la config du champ, donc dans la langue courante.
	options: () => {
		const choices = countryOptions(currentLocale());

		return [
			{
				field: 'defaultCountry',
				name: t('defaultCountry'),
				type: 'string',
				meta: { width: 'half', interface: 'select-dropdown', options: { choices } },
			},
			{
				field: 'preferredCountries',
				name: t('preferredCountries'),
				type: 'json',
				meta: { width: 'half', interface: 'select-multiple-dropdown', options: { choices } },
			},
		];
	},
});
