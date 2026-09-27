<script setup lang="ts">
import parsePhoneNumber from 'libphonenumber-js/max';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { z } from 'zod';
import { FLAG_FONT_FAMILY, flag, polyfillFlags } from '../shared/country';
import { t } from '../shared/i18n';

const FormatSchema = z.enum(['international', 'national']).catch('international');

const props = defineProps<{
	value: string | null;
	// Option du display : configurée par l'admin, donc parsée.
	format?: unknown;
}>();

const { locale } = useI18n();

polyfillFlags();

const phone = computed(() => (props.value ? parsePhoneNumber(props.value) : undefined));

const formatted = computed(() => {
	if (!phone.value) return undefined;

	return FormatSchema.parse(props.format) === 'national'
		? phone.value.formatNational()
		: phone.value.formatInternational();
});
</script>

<template>
	<value-null v-if="!value" />
	<!-- dir="ltr" : lisible en interface RTL. -->
	<span v-else-if="phone && formatted" class="phone" dir="ltr">
		<span v-if="phone.country" class="flag" aria-hidden="true">{{ flag(phone.country) }}</span>
		{{ formatted }}
		<!-- @click.stop : dans un tableau, le clic ne doit pas ouvrir l'item. -->
		<a class="call" :href="phone.getURI()" :aria-label="`${t('call', locale)} ${formatted}`" @click.stop>
			<svg viewBox="0 -960 960 960" aria-hidden="true">
				<path
					d="M798-120q-125 0-247-54.5T329-329Q229-429 174.5-551T120-798q0-18 12-30t30-12h162q14 0 25 9.5t13 22.5l26 140q2 16-1 27t-11 19l-97 98q20 37 47.5 71.5T387-386q31 31 65 57.5t72 48.5l94-94q9-9 23.5-13.5T670-390l138 28q14 4 23 14.5t9 23.5v162q0 18-12 30t-30 12Z"
				/>
			</svg>
		</a>
	</span>
	<span v-else>{{ value }}</span>
</template>

<style scoped>
.phone {
	display: inline-flex;
	gap: 6px;
	align-items: center;
}

.flag {
	font-family: v-bind('FLAG_FONT_FAMILY');
	line-height: 1;
}

.call {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	color: var(--foreground-inverted);
	background-color: var(--theme--primary);
	border-radius: 4px;
	transition: opacity var(--fast) var(--transition);
}

.call:hover {
	opacity: 0.85;
}

.call:focus-visible {
	outline: 2px solid var(--theme--primary);
	outline-offset: 2px;
}

.call svg {
	width: 16px;
	height: 16px;
	fill: currentColor;
}
</style>
