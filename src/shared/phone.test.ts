import { describe, expect, it } from 'vitest';
import { toE164 } from './phone';

describe('toE164', () => {
	it('normalise un numéro valide', () => {
		expect(toE164('+33 6 12 34 56 78')).toBe('+33612345678');
		expect(toE164('06 12 34 56 78', 'FR')).toBe('+33612345678');
		expect(toE164('6 12 34 56 78', 'FR')).toBe('+33612345678');
	});

	it('rejette un national sans pays, un numéro invalide ou un poste', () => {
		expect(toE164('06 12 34 56 78')).toBeUndefined();
		expect(toE164('+33 1')).toBeUndefined();
		expect(toE164('+33 1 23 45 67 89 ext 12')).toBeUndefined();
	});
});
