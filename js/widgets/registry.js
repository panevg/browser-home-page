// Widget registry. Each widget can publish its own locale package via define().
window.Widgets = {
  meta: {
    github: {
      nameKey: 'githubName', descriptionKey: 'githubDescription', src: 'js/widgets/github.js',
      fields: [{ key: 'user', labelKey: 'githubUser', placeholder: 'torvalds', required: true }],
      summary: c => '@' + c.user,
    },
  },
  components: {}, packs: {},
  define(type, component, css, languagePack = {}) {
    this.components[type] = component;
    this.packs[type] = languagePack;
    if (css) { const s = document.createElement('style'); s.textContent = css; document.head.append(s); }
  },
  languagePack(type, language) { return this.packs[type]?.[language] || this.packs[type]?.['en'] || {}; },
};
