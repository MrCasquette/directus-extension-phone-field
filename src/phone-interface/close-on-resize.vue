<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

// v-menu ne se repositionne pas après les transitions de mise en page qui suivent un resize : on ferme plutôt que de laisser le menu décalé.
const props = defineProps<{ active: boolean }>();

const emit = defineEmits<{ close: [] }>();

// Seuls les changements de largeur comptent : sur mobile, l'ouverture du clavier (recherche du menu) ne change que la hauteur.
let width = window.innerWidth;

function onResize() {
	const widthChanged = window.innerWidth !== width;

	width = window.innerWidth;

	if (widthChanged && props.active) emit('close');
}

onMounted(() => window.addEventListener('resize', onResize));
onUnmounted(() => window.removeEventListener('resize', onResize));
</script>

<template>
	<slot />
</template>
