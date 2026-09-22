let current = null;
function rootContext() {
  if (current === null) {
    throw new Error(
      "No RootContext installed. Import src/core/install-default.js, or call setRootContext() with your own implementation."
    );
  }
  return current;
}
function setRootContext(ctx) {
  const previous = current;
  current = ctx;
  return previous;
}
function deepActiveElement(doc) {
  let el = doc.activeElement;
  while (el && el.shadowRoot && el.shadowRoot.activeElement) {
    el = el.shadowRoot.activeElement;
  }
  return el;
}
export {
  deepActiveElement as d,
  rootContext as r,
  setRootContext as s
};
