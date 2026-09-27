import { defineEndpoint } from '@directus/extensions-sdk';
import flagsFont from 'country-flag-emoji-polyfill/dist/TwemojiCountryFlags.woff2';
import { FLAGS_FONT_PATH, PHONE_INTERFACE_ID } from '../shared/phone';

const FONT = Buffer.from(flagsFont, 'base64');
const ONE_WEEK_IN_SECONDS = 7 * 24 * 60 * 60;

// Police des drapeaux servie par l'instance elle-même : pas de requête vers un CDN tiers, fonctionne hors ligne.
export default defineEndpoint({
	id: PHONE_INTERFACE_ID,
	handler: (router) => {
		router.get(FLAGS_FONT_PATH, (_req, res) => {
			res.type('font/woff2').set('Cache-Control', `public, max-age=${ONE_WEEK_IN_SECONDS}`).send(FONT);
		});
	},
});
