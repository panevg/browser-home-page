// v-focus focuses the element when it is mounted. `v-focus="false"` disables it (used to focus only the first field).
export const vFocus = { mounted: (el, { value }) => { if (value !== false) el.focus(); } };
