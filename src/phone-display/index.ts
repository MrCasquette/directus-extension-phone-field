import { defineDisplay } from '@directus/extensions-sdk';
import { PHONE_INTERFACE_ID } from '../shared/phone';
import DisplayComponent from './display.vue';

export default defineDisplay({
	id: PHONE_INTERFACE_ID,
	name: 'Phone',
	icon: 'phone',
	description: 'Formatted phone number with flag and link',
	component: DisplayComponent,
	types: ['string'],
	options: [
		{
			field: 'format',
			name: '$t:format',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'select-dropdown',
				options: {
					choices: [
						{ text: 'International', value: 'international' },
						{ text: 'National', value: 'national' },
					],
				},
			},
			schema: { default_value: 'international' },
		},
	],
});
