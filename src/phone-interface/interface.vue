<script setup lang="ts">
import parsePhoneNumber, {
	type CountryCode,
	getCountryCallingCode,
	getExampleNumber,
	type PhoneNumber,
	validatePhoneNumberLength,
} from 'libphonenumber-js/max';
import examples from 'libphonenumber-js/mobile/examples';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { z } from 'zod';
import { countryName, countryOptions, FLAG_FONT_FAMILY, flag, polyfillFlags } from '../shared/country';
import { t } from '../shared/i18n';
import { CountryCodeSchema, toE164 } from '../shared/phone';
import { findSignificant, isSignificant, positionAfter, sanitize, stepLeft, stepRight } from './caret';
import CloseOnResize from './close-on-resize.vue';
import { formatAsYouType } from './format';
import { useEditHistory } from './use-edit-history';

const props = withDefaults(
	defineProps<{
		value: string | null;
		disabled?: boolean;
		nonEditable?: boolean;
		// Options de l'interface : configurées par l'admin, donc parsées.
		defaultCountry?: unknown;
		preferredCountries?: unknown;
	}>(),
	{ disabled: false, nonEditable: false },
);

const emit = defineEmits<{ input: [value: string | null] }>();

type Snapshot = { text: string; country: CountryCode | undefined; internationalCode: string | undefined; caret: number };
type HistoryAction = 'undo' | 'redo';

// Collage ou glisser-déposer : un numéro complet remplace la saisie au lieu de s'y ajouter.
const DROP_INPUT_TYPES = ['insertFromPaste', 'insertFromDrop'];

const { locale } = useI18n();

polyfillFlags();

const defaultCountry = computed(() => CountryCodeSchema.optional().catch(undefined).parse(props.defaultCountry));
const preferredCountries = computed(() => z.array(CountryCodeSchema).catch([]).parse(props.preferredCountries));

// Pays du sélecteur : sert à interpréter une saisie nationale.
const country = ref<CountryCode>();
// Indicatif d'une saisie internationale (+44…) : prime sur le pays pour l'affichage du sélecteur.
const internationalCode = ref<string>();
const text = ref('');
// Édition (focus, frappe) : bouton d'appel désactivé. Validation (Entrée, sortie du champ) : forme canonique, bouton actif.
const editing = ref(false);
let lastEmitted: string | null | undefined;
let lastCaret = 0;

const history = useEditHistory<Snapshot>();

watch(() => props.value, syncFromValue, { immediate: true });

const countryCallingCode = computed(() => (country.value ? getCountryCallingCode(country.value) : undefined));

const callingCode = computed(() => internationalCode.value ?? countryCallingCode.value);

// Drapeau seulement s'il correspond à l'indicatif affiché (+800 non géographique, +44 incomplet : globe).
const shownCountry = computed(() =>
	internationalCode.value === undefined || internationalCode.value === countryCallingCode.value
		? country.value
		: undefined,
);

const countryLabel = computed(() => {
	const selected = shownCountry.value ? countryName(shownCountry.value, locale.value) : undefined;
	const code = callingCode.value ? ` (+${callingCode.value})` : '';

	return `${t('selectCountry', locale.value)}${selected || code ? `: ${selected ?? ''}${code}` : ''}`;
});

const placeholder = computed(() => (country.value ? getExampleNumber(country.value, examples)?.formatNational() : undefined));

const e164 = computed(() => toE164(text.value, country.value));

// Pas d'appel pendant l'édition : un numéro valide en cours de correction peut être faux.
const callUri = computed(() => (!editing.value && e164.value ? `tel:${e164.value}` : undefined));

const invalid = computed(() => !editing.value && text.value.trim() !== '' && e164.value === undefined);

const countryItems = computed(() => {
	const all = countryOptions(locale.value);
	const preferred = preferredCountries.value;

	if (preferred.length === 0) return all;

	const top = all.filter((option) => preferred.includes(option.value));
	const rest = all.filter((option) => !preferred.includes(option.value));

	return [...top, { divider: true }, ...rest];
});

