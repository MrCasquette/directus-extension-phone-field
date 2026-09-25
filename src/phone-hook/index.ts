import { defineHook } from '@directus/extensions-sdk';
import type { EventContext } from '@directus/types';
import { FailedValidationError } from '@directus/validation';
import { z } from 'zod';
import { CountryCodeSchema, PHONE_INTERFACE_ID, toE164 } from '../shared/phone';

type Knex = EventContext['database'];

// Écriture acceptée : chaîne internationale (dont E.164) ou { country, number }.
const PhoneWriteSchema = z.union([
	z.string(),
	z.object({ country: CountryCodeSchema, number: z.string() }),
]);

// Seul texte libre que l'outil `schema` du MCP Directus transmet : indique le format attendu aux agents.
const FIELD_NOTE = 'Any international format (e.g. +33 6 12 34 56 78), stored as E.164 (+33612345678)';

const PayloadSchema = z.record(z.string(), z.unknown());
const EventMetaSchema = z.object({ collection: z.string() });
const FieldNamesSchema = z.array(z.string());
const FieldNoteRowSchema = z.object({ note: z.string().nullable() }).optional();

// L'admin n'envoie que les modifications : `interface` à la création ou au changement, `note` si elle est touchée.
const FieldPayloadSchema = z.looseObject({
	field: z.string(),
	meta: z.looseObject({ interface: z.string().nullish() }).nullish(),
});

function parsePhoneWrite(value: unknown): string | undefined {
	const parsed = PhoneWriteSchema.safeParse(value);

	if (!parsed.success) return undefined;
	if (typeof parsed.data === 'string') return toE164(parsed.data);

	return toE164(parsed.data.number, parsed.data.country);
}

async function fetchPhoneFields(database: Knex, collection: string): Promise<string[]> {
	const fields = await database('directus_fields')
		.where({ collection, interface: PHONE_INTERFACE_ID })
		.pluck('field');

	return FieldNamesSchema.parse(fields);
}

async function normalizePhoneFields(payload: unknown, meta: Record<string, unknown>, database: Knex): Promise<unknown> {
	const record = PayloadSchema.safeParse(payload);

	if (!record.success) return payload;

	const { collection } = EventMetaSchema.parse(meta);
	const phoneFields = (await fetchPhoneFields(database, collection)).filter((field) => field in record.data);

	if (phoneFields.length === 0) return payload;

	const normalized = { ...record.data };
	const errors: InstanceType<typeof FailedValidationError>[] = [];

	for (const field of phoneFields) {
		const value = normalized[field];

		// La nullabilité reste gérée par la validation native du champ.
		if (value === null) continue;

		const e164 = parsePhoneWrite(value);

		if (e164) {
			normalized[field] = e164;
		} else {
			errors.push(new FailedValidationError({ field, path: [], type: 'regex' }));
		}
	}

	// Même forme que la validation native : un tableau d'erreurs FAILED_VALIDATION.
	if (errors.length > 0) throw errors;

	return normalized;
}

async function fetchFieldNote(database: Knex, collection: string, field: string): Promise<string | null> {
	const row = await database('directus_fields').where({ collection, field }).first('note');

	return FieldNoteRowSchema.parse(row)?.note ?? null;
}

async function addDefaultNote(payload: unknown, meta: Record<string, unknown>, database: Knex): Promise<unknown> {
	const parsed = FieldPayloadSchema.safeParse(payload);

	if (!parsed.success) return payload;

	const fieldMeta = parsed.data.meta;

	// Une note fournie par l'admin, même vide, n'est jamais écrasée.
	if (fieldMeta?.interface !== PHONE_INTERFACE_ID || 'note' in fieldMeta) return payload;

	const { collection } = EventMetaSchema.parse(meta);

	if (await fetchFieldNote(database, collection, parsed.data.field)) return payload;

	return { ...parsed.data, meta: { ...fieldMeta, note: FIELD_NOTE } };
}

export default defineHook(({ filter }) => {
	filter('items.create', (payload, meta, { database }) => normalizePhoneFields(payload, meta, database));
	filter('items.update', (payload, meta, { database }) => normalizePhoneFields(payload, meta, database));
	filter('fields.create', (payload, meta, { database }) => addDefaultNote(payload, meta, database));
	filter('fields.update', (payload, meta, { database }) => addDefaultNote(payload, meta, database));
});
