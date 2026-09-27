import { describe, expect, it } from 'vitest';
import { useEditHistory } from './use-edit-history';

describe('useEditHistory', () => {
	it('annule puis rétablit', () => {
		const history = useEditHistory<string>();

		history.record('a');
		history.record('ab');

		expect(history.undo('abc')).toBe('ab');
		expect(history.undo('ab')).toBe('a');
		expect(history.undo('a')).toBeUndefined();
		expect(history.redo('a')).toBe('ab');
	});

	it('une nouvelle modification efface le rétablissement', () => {
		const history = useEditHistory<string>();

		history.record('a');
		history.undo('ab');
		history.record('a');

		expect(history.redo('ax')).toBeUndefined();
	});
});
