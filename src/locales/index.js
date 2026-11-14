// Language list. To add a language: add a line here and create src/locales/<code>.js (copy en-GB.js).
// Names are shown as written here (no flags). Widgets bring their own packs: src/widgets/<type>/lang/<code>.js
export const FALLBACK = 'en-GB';

export const languages = [
	{code: 'en-GB', name: 'English (United Kingdom)', load: () => import('./en-GB.js')},
	{code: 'uk', name: 'Українська', load: () => import('./uk.js')}
];