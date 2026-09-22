function sheetFactory(css) {
  const cache = /* @__PURE__ */ new WeakMap();
  return function sheetFor(doc) {
    const view = doc.defaultView;
    const Ctor = view && view.CSSStyleSheet;
    if (!Ctor || !("replaceSync" in Ctor.prototype)) {
      return null;
    }
    let sheet = cache.get(doc);
    if (!sheet) {
      sheet = new Ctor();
      sheet.replaceSync(css);
      cache.set(doc, sheet);
    }
    return sheet;
  };
}
function layered(css, layer) {
  const body = css.replace(/^\s*@charset\s+[^;]+;\s*/i, "");
  return `@layer ${layer} {
${body}
}`;
}
export {
  layered as l,
  sheetFactory as s
};
