export const uid = () => Math.random().toString(36).slice(2, 9);
export const icon = host => `https://icons.duckduckgo.com/ip3/${host}.ico`;
export const initial = s => [...String(s || '')][0] || '?'; // first character (safe for emoji / surrogate pairs)