function syncFromValue(value: string | null) {
	// Évite de reformater la saisie en cours quand la valeur revient du parent.
	if (value === lastEmitted) return;

	const phone = value ? parsePhoneNumber(value) : undefined;

	// Valeur changée hors du champ (annulation du formulaire…) : l'historique ne s'applique plus.
	history.clear();

	country.value = phone?.country ?? defaultCountry.value;
	internationalCode.value = phone && !phone.country ? phone.countryCallingCode : undefined;
	text.value = phone ? canonicalText(phone) : (value ?? '');
	lastCaret = text.value.length;
}

// Forme canonique : nationale pour un pays connu (`06 12 34 56 78`), internationale sinon (+800…).
function canonicalText(phone: PhoneNumber): string {
	return phone.country ? phone.formatNational() : phone.formatInternational();
}

function validate() {
	editing.value = false;

	const phone = e164.value ? parsePhoneNumber(e164.value) : undefined;
	if (!phone) return;

	const canonical = canonicalText(phone);

	if (canonical === text.value) return;

	history.record(snapshot());

	country.value = phone.country ?? country.value;
	internationalCode.value = phone.country ? undefined : phone.countryCallingCode;
	text.value = canonical;
	lastCaret = canonical.length;
}

function snapshot(): Snapshot {
	return { text: text.value, country: country.value, internationalCode: internationalCode.value, caret: lastCaret };
}

// Native `input` : v-input ne repatche pas le DOM quand la valeur formatée est inchangée (espace tapé), on l'écrit nous-mêmes.
function onInput(event: Event) {
	// Composition IME en cours : on laisse faire, `compositionend` rappelle ce handler.
	if (event instanceof InputEvent && event.isComposing) return;
	if (!(event.target instanceof HTMLInputElement)) return;

	const { value, selectionStart } = event.target;

	applyInput(event.target, value, sanitize(value.slice(0, selectionStart ?? value.length)).length);
}

// Filtre la frappe (espaces, lettres), gère l'effacement d'un séparateur, le collage et la longueur max du pays.
function onBeforeInput(event: Event) {
	if (!(event instanceof InputEvent) || !(event.target instanceof HTMLInputElement)) return;
	// Composition IME : non annulable, `onInput` reformate à la fin.
	if (!event.cancelable) return;

	const input = event.target;

	// Menu Édition > Annuler / Rétablir.
	if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
		event.preventDefault();
		travel(input, event.inputType === 'historyUndo' ? 'undo' : 'redo');
		return;
	}
	const { value } = input;
	const start = input.selectionStart ?? value.length;
	const end = input.selectionEnd ?? value.length;

	if (event.inputType === 'deleteContentBackward' && start === end && !isSignificant(value[start - 1])) {
		event.preventDefault();

		const previous = findSignificant(value, start - 1, -1);
		if (previous === undefined) return;

		applyInput(input, value.slice(0, previous) + value.slice(start), sanitize(value.slice(0, previous)).length);
		return;
	}

	if (event.inputType === 'deleteContentForward' && start === end && !isSignificant(value[start])) {
		event.preventDefault();

		const next = findSignificant(value, start, 1);
		if (next === undefined) return;

		applyInput(input, value.slice(0, start) + value.slice(next + 1), sanitize(value.slice(0, start)).length);
		return;
	}

	const inserted = event.data ?? event.dataTransfer?.getData('text/plain');
	if (!inserted) return;

	const insertedDigits = sanitize(inserted);

	if (insertedDigits === '') {
		event.preventDefault();
		return;
	}

	if (DROP_INPUT_TYPES.includes(event.inputType) && isCompleteNumber(inserted)) {
		event.preventDefault();
		applyInput(input, inserted, insertedDigits.length);
		return;
	}

	const next = value.slice(0, start) + inserted + value.slice(end);

	if (validatePhoneNumberLength(next, country.value) === 'TOO_LONG') event.preventDefault();
}

function isCompleteNumber(inserted: string): boolean {
	return sanitize(inserted).startsWith('+') || toE164(inserted, country.value) !== undefined;
}

