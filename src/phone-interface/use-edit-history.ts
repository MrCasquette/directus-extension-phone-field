// Le champ réécrit sa valeur à chaque frappe : l'historique natif du navigateur est inutilisable, on tient le nôtre.
export function useEditHistory<Snapshot>() {
	const undoStack: Snapshot[] = [];
	const redoStack: Snapshot[] = [];

	/** À appeler avant une modification, avec l'état qu'elle va remplacer. */
	function record(previous: Snapshot) {
		undoStack.push(previous);
		redoStack.length = 0;
	}

	function undo(current: Snapshot): Snapshot | undefined {
		const previous = undoStack.pop();
		if (previous !== undefined) redoStack.push(current);

		return previous;
	}

	function redo(current: Snapshot): Snapshot | undefined {
		const next = redoStack.pop();
		if (next !== undefined) undoStack.push(current);

		return next;
	}

	function clear() {
		undoStack.length = 0;
		redoStack.length = 0;
	}

	return { record, undo, redo, clear };
}
