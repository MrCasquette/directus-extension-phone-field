import { describe, expect, it } from 'vitest';
import { positionAfter, sanitize, stepLeft, stepRight } from './caret';

// `|` marque le caret.
function place(text: string, caret: number): string {
	return `${text.slice(0, caret)}|${text.slice(caret)}`;
}

describe('sanitize', () => {
	it('ne garde que les chiffres et un + initial', () => {
		expect(sanitize('06 12-34 a')).toBe('061234');
		expect(sanitize('+33 6 +12')).toBe('+33612');
	});

	it('convertit les chiffres pleine chasse et arabes', () => {
		expect(sanitize('０９０-１２３４')).toBe('0901234');
		expect(sanitize('٠١٠')).toBe('010');
	});
});

describe('positionAfter', () => {
	it('se place juste après le n-ième chiffre', () => {
		expect(place('06 12 34', positionAfter('06 12 34', 3))).toBe('06 1|2 34');
		expect(place('(202) 555', positionAfter('(202) 555', 3))).toBe('(202|) 555');
		expect(positionAfter('06 12', 0)).toBe(0);
		expect(positionAfter('06 12', 99)).toBe(5);
	});
});

describe('flèches', () => {
	it('→ saute le séparateur puis passe un chiffre', () => {
		expect(place('01 23', stepRight('01 23', 2))).toBe('01 2|3');
		expect(place('01 23', stepRight('01 23', 5))).toBe('01 23|');
	});

	it('← passe un chiffre puis revient après le chiffre précédent', () => {
		expect(place('01 23', stepLeft('01 23', 4))).toBe('01| 23');
		expect(place('01 23', stepLeft('01 23', 3))).toBe('0|1 23');
		expect(place('(202) 5', stepLeft('(202) 5', 2))).toBe('|(202) 5');
	});
});