function applyInput(input: HTMLInputElement, raw: string, significantBeforeCaret: number) {
	const digits = sanitize(raw);
	const formatted = formatAsYouType(digits, country.value);
	// Préfixe international réécrit (011 → +) : le caret suit le même chiffre.
	const shift = formatted.digits.length - digits.length;
	const caret = positionAfter(formatted.text, Math.max(0, significantBeforeCaret + shift));

	if (formatted.text !== text.value) history.record(snapshot());

	editing.value = true;
	lastCaret = caret;
	text.value = formatted.text;
	input.value = formatted.text;

	// Autofill de plusieurs champs : ne pas voler le focus.
	if (document.activeElement === input) input.setSelectionRange(caret, caret);

	// Saisie au format international (+44…) : le sélecteur suit le numéro.
	if (formatted.country) country.value = formatted.country;
	internationalCode.value = formatted.callingCode;

	emitValue();
}

function onKeydown(event: KeyboardEvent) {
	if (!(event.target instanceof HTMLInputElement)) return;

	if (event.key === 'Enter') {
		event.preventDefault();
		validate();
		return;
	}

	// Toujours intercepté, même sans rien à annuler : sinon le raccourci remonte au navigateur (Arc rouvre un onglet).
	const action = historyAction(event);
	if (action) {
		event.preventDefault();
		travel(event.target, action);
		return;
	}

	if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
	if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;

	const { value, selectionStart, selectionEnd } = event.target;
	if (selectionStart === null || selectionStart !== selectionEnd) return;

	event.preventDefault();

	const caret = event.key === 'ArrowRight' ? stepRight(value, selectionStart) : stepLeft(value, selectionStart);
	event.target.setSelectionRange(caret, caret);
	lastCaret = caret;
}

// Cmd/Ctrl+Z annule ; Cmd/Ctrl+Shift+Z et Ctrl+Y rétablissent.
function historyAction(event: KeyboardEvent): HistoryAction | undefined {
	if (!(event.metaKey || event.ctrlKey) || event.altKey) return undefined;

	const key = event.key.toLowerCase();

	if (key === 'z') return event.shiftKey ? 'redo' : 'undo';
	if (key === 'y' && event.ctrlKey && !event.shiftKey) return 'redo';

	return undefined;
}

function travel(input: HTMLInputElement, action: HistoryAction) {
	const target = action === 'undo' ? history.undo(snapshot()) : history.redo(snapshot());
	if (!target) return;

	editing.value = true;
	text.value = target.text;
	country.value = target.country;
	internationalCode.value = target.internationalCode;
	lastCaret = target.caret;

	input.value = target.text;
	input.setSelectionRange(target.caret, target.caret);

	emitValue();
}

function onCountryChange(value: unknown) {
	const parsed = CountryCodeSchema.safeParse(value);
	if (!parsed.success) return;

	const formatted = formatAsYouType(sanitize(text.value), parsed.data);
	// Le pays choisi fait foi : un numéro international d'un autre pays est effacé, pas réinterprété.
	const otherCountry = formatted.callingCode !== undefined && formatted.callingCode !== getCountryCallingCode(parsed.data);

	history.record(snapshot());

	country.value = parsed.data;
	internationalCode.value = otherCountry ? undefined : formatted.callingCode;
	text.value = otherCountry ? '' : formatted.text;
	lastCaret = text.value.length;

	emitValue();
}

function emitValue() {
	const input = text.value.trim();
	// Invalide : on émet la saisie brute, que le hook API rejettera avec l'erreur native.
	const next = input === '' ? null : (toE164(input, country.value) ?? input);

	lastEmitted = next;

	// Choisir un pays sur un champ vide ne doit pas marquer le formulaire comme modifié.
	if (next === (props.value ?? null)) return;

	emit('input', next);
}
</script>

