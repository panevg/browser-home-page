// Widget registry. To add a widget:
// 1) add an entry to `meta`; 2) create the file from `src` calling Widgets.define(type, component, css?);
// 3) add language packs in the `lang` folder: <code>.js calling I18n.defineWidget(type, code, strings).
// Required pack keys: name, description (+ the labelKey of every field). Packs load after the page has loaded.
const W = (name, fields, summary) => ({
  src: `js/widgets/${name}.js`,
  lang: `js/widgets/${name}/lang/`,
  fields,
  summary,
});
window.Widgets = {
  meta: {
    github: W(
      "github",
      [
        {
          key: "user",
          labelKey: "userLabel",
          placeholder: "torvalds",
          required: true,
        },
      ],
      (c) => "@" + c.user
    ),
    weather: W(
      "weather",
      [
        {
          key: "location",
          labelKey: "locationLabel",
          placeholder: "Berlin",
          required: true,
        },
      ],
      (c) => c.location
    ),
    calendar: W("calendar", [], () => ""),
    todo: W("todo", [], (c) => {
      const a = c.items || [];
      return a.filter((i) => !i.done).length + " / " + a.length;
    }),
    notes: W(
      "notes",
      [
        {
          key: "title",
          labelKey: "titleLabel",
          placeholder: "",
          required: false,
        },
      ],
      (c) => c.title || ""
    ),
    rates: W(
      "rates",
      [
        {
          key: "base",
          labelKey: "baseLabel",
          placeholder: "EUR",
          required: true,
        },
        {
          key: "targets",
          labelKey: "targetsLabel",
          placeholder: "USD, UAH, CZK",
          required: true,
        },
      ],
      (c) =>
        (c.base || "").toUpperCase() + " → " + (c.targets || "").toUpperCase()
    ),
    news: W(
      "news",
      [
        {
          key: "feed",
          labelKey: "feedLabel",
          placeholder: "https://feeds.bbci.co.uk/news/rss.xml",
          required: true,
        },
        {
          key: "title",
          labelKey: "titleLabel",
          placeholder: "",
          required: false,
        },
      ],
      (c) => {
        try {
          return c.title || new URL(c.feed).hostname;
        } catch {
          return c.feed || "";
        }
      }
    ),
    cactus: W(
      "cactus",
      [
        {
          key: "name",
          labelKey: "nameLabel",
          placeholder: "Spike",
          required: false,
        },
      ],
      (c) => c.name || "🌵"
    ),
  },
  components: {},
  define(type, component, css) {
    this.components[type] = component;
    if (css) {
      const s = document.createElement("style");
      s.textContent = css;
      document.head.append(s);
    }
  },
};
