/**
 * The interface languages.
 *
 * To add a language: add an entry below and create `src/locales/<code>.js` (copy `en-GB.js`, keep the keys, translate the
 * values). Widgets bring their own packs in `src/widgets/<type>/lang/<code>.js`; those need no registration.
 * Guide: docs/localization.md
 */

/** The language that is used for every missing key and when the system language is not available. */
export const FALLBACK = 'en-GB';

/**
 * Available languages, in the order of the language list. Names are written in the language itself, without flags.
 * @type {import('@/types').Language[]}
 */
export const languages = [
	{code: 'en-GB', name: 'English (United Kingdom)', load: () => import('./en-GB.js')},
	{code: 'uk', name: 'Українська', load: () => import('./uk.js')},
	{code: 'de-DE', name: 'Deutsch', load: () => import('./de-DE.js')}
];
