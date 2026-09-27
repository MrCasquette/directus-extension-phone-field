import { describe, expect, it } from 'vitest';
import { formatAsYouType } from './format';

describe('formatAsYouType', () => {
	it('formate le national avec ou sans préfixe', () => {
		expect(formatAsYouType('0612345678', 'FR').text).toBe('06 12 34 56 78');
		expect(formatAsYouType('612345678', 'FR').text).toBe('6 12 34 56 78');
		expect(formatAsYouType('122212', 'FR').text).toBe('1 22 21 2');
		expect(formatAsYouType('2025550123', 'US').text).toBe('(202) 555-0123');
	});

	it('détecte le pays et l’indicatif d’une saisie internationale', () => {
		expect(formatAsYouType('+447400123456', 'FR')).toMatchObject({ country: 'GB', callingCode: '44' });
		expect(formatAsYouType('+4479', 'FR')).toMatchObject({ country: undefined, callingCode: '44' });
		expect(formatAsYouType('0612', 'FR').callingCode).toBeUndefined();
	});

	it('réécrit un préfixe d’appel international en +', () => {
		expect(formatAsYouType('01133612345678', 'US')).toMatchObject({
			text: '+33 6 12 34 56 78',
			digits: '+33612345678',
			country: 'FR',
		});
		expect(formatAsYouType('0012015550123', 'FR')).toMatchObject({ text: '+1 201 555 0123', country: 'US' });
	});
});