<template>
	<!-- Le v-input est l'activateur du menu : attaché, celui-ci s'aligne sous le champ et en prend la largeur. -->
	<v-select
		:model-value="country ?? null"
		:items="countryItems"
		:disabled="disabled"
		:non-editable="nonEditable"
		:item-label-font-family="FLAG_FONT_FAMILY"
		@update:model-value="onCountryChange"
	>
		<template #preview="{ toggle, active }">
			<!-- dir="ltr" : un numéro se lit de gauche à droite, même dans une interface RTL. -->
			<v-input
				:model-value="text"
				:placeholder="placeholder"
				:disabled="disabled"
				:non-editable="nonEditable"
				:active="active"
				:class="{ 'phone-invalid': invalid }"
				:aria-invalid="invalid"
				type="tel"
				autocomplete="tel"
				dir="ltr"
				@beforeinput="onBeforeInput"
				@input="onInput"
				@compositionend="onInput"
				@keydown="onKeydown"
				@focus="editing = true"
				@blur="validate"
			>
				<template #prepend>
					<button
						type="button"
						class="country"
						:class="{ active }"
						:disabled="disabled || nonEditable"
						:aria-label="countryLabel"
						aria-haspopup="listbox"
						:aria-expanded="active"
						@click="toggle"
					>
						<span class="flag" aria-hidden="true">{{ shownCountry ? flag(shownCountry) : '🌐' }}</span>
						<span v-if="callingCode" class="calling-code" aria-hidden="true">+{{ callingCode }}</span>
						<v-icon v-if="!nonEditable" name="expand_more" small aria-hidden="true" />
					</button>
				</template>
				<template #append>
					<v-icon v-if="invalid" v-tooltip="t('invalidNumber', locale)" name="error" class="invalid-icon" />
					<!-- Sans href, le lien est inerte et hors du parcours clavier : état désactivé. -->
					<a
						v-else
						class="call"
						:class="{ disabled: !callUri }"
						:href="callUri"
						:aria-label="`${t('call', locale)} ${text}`"
						:aria-disabled="!callUri"
					>
						<svg viewBox="0 -960 960 960" aria-hidden="true">
							<path
								d="M798-120q-125 0-247-54.5T329-329Q229-429 174.5-551T120-798q0-18 12-30t30-12h162q14 0 25 9.5t13 22.5l26 140q2 16-1 27t-11 19l-97 98q20 37 47.5 71.5T387-386q31 31 65 57.5t72 48.5l94-94q9-9 23.5-13.5T670-390l138 28q14 4 23 14.5t9 23.5v162q0 18-12 30t-30 12Z"
							/>
						</svg>
					</a>
				</template>
			</v-input>
			<!-- Après le v-input : v-menu prend le premier élément du slot comme référence de positionnement. -->
			<close-on-resize :active="active" @close="toggle" />
		</template>
	</v-select>
</template>

<style scoped>
/* Pas `.invalid` : classe interne de v-input, que Directus barre. */
.v-input.phone-invalid {
	--v-input-border-color: var(--theme--danger);
	--v-input-border-color-hover: var(--theme--danger);
}

.invalid-icon {
	--v-icon-color: var(--theme--danger);
}

.call {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	color: var(--foreground-inverted);
	background-color: var(--theme--primary);
	border-radius: 4px;
	transition: opacity var(--fast) var(--transition);
}

.call:hover:not(.disabled) {
	opacity: 0.85;
}

.call.disabled {
	background-color: var(--theme--foreground-subdued);
	cursor: not-allowed;
}

.call:focus-visible {
	outline: 2px solid var(--theme--primary);
	outline-offset: 2px;
}

.call svg {
	width: 18px;
	height: 18px;
	fill: currentColor;
}

.country {
	display: flex;
	gap: 4px;
	align-items: center;
	padding-inline-end: 8px;
	color: var(--theme--foreground-subdued);
	border-inline-end: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
	cursor: pointer;
}

.country:hover:not(:disabled),
.country.active {
	color: var(--theme--foreground);
}

.country:disabled {
	cursor: not-allowed;
}

.flag {
	font-family: v-bind('FLAG_FONT_FAMILY');
	font-size: 1.125em;
	line-height: 1;
}
</style>

<style>
/*
 * Le menu est téléporté dans #menu-outlet, hors de portée du CSS scoped.
 * Seule notre liste porte la police des drapeaux (FLAG_FONT_FAMILY, shared/country.ts) : elle sert de marqueur.
 */
#menu-outlet .v-menu-content:has([style*='Twemoji Country Flags']) {
	scrollbar-width: thin;
	/* Couleur du projet, puis primaire du thème ; sans l'une ni l'autre, la déclaration est ignorée (barre native). */
	scrollbar-color: var(--project-color, var(--theme--primary)) transparent;
}
</style>
