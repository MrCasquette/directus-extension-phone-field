<script setup lang="ts">
import parsePhoneNumber, {
	AsYouType,
	type CountryCode,
	getCountryCallingCode,
	getExampleNumber,
	validatePhoneNumberLength,
} from 'libphonenumber-js/max';
import examples from 'libphonenumber-js/mobile/examples';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { z } from 'zod';
import { countryOptions, FLAG_FONT_FAMILY, flag } from '../shared/country';
import { CountryCodeSchema, toE164 } from '../shared/phone';
import CloseOnResize from './close-on-resize.vue';

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

const { locale } = useI18n();

const defaultCountry = computed(() => CountryCodeSchema.optional().catch(undefined).parse(props.defaultCountry));
const preferredCountries = computed(() => z.array(CountryCodeSchema).catch([]).parse(props.preferredCountries));

const country = ref<CountryCode>();
const text = ref('');
const touched = ref(false);
let lastEmitted: string | null | undefined;

watch(() => props.value, syncFromValue, { immediate: true });

const callingCode = computed(() => (country.value ? getCountryCallingCode(country.value) : undefined));

const placeholder = computed(() => (country.value ? getExampleNumber(country.value, examples)?.formatNational() : undefined));

const invalid = computed(
	() => touched.value && text.value.trim() !== '' && toE164(text.value, country.value) === undefined,
);

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

	country.value = phone?.country ?? defaultCountry.value;
	text.value = phone ? (phone.country ? phone.formatNational() : phone.formatInternational()) : (value ?? '');
}

function onInput(raw: string | number | null) {
	const formatter = new AsYouType(country.value);

	text.value = formatter.input(raw === null ? '' : String(raw));

	// Saisie au format international (+44…) : le sélecteur suit le numéro.
	const detected = formatter.getCountry();
	if (detected) country.value = detected;

	emitValue();
}

// Refuse la frappe ou le collage qui dépasserait la longueur max du pays (les lettres sont déjà écartées par AsYouType).
function onBeforeInput(event: Event) {
	if (!(event instanceof InputEvent) || !(event.target instanceof HTMLInputElement)) return;

	const inserted = event.data ?? event.dataTransfer?.getData('text/plain');
	if (!inserted) return;

	const { value, selectionStart, selectionEnd } = event.target;
	const next = value.slice(0, selectionStart ?? value.length) + inserted + value.slice(selectionEnd ?? value.length);

	if (validatePhoneNumberLength(next, country.value) === 'TOO_LONG') event.preventDefault();
}

function onCountryChange(value: unknown) {
	const parsed = CountryCodeSchema.safeParse(value);
	if (!parsed.success) return;

	country.value = parsed.data;
	text.value = new AsYouType(parsed.data).input(text.value);

	emitValue();
}

function emitValue() {
	const input = text.value.trim();
	// Invalide : on émet la saisie brute, que le hook API rejettera avec l'erreur native.
	const next = input === '' ? null : (toE164(input, country.value) ?? input);

	lastEmitted = next;
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
			<v-input
				:model-value="text"
				:placeholder="placeholder"
				:disabled="disabled"
				:non-editable="nonEditable"
				:active="active"
				:class="{ invalid }"
				type="tel"
				autocomplete="tel"
				@beforeinput="onBeforeInput"
				@update:model-value="onInput"
				@focus="touched = false"
				@blur="touched = true"
			>
				<template #prepend>
					<button
						type="button"
						class="country"
						:class="{ active }"
						:disabled="disabled || nonEditable"
						@click="toggle"
					>
						<span class="flag">{{ country ? flag(country) : '🌐' }}</span>
						<span v-if="callingCode" class="calling-code">+{{ callingCode }}</span>
						<v-icon v-if="!nonEditable" name="expand_more" small />
					</button>
				</template>
			</v-input>
			<!-- Après le v-input : v-menu prend le premier élément du slot comme référence de positionnement. -->
			<close-on-resize :active="active" @close="toggle" />
		</template>
	</v-select>
</template>

<style scoped>
.v-input.invalid {
	--v-input-border-color: var(--theme--danger);
	--v-input-border-color-hover: var(--theme--danger);
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
