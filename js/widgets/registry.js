// Widget registry. To add a widget:
// 1) add an entry to `meta` below; 2) create the file from `src`, calling
//    Widgets.define(type, vueComponent, optionalCss). The component receives a `config` prop.
// See github.js for a complete example.
window.Widgets = {
  meta: {
    github: {
      name: 'Активність GitHub',
      description: 'Теплова карта та останні події користувача',
      src: 'js/widgets/github.js',
      fields: [{ key: 'user', label: 'Ім’я користувача GitHub', placeholder: 'torvalds', required: true }],
      summary: c => '@' + c.user, // shown in the collapsed placeholder
    },
  },
  components: {},
  define(type, component, css) {
    this.components[type] = component;
    if (css) { const s = document.createElement('style'); s.textContent = css; document.head.append(s); }
  },
};
