# Search history

> What is remembered for 30 days, how the dropdown is ordered, and how the history is kept safe.

**On this page:** [What is remembered](#what-is-remembered) · [Security and privacy](#security-and-privacy) · [For developers](#for-developers)

The page remembers what you searched for **for 30 days** and offers it while you type. The dropdown has a fixed priority:

1. **Bookmarks** that match the typed text (up to 3),
2. **Search history** that matches (up to 4), shown instantly and without the network, so it also works offline and when
   suggestions are switched off,
3. **Search suggestions** from DuckDuckGo. A suggestion that is already in the history is not repeated.

Matching history is ranked by how the entry matches (starts with the text, then a word starts with it, then contains it)
and then by use: entries searched often and recently come first (the weight of a use halves every two weeks). The text you
typed exactly is not offered back to you.

## What is remembered

- Only **real searches**: pressing Enter, or choosing a history/suggestion row. Opened addresses (`https://...` typed into
  the field) and opened bookmarks are never stored.
- One entry per distinct text (case-insensitive), with the time of the last use and how many times it was used.
- Entries older than **30 days** are deleted, and at most **300** entries are kept (the oldest go first). Texts are cut to
  nothing longer than 100 characters, with control and hidden characters turned into spaces.

## Security and privacy

| Measure | How |
| --- | --- |
| **Never stored: secrets and personal data** | A text is not saved if it looks like a secret or personal data: it contains `://` (addresses can carry tokens), an e-mail address, `password:` / `token=` / `api key:` style assignments, `Bearer ...`, a PEM key header or a JWT, an IBAN, mostly digits (card, phone and document numbers), a single long mixed letter-digit "word" (API keys, hashes, generated passwords), or is longer than 100 characters. The rules are in `isSensitive()` (`src/utils/history.js`) and err on the side of not storing. |
| **Re-checked on every load** | Stored entries are validated again each time the page opens, so tightening the rules also removes old entries that no longer pass. Damaged data is repaired or dropped; nothing from storage is trusted. |
| **Kept apart from the page state** | History has its own `localStorage` key (`startpage:history:v1`), not the `startpage:v1` key of bookmarks and settings. A backup or export of the page state (see [Customization](customization.md)) therefore never contains what you searched for. |
| **Expires by itself** | 30 days, enforced when loading, when adding and when matching, so an expired entry can never be shown even if the page stayed open. |
| **You are in control** | *Settings → Search*: **Remember searches for 30 days** (on by default) and **Clear** (with the number of saved searches). **Turning the switch off deletes the saved history immediately**, and nothing is recorded or shown while it is off. A single entry is removed with its **×** (always visible on touch screens) or with **Shift+Delete** on a selected row. |
| **Never leaves the browser** | History is matched locally. Only the text you are currently typing is sent to DuckDuckGo for suggestions, exactly as before; history entries are never sent anywhere. |
| **Plain text only** | Entries are rendered as text (never as HTML), so a stored entry cannot inject markup. |
| **Other tabs stay in sync** | A change or a clear in one tab is applied in the others (the `storage` event). |

What it does **not** do: the data is stored unencrypted in the browser profile like any other `localStorage` data. It
cannot be read by other websites (storage is per origin), but anyone who can use your browser profile or open the page's
developer tools can read it. Encrypting it with a key stored in the same profile would not change that, so it is not done.
Use the switch, **Clear** or a private window if that matters. The page cannot tell whether a window is private.

## For developers

| File | Role |
| --- | --- |
| `src/utils/history.js` | Pure rules: `cleanQuery`, `isSensitive`, `normalizeHistory`, `addEntry`, `removeEntry`, `matchHistory` and the constants `HISTORY_DAYS`, `MAX_ENTRIES`, `MAX_LENGTH` |
| `src/history.js` | The live list (`history`), the storage key, `record()`, `forget()`, `clearHistory()`, cross-tab sync, and the deletion when the setting is switched off |
| `src/components/SearchBox.vue` | Builds the dropdown (the priority above), records searches in `go()`, removes entries |
| `src/components/SettingsModal.vue` | The switch and the **Clear** button |

- **Change the retention or the limits:** the constants at the top of `src/utils/history.js` (and the label `set.history`
  in the locale files, which says "30 days").
- **Make the filter stricter or looser:** edit `isSensitive()` and add the case to `tests/utils/history.test.js`.
- **Show more rows:** the limits are the arguments of `matchBookmarks(..., 3)` and `matchHistory(..., 4)` in `SearchBox.vue`.
- **Reset it by hand:** `localStorage.removeItem("startpage:history:v1")` in the console of the page.

---

**See also:** [API reference](api.md#search-history) · [Customization](customization.md) · [Architecture](architecture.md#search-and-search-history)
