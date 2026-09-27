<script setup lang="ts">
import parsePhoneNumber from 'libphonenumber-js/max';
import { computed } from 'vue';
import { z } from 'zod';
import { FLAG_FONT_FAMILY, flag, polyfillFlags } from '../shared/country';

const FormatSchema = z.enum(['international', 'national']).catch('international');

const props = defineProps<{
	value: string | null;
	// Option du display : configurée par l'admin, donc parsée.
	format?: unknown;
}>();

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
</style>
