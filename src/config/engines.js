/**
 * Search engines. In `url`, `%s` is replaced with the encoded query and `%l` with the base language of the interface
 * (`en`, `uk`, ...). `host` is used to fetch the icon. Guide: docs/customization.md
 *
 * The selected engine is saved as an index, so append new engines at the END to keep existing choices.
 * @type {import('@/types').Engine[]}
 */
export const ENGINES = [
	{name: 'DuckDuckGo', host: 'duckduckgo.com', url: 'https://duckduckgo.com/?q=%s'},
	{name: 'Google', host: 'google.com', url: 'https://www.google.com/search?q=%s'},
	{name: 'Bing', host: 'bing.com', url: 'https://www.bing.com/search?q=%s'},
	{name: 'Startpage', host: 'startpage.com', url: 'https://www.startpage.com/do/search?q=%s'},
	{name: 'Brave', host: 'search.brave.com', url: 'https://search.brave.com/search?q=%s'},
	{name: 'Wikipedia', host: 'wikipedia.org', url: 'https://%l.wikipedia.org/w/index.php?search=%s'},
	{name: 'YouTube', host: 'youtube.com', url: 'https://www.youtube.com/results?search_query=%s'}
];