import { parseIncompletePhoneNumber } from 'libphonenumber-js/max';

// Édition caractère par caractère : seuls les chiffres et un `+` initial comptent, le reste est de la mise en forme.
const SIGNIFICANT = /[\d+]/;

/** Ne garde que les chiffres (pleine chasse et arabes convertis) et un éventuel `+` en tête. */
export function sanitize(text: string): string {
	return parseIncompletePhoneNumber(text);
}

export function isSignificant(char: string | undefined): boolean {
	return char !== undefined && SIGNIFICANT.test(char);
}

/** Index du premier caractère significatif à partir de `from`, dans le sens `step`. */
export function findSignificant(text: string, from: number, step: 1 | -1): number | undefined {
	for (let index = from; index >= 0 && index < text.length; index += step) {
		if (isSignificant(text[index])) return index;
	}

	return undefined;
}

/** Position juste après le `count`-ième caractère significatif de `formatted`. */
export function positionAfter(formatted: string, count: number): number {
	if (count === 0) return 0;

	let seen = 0;

	for (let index = 0; index < formatted.length; index++) {
		if (isSignificant(formatted[index]) && ++seen === count) return index + 1;
	}

	return formatted.length;
}

// Les flèches sautent les séparateurs : le caret se pose toujours juste après un chiffre (`01| 23` → `01 2|3`).

export function stepRight(text: string, caret: number): number {
	const next = findSignificant(text, caret, 1);

	return next === undefined ? caret : next + 1;
}

export function stepLeft(text: string, caret: number): number {
	const passed = findSignificant(text, caret - 1, -1);
	if (passed === undefined) return 0;

	const previous = findSignificant(text, passed - 1, -1);

	return previous === undefined ? 0 : previous + 1;
}
