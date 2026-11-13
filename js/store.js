// Persistence layer. app.js saves the whole state here on every change (sync watcher).
const Store = {
  key: 'startpage:v1',
  load(def) { try { return { ...def, ...JSON.parse(localStorage.getItem(this.key)) }; } catch { return def; } },
  save(s) { try { localStorage.setItem(this.key, JSON.stringify(s)); } catch {} },
};
