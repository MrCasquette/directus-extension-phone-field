import { readFileSync } from 'node:fs';

// Importe les polices en base64 : l'endpoint sert la police des drapeaux depuis le bundle API, sans CDN tiers.
const base64Fonts = {
	name: 'base64-fonts',
	load(id) {
		if (!id.endsWith('.woff2')) return null;

		return `export default ${JSON.stringify(readFileSync(id).toString('base64'))};`;
	},
};

export default {
	plugins: [base64Fonts],
};
