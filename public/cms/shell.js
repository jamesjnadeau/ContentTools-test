import { s as statusOf, h, n as slugify, o as entryPath, p as expandSlug, q as list, b as buildFields, i as findCollection, r as editUrl, t as editUrlIsStale, u as imageType, v as mediaURL, S as STATUSES, P as PatAuthAdapter, D as DEFAULT_WIDGETS, d as describeError, E as EntrySession, w as EntryExistsError, x as fieldsFor, y as fieldDefaults, z as deletedNotice, g as formState, A as DIRECTORY_LIMIT, f as fieldsNeeded, N as NOTHING_TO_SAVE, j as ConfigError, l as loadConfig, C as CmsRepo, c as adapterFor, B as cannotPush } from "./chunks/session-BRRA5z-z.js";
import { w as withEditFlag, s as sessionStorageOrMemory, h as handoffFragment } from "./chunks/handoff-qeCiTHXN.js";
import { M as MarkdownDocument } from "./chunks/index-BNtVnYoY.js";
import { l as layered, s as sheetFactory } from "./chunks/constructed-styles-BEftmh6P.js";
function describe(entry, pull, unpublished) {
  return {
    collection: entry.collection,
    slug: entry.slug,
    path: entry.path,
    pull,
    status: pull ? statusOf(pull) : null,
    unpublished
  };
}
function mergeEntries(collection, published, inFlight) {
  const open = /* @__PURE__ */ new Map();
  for (const entry of inFlight) {
    if (entry.collection === collection) {
      open.set(entry.slug, entry.pull);
    }
  }
  const listed = published.map(
    (entry) => describe(entry, open.get(entry.slug) ?? null, false)
  );
  const seen = new Set(published.map((entry) => entry.slug));
  for (const entry of inFlight) {
    if (entry.collection === collection && !seen.has(entry.slug)) {
      listed.push(describe(entry, entry.pull, true));
    }
  }
  return [
    ...listed.filter((entry) => entry.pull !== null),
    ...listed.filter((entry) => entry.pull === null)
  ];
}
const HOME = { kind: "home" };
function formatRoute(route) {
  switch (route.kind) {
    case "collection":
      return `#/c/${encodeURIComponent(route.collection)}`;
    case "entry":
      return `#/c/${encodeURIComponent(route.collection)}/e/${encodeURIComponent(route.slug)}`;
    case "new":
      return `#/c/${encodeURIComponent(route.collection)}/new`;
    case "media":
      return "#/media";
    case "review":
      return "#/review";
    case "unknown":
      return route.hash;
    default:
      return "#/";
  }
}
function parseRoute(hash) {
  const path = hash.replace(/^#/, "").replace(/^\//, "");
  if (path === "") {
    return HOME;
  }
  const unknown = { kind: "unknown", hash };
  let parts;
  try {
    parts = path.split("/").map(decodeURIComponent);
  } catch {
    return unknown;
  }
  if (parts.length > 1 && parts[parts.length - 1] === "") {
    parts.pop();
  }
  if (parts.length === 1 && parts[0] === "media") {
    return { kind: "media" };
  }
  if (parts.length === 1 && parts[0] === "review") {
    return { kind: "review" };
  }
  if (parts[0] !== "c" || !parts[1]) {
    return unknown;
  }
  const collection = parts[1];
  if (parts.length === 2) {
    return { kind: "collection", collection };
  }
  if (parts.length === 3 && parts[2] === "new") {
    return { kind: "new", collection };
  }
  if (parts.length === 4 && parts[2] === "e" && parts[3]) {
    return { kind: "entry", collection, slug: parts[3] };
  }
  return unknown;
}
const shellCSS = '/**\n * Local replacements for the handful of Bourbon mixins this project used.\n *\n * Bourbon existed here only to emit vendor prefixes for transform, transition,\n * animation, @keyframes, box-sizing, user-select and hyphens. All of those are\n * unprefixed standards in every browser this library targets, so the mixins are\n * gone and the properties are written directly -- except where a prefix is still\n * genuinely required (see `user-select` and `hyphens` below).\n */\n/**\n * The one Bourbon *variable* this project used, inlined verbatim from\n * bourbon/addons/_font-family.scss so the `pre` styling is unchanged.\n */\n/**\n * Contain floats. The one Bourbon mixin worth keeping as a mixin, since it\n * expands to a pseudo-element rather than a single declaration.\n */\n/**\n * Safari still requires -webkit-user-select; the -moz- and -ms- forms are long\n * obsolete and are not emitted.\n */\n/**\n * Safari still requires -webkit-hyphens.\n */\n/**\n * All widgets are assigned a z-index equal to or higher than this setting. The\n * base z-index can be adjusted to overcome z-index conflicts with existing page\n * elements.\n */\n/**\n * For UI widgets that appear on the page (as opposed to appearing in front of a\n * modal screen) we define a base background colour.\n */\n/**\n * The colour used when casting shadows for widgets that appear to float.\n */\n/**\n * Confirm, Cancel and Edit actions are common amoung the various ui components.\n * Each action has an associated/common colour.\n */\n/**\n * Tooltips feature for a number of components, their base appearance is\n * configured using a mixin.\n */\n/**\n * The following settings relate to typography. For portability we limit the the\n * use of fonts to:\n *\n * - `type-icon` used for displaying icons (courtesy of http://icomoon.io).\n * - `type-text` used for displaying text.\n *\n */\n:host {\n  display: block;\n}\n\n.ct-cms {\n  background: white;\n  box-sizing: border-box;\n  color: #646464;\n  display: flex;\n  flex-direction: column;\n  min-height: 100%;\n  font-family: arial, sans-serif;\n  font-size: 14px;\n  line-height: 18px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n.ct-cms *, .ct-cms *:before, .ct-cms *:after {\n  box-sizing: border-box;\n}\n\n.ct-cms__header {\n  align-items: baseline;\n  background: #e9e9e9;\n  border-bottom: 1px solid #d0d0d0;\n  display: flex;\n  gap: 12px;\n  padding: 8px 12px;\n}\n\n.ct-cms__title {\n  font-family: arial, sans-serif;\n  font-size: 14px;\n  line-height: 20px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  font-weight: bold;\n  margin: 0;\n}\n\n.ct-cms__repo {\n  font-family: arial, sans-serif;\n  font-size: 12px;\n  line-height: 20px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  color: #646464;\n}\n\n.ct-cms__spacer {\n  flex: 1 1 auto;\n}\n\n.ct-cms__body {\n  display: flex;\n  flex: 1 1 auto;\n  min-height: 0;\n}\n\n.ct-cms__nav {\n  background: #f7f7f7;\n  border-right: 1px solid #d0d0d0;\n  flex: 0 0 180px;\n  overflow-y: auto;\n  padding: 8px 0;\n}\n\n.ct-cms__nav-heading {\n  font-family: arial, sans-serif;\n  font-size: 11px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  color: #646464;\n  margin: 0;\n  padding: 4px 12px;\n  text-transform: uppercase;\n}\n\n.ct-cms__nav-list {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n}\n\n.ct-cms__nav-link {\n  color: #646464;\n  display: block;\n  padding: 5px 12px;\n  text-decoration: none;\n}\n.ct-cms__nav-link:hover {\n  background: rgb(91.862745098%, 91.862745098%, 91.862745098%);\n}\n.ct-cms__nav-link:focus-visible {\n  outline: 2px solid #2980b9;\n  outline-offset: -2px;\n}\n.ct-cms__nav-link--current {\n  background: white;\n  box-shadow: inset 3px 0 0 #f39c12;\n  font-weight: bold;\n}\n\n.ct-cms__main {\n  flex: 1 1 auto;\n  min-width: 0;\n  overflow-y: auto;\n  padding: 16px;\n}\n\n.ct-cms__heading {\n  font-family: arial, sans-serif;\n  font-size: 18px;\n  line-height: 24px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  margin: 0 0 12px;\n}\n\n.ct-cms__note {\n  color: #646464;\n}\n.ct-cms__note:empty {\n  display: none;\n}\n\n.ct-cms__entry-list {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n}\n\n.ct-cms__entry {\n  align-items: baseline;\n  border-bottom: 1px solid #d0d0d0;\n  display: flex;\n  gap: 8px;\n  padding: 6px 0;\n}\n\n.ct-cms__entry-link {\n  color: #2980b9;\n  flex: 1 1 auto;\n  min-width: 0;\n  overflow-wrap: anywhere;\n}\n\n.ct-cms__entry-marks {\n  align-items: baseline;\n  display: flex;\n  flex: 0 0 auto;\n  gap: 8px;\n}\n\n.ct-cms__badge {\n  background: #f7f7f7;\n  border: 1px solid #d0d0d0;\n  padding: 1px 6px;\n  font-family: arial, sans-serif;\n  font-size: 11px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  text-transform: uppercase;\n}\n\n.ct-cms__badge--unpublished {\n  background: rgb(98.9567682495%, 91.3933380581%, 79.396172927%);\n  border-color: rgb(97.2218284904%, 77.0800850461%, 45.131112686%);\n}\n\n.ct-cms__entry-pull {\n  color: #646464;\n  font-family: arial, sans-serif;\n  font-size: 11px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-cms__review-list {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n}\n\n.ct-cms__review {\n  align-items: baseline;\n  border-bottom: 1px solid #d0d0d0;\n  display: flex;\n  flex-wrap: wrap;\n  gap: 8px;\n  padding: 6px 0;\n}\n\n.ct-cms__review-link {\n  color: #2980b9;\n  min-width: 0;\n  overflow-wrap: anywhere;\n}\n\n.ct-cms__review-where {\n  color: #646464;\n  font-family: arial, sans-serif;\n  font-size: 11px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-cms__review-moves {\n  display: flex;\n  gap: 8px;\n}\n\n.ct-cms__review-move--current:disabled {\n  color: #646464;\n  font-weight: bold;\n  text-decoration: none;\n}\n\n.ct-cms__review-pull {\n  color: #646464;\n  font-family: arial, sans-serif;\n  font-size: 11px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-cms__alert {\n  background: rgb(98.2594681708%, 87.0185334408%, 85.858178888%);\n  border: 1px solid #e74c3c;\n  margin: 0 0 12px;\n  padding: 8px 12px;\n}\n\n.ct-cms__alert-title {\n  font-family: arial, sans-serif;\n  font-size: 14px;\n  line-height: 20px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  font-weight: bold;\n  margin: 0;\n}\n\n.ct-cms__alert-detail {\n  margin: 4px 0 0;\n  white-space: pre-wrap;\n  word-break: break-word;\n}\n\n.ct-cms__alert--notice {\n  background: #f7f7f7;\n  border-color: #d0d0d0;\n}\n\n.ct-cms__entries-head,\n.ct-cms__entry-head {\n  align-items: baseline;\n  display: flex;\n  gap: 8px;\n  margin: 0 0 4px;\n}\n\n.ct-cms__entries-head .ct-cms__heading {\n  margin: 0;\n}\n\n.ct-cms__entry-head .ct-cms__heading {\n  margin: 0;\n  min-width: 0;\n  overflow-wrap: anywhere;\n}\n\n.ct-cms__entry-back {\n  color: #2980b9;\n  display: inline-block;\n  margin: 0 0 12px;\n  font-family: arial, sans-serif;\n  font-size: 12px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-cms__entry-edit {\n  display: inline-block;\n}\n\n.ct-cms__entry-stale {\n  color: #e74c3c;\n  margin: 0 0 12px;\n  font-family: arial, sans-serif;\n  font-size: 12px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-cms__conflict,\n.ct-cms__confirm,\n.ct-cms__gate-rescue,\n.ct-cms__leave {\n  border: 1px solid #e74c3c;\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  margin: 0 0 12px;\n  padding: 12px;\n}\n\n.ct-cms__confirm,\n.ct-cms__leave {\n  align-items: flex-start;\n  flex-direction: row;\n  flex-wrap: wrap;\n}\n\n.ct-cms__confirm-note,\n.ct-cms__leave-note {\n  flex: 1 1 100%;\n  margin: 0;\n}\n\n.ct-cms__conflict-text {\n  border: 1px solid #d0d0d0;\n  font-family: "Bitstream Vera Sans Mono", Consolas, Courier, monospace;\n  font-size: 12px;\n  min-height: 160px;\n  padding: 8px;\n  resize: vertical;\n  white-space: pre;\n  width: 100%;\n}\n\n.ct-cms__alert-path {\n  font-family: "Bitstream Vera Sans Mono", Consolas, Courier, monospace;\n  font-size: 12px;\n}\n\n.ct-fields {\n  background: #f7f7f7;\n  border: 1px solid #d0d0d0;\n  margin: 0 0 12px;\n  padding: 12px;\n}\n\n.ct-fields__heading {\n  margin: 0 0 8px;\n  font-family: arial, sans-serif;\n  font-size: 14px;\n  line-height: 18px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-fields__note {\n  color: #646464;\n  margin: 0 0 8px;\n}\n.ct-fields__note:empty {\n  display: none;\n}\n\n.ct-fields__rows {\n  display: grid;\n  gap: 12px;\n  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));\n}\n\n.ct-field {\n  min-width: 0;\n}\n\n.ct-field__label {\n  display: block;\n  font-weight: bold;\n  margin: 0 0 4px;\n  font-family: arial, sans-serif;\n  font-size: 12px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-field__input {\n  border: 1px solid #d0d0d0;\n  display: block;\n  padding: 6px 8px;\n  width: 100%;\n  font-family: arial, sans-serif;\n  font-size: 14px;\n  line-height: 18px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n.ct-field__input:focus-visible {\n  outline: 2px solid #2980b9;\n  outline-offset: -1px;\n}\n.ct-field__input[readonly] {\n  background: #f7f7f7;\n  color: #646464;\n}\n\ntextarea.ct-field__input {\n  min-height: 72px;\n  resize: vertical;\n}\n\n.ct-field__check {\n  display: block;\n  margin: 2px 0;\n}\n\n.ct-field__hint {\n  color: #646464;\n  margin: 4px 0 0;\n  font-family: arial, sans-serif;\n  font-size: 12px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-field__error {\n  color: #e74c3c;\n  margin: 4px 0 0;\n  font-family: arial, sans-serif;\n  font-size: 12px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-field__preview {\n  border: 1px solid #d0d0d0;\n  display: block;\n  margin: 4px 0 0;\n  max-height: 120px;\n  max-width: 100%;\n}\n\n.ct-cms__create-form {\n  max-width: 480px;\n}\n\n.ct-cms__create-form .ct-cms__button {\n  margin: 12px 0 0;\n}\n\n.ct-cms__gate {\n  align-items: center;\n  display: flex;\n  flex: 1 1 auto;\n  justify-content: center;\n  padding: 24px;\n}\n\n.ct-cms__gate-panel {\n  background: #f7f7f7;\n  border: 1px solid #d0d0d0;\n  max-width: 480px;\n  padding: 20px;\n  width: 100%;\n}\n\n.ct-cms__gate-title {\n  font-family: arial, sans-serif;\n  font-size: 18px;\n  line-height: 24px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  margin: 0 0 8px;\n}\n\n.ct-cms__gate-text {\n  margin: 0 0 12px;\n}\n\n.ct-cms__gate-permissions {\n  margin: 0 0 12px;\n  padding-left: 20px;\n}\n\n.ct-cms__label {\n  display: block;\n  font-weight: bold;\n  margin: 0 0 4px;\n}\n\n.ct-cms__input {\n  border: 1px solid #d0d0d0;\n  display: block;\n  padding: 6px 8px;\n  width: 100%;\n  font-family: arial, sans-serif;\n  font-size: 14px;\n  line-height: 18px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n.ct-cms__input:focus-visible {\n  outline: 2px solid #2980b9;\n  outline-offset: -1px;\n}\n\n.ct-cms__button {\n  background: #27ae60;\n  border: 0;\n  color: white;\n  cursor: pointer;\n  padding: 7px 14px;\n  font-family: arial, sans-serif;\n  font-size: 14px;\n  line-height: 18px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n.ct-cms__button:hover {\n  background: rgb(12.3645401823%, 55.1648715824%, 30.4357912179%);\n}\n.ct-cms__button:focus-visible {\n  outline: 2px solid #2980b9;\n  outline-offset: 2px;\n}\n.ct-cms__button--cancel {\n  background: #e74c3c;\n}\n.ct-cms__button--cancel:hover {\n  background: rgb(87.3650282031%, 17.9210314263%, 10.7526188558%);\n}\n.ct-cms__button:disabled {\n  background: #646464;\n  cursor: default;\n}\n.ct-cms__button--add {\n  display: inline-block;\n  text-decoration: none;\n}\n.ct-cms__button--muted {\n  background: transparent;\n  color: #2980b9;\n  padding: 7px 0;\n  text-decoration: underline;\n}\n.ct-cms__button--muted:hover {\n  background: transparent;\n  color: rgb(12.4501127885%, 38.8686448031%, 56.1773381919%);\n}\n\n.ct-cms__media-grid {\n  display: grid;\n  gap: 12px;\n  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));\n  list-style: none;\n  margin: 0;\n  padding: 0;\n}\n\n.ct-cms__media-item {\n  border: 1px solid #d0d0d0;\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  padding: 6px;\n}\n\n.ct-cms__media-thumb {\n  background: #f7f7f7;\n  height: 90px;\n  object-fit: contain;\n  width: 100%;\n}\n\n.ct-cms__media-name {\n  overflow-wrap: anywhere;\n  font-family: arial, sans-serif;\n  font-size: 11px;\n  line-height: 15px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-cms__media-note {\n  color: #646464;\n  margin: 0;\n  font-family: arial, sans-serif;\n  font-size: 11px;\n  line-height: 15px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-cms__media-folder {\n  color: #646464;\n  font-family: "Bitstream Vera Sans Mono", Consolas, Courier, monospace;\n  font-family: arial, sans-serif;\n  font-size: 12px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-cms__hint {\n  color: #646464;\n  margin: 12px 0 0;\n  font-family: arial, sans-serif;\n  font-size: 12px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n[hidden][hidden] {\n  display: none;\n}';
const shellStyles = layered(shellCSS, "ct-shell");
const shellStyleSheet = sheetFactory(shellStyles);
function alertRegion(doc) {
  return h(doc, "div", { class: "ct-cms__alert-region", role: "alert" });
}
function showAlert(doc, region, error) {
  region.replaceChildren();
  if (!error) {
    return;
  }
  const parts = [
    h(doc, "p", { class: "ct-cms__alert-title" }, [error.title])
  ];
  if (error.path) {
    parts.push(h(doc, "p", { class: "ct-cms__alert-path" }, [error.path]));
  }
  if (error.detail) {
    parts.push(h(doc, "p", { class: "ct-cms__alert-detail" }, [error.detail]));
  }
  const kind = error.kind === "notice" ? " ct-cms__alert--notice" : "";
  region.appendChild(h(doc, "div", { class: `ct-cms__alert${kind}` }, parts));
}
function refuseCreate(collection) {
  if (collection.kind === "file") {
    return `${collection.label} is a fixed set of pages, so entries cannot be added to it.`;
  }
  if (!collection.create) {
    return `${collection.label} does not allow new entries. A deployment turns that on with \`create: true\` in its config.`;
  }
  return null;
}
function previewPath(collection, title, at) {
  if (slugify(title) === "") {
    return null;
  }
  return entryPath(collection, expandSlug(collection, title, at));
}
function buildCreate(doc, handlers) {
  const heading = h(doc, "h2", { class: "ct-cms__heading" });
  const refusal = h(doc, "p", { class: "ct-cms__note" });
  const input = h(doc, "input", {
    class: "ct-field__input",
    id: "ct-cms-new-title",
    type: "text",
    autocomplete: "off"
  });
  const preview = h(doc, "p", { class: "ct-field__hint" });
  const submit = h(doc, "button", {
    class: "ct-cms__button",
    type: "button"
  }, ["Create"]);
  const form = h(doc, "div", { class: "ct-cms__create-form" }, [
    h(
      doc,
      "label",
      { class: "ct-field__label", for: "ct-cms-new-title" },
      ["What is it called?"]
    ),
    input,
    preview,
    submit
  ]);
  const node = h(doc, "section", { class: "ct-cms__create" }, [heading, refusal, form]);
  let shown = null;
  function paint() {
    const state = shown;
    if (!state || state.collection.kind !== "folder") {
      return;
    }
    const path = previewPath(state.collection, input.value, /* @__PURE__ */ new Date());
    preview.textContent = path === null ? input.value === "" ? "" : "That name has no letters or numbers a filename can use." : `Saved as ${path}`;
    submit.disabled = path === null || state.busy;
  }
  input.addEventListener("input", paint);
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !submit.disabled) {
      handlers.create(input.value);
    }
  });
  submit.addEventListener("click", () => handlers.create(input.value));
  return {
    node,
    update(state) {
      shown = state;
      heading.textContent = `New ${state.collection.label} entry`;
      const why = refuseCreate(state.collection);
      refusal.textContent = why ?? "";
      form.hidden = why !== null;
      paint();
    }
  };
}
const STATUS_LABELS$1 = {
  "draft": "Draft",
  "in-review": "In review",
  "ready": "Ready"
};
function statusLabel(status) {
  return status ? STATUS_LABELS$1[status] : "Open";
}
function entryLabel(collection, slug) {
  if (collection.kind === "file") {
    const file = collection.files.find((f) => f.name === slug);
    if (file) {
      return file.label;
    }
  }
  return slug;
}
function row$1(doc) {
  return h(doc, "li", { class: "ct-cms__entry" }, [
    h(doc, "a", { class: "ct-cms__entry-link" }),
    h(doc, "span", { class: "ct-cms__entry-marks" }, [
      h(doc, "span", { class: "ct-cms__badge" }),
      h(doc, "span", { class: "ct-cms__badge ct-cms__badge--unpublished" }),
      /* `rel` as well as `target`: the opened tab gets a handle on
         this one through `window.opener` otherwise, and this one is
         holding a GitHub token. */
      h(doc, "a", {
        class: "ct-cms__entry-pull",
        target: "_blank",
        rel: "noopener noreferrer"
      })
    ])
  ]);
}
function fill$1(el, collection, entry) {
  const link = el.querySelector(".ct-cms__entry-link");
  link.textContent = entryLabel(collection, entry.slug);
  link.setAttribute("href", formatRoute({
    kind: "entry",
    collection: entry.collection,
    slug: entry.slug
  }));
  const [badge, unpublished] = [
    el.querySelector(".ct-cms__badge"),
    el.querySelector(".ct-cms__badge--unpublished")
  ];
  badge.textContent = entry.pull ? statusLabel(entry.status) : "";
  badge.hidden = entry.pull === null;
  unpublished.textContent = "Not published yet";
  unpublished.hidden = !entry.unpublished;
  const pull = el.querySelector(".ct-cms__entry-pull");
  pull.textContent = entry.pull ? `#${entry.pull.number}` : "";
  pull.hidden = entry.pull === null;
  if (entry.pull) {
    pull.setAttribute("href", entry.pull.html_url);
  } else {
    pull.removeAttribute("href");
  }
}
function buildEntries(doc) {
  const heading = h(doc, "h2", { class: "ct-cms__heading" });
  const add = h(doc, "a", { class: "ct-cms__button ct-cms__button--add" }, ["New entry"]);
  const note = h(doc, "p", { class: "ct-cms__note" });
  const rows = h(doc, "ul", { class: "ct-cms__entry-list" });
  const node = h(doc, "div", { class: "ct-cms__entries" }, [
    h(doc, "div", { class: "ct-cms__entries-head" }, [
      heading,
      h(doc, "span", { class: "ct-cms__spacer" }),
      add
    ]),
    note,
    rows
  ]);
  return {
    node,
    update(state) {
      heading.textContent = state.collection.label;
      const creatable = refuseCreate(state.collection) === null;
      add.hidden = !creatable;
      if (creatable) {
        add.setAttribute("href", formatRoute({
          kind: "new",
          collection: state.collection.name
        }));
      } else {
        add.removeAttribute("href");
      }
      const entries = state.entries;
      note.textContent = entries === null ? "Loading…" : entries.length === 0 ? "No entries yet." : state.truncated ? "This collection is larger than GitHub will list in one request, so what follows is only the first part of it." : "";
      list(
        rows,
        entries ?? [],
        /* The slug IS the identity of an entry within a
           collection -- it is the filename, and two entries
           cannot share one. Mutating this to a constant leaves
           every test in the suite green today, because nothing in
           M5-2 re-renders a list it is still holding: the only
           transition is null -> loaded, which rebuilds regardless.
           It becomes live with the first in-place change to a row
           -- a status moved from the pull request the shell just
           got back, or a frontmatter field being typed into --
           and there the wrong key rebuilds the node under the
           caret. Recorded rather than defended with a test
           written only to reach it. */
        (entry) => entry.slug,
        () => row$1(doc),
        (el, entry) => fill$1(el, state.collection, entry)
      );
    }
  };
}
const STATUS_LABELS = {
  "draft": "Draft",
  "in-review": "In review",
  "ready": "Ready"
};
function buildEntry(doc, handlers, widgets) {
  const fields = buildFields(doc, widgets);
  const heading = h(doc, "h2", { class: "ct-cms__heading" });
  const back = h(doc, "a", { class: "ct-cms__entry-back" });
  const badge = h(doc, "span", { class: "ct-cms__badge" });
  const pull = h(doc, "a", {
    class: "ct-cms__entry-pull",
    target: "_blank",
    rel: "noopener noreferrer"
  });
  const submit = h(doc, "button", {
    class: "ct-cms__button ct-cms__entry-submit",
    type: "button",
    onclick: () => handlers.submit()
  }, ["Submit for review"]);
  const note = h(doc, "p", { class: "ct-cms__note" });
  const edit = h(doc, "a", {
    class: "ct-cms__button ct-cms__button--muted ct-cms__entry-edit",
    target: "_blank",
    rel: "noopener noreferrer",
    onclick: (ev) => {
      if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) {
        return;
      }
      const href = edit.getAttribute("href");
      if (href === null) {
        return;
      }
      ev.preventDefault();
      handlers.openOnSite(href);
    }
  }, ["Edit on the site"]);
  const stale = h(
    doc,
    "p",
    { class: "ct-cms__entry-stale" },
    ["This entry has a draft, but this deployment builds no previews for pull requests, so the link opens the published page. Editing it would write over the draft."]
  );
  const remove = h(doc, "button", {
    class: "ct-cms__button ct-cms__button--cancel ct-cms__entry-delete",
    type: "button",
    onclick: () => handlers.askDelete(true)
  }, ["Delete entry"]);
  const deleting = h(doc, "div", { class: "ct-cms__confirm", role: "group" }, [
    /* Says what actually happens. "Are you sure?" invites a reflex;
       "nothing is removed from the site until somebody merges it" is
       the fact that makes this a safe thing to press, and a person who
       knows it will not come back asking where their page went. */
    h(
      doc,
      "p",
      { class: "ct-cms__confirm-note" },
      ["Deleting opens a pull request. Nothing is removed from the site until somebody reviews and merges it."]
    ),
    h(doc, "button", {
      class: "ct-cms__button",
      type: "button",
      onclick: () => handlers.askDelete(false)
    }, ["Keep it"]),
    h(doc, "button", {
      class: "ct-cms__button ct-cms__button--cancel",
      type: "button",
      onclick: () => handlers.confirmDelete()
    }, ["Delete it"])
  ]);
  const conflictText = h(doc, "textarea", {
    class: "ct-cms__conflict-text",
    readonly: "readonly",
    spellcheck: "false",
    "aria-label": "The markdown this save would have written"
  });
  const conflict = h(doc, "div", { class: "ct-cms__conflict" }, [
    conflictText,
    h(doc, "button", {
      class: "ct-cms__button ct-cms__button--cancel",
      type: "button",
      onclick: () => handlers.reload()
    }, ["Reload from GitHub"])
  ]);
  const leaving = h(doc, "div", { class: "ct-cms__leave", role: "group" }, [
    h(
      doc,
      "p",
      { class: "ct-cms__leave-note" },
      ["This entry has changes that have not been submitted."]
    ),
    h(doc, "button", {
      class: "ct-cms__button",
      type: "button",
      onclick: () => handlers.stay()
    }, ["Stay here"]),
    h(doc, "button", {
      class: "ct-cms__button ct-cms__button--cancel",
      type: "button",
      onclick: () => handlers.discard()
    }, ["Discard and leave"])
  ]);
  const node = h(doc, "section", { class: "ct-cms__entry-view" }, [
    h(doc, "div", { class: "ct-cms__entry-head" }, [
      heading,
      badge,
      pull,
      h(doc, "span", { class: "ct-cms__spacer" }),
      edit,
      remove,
      submit
    ]),
    back,
    stale,
    note,
    leaving,
    deleting,
    conflict,
    /* Last in the panel, and the only thing in it an author types
       into: everything above says what this entry is and what can be
       done with it. */
    fields.node
  ]);
  return {
    node,
    values: () => fields.values(),
    errors: () => fields.errors(),
    update(state) {
      const entry = state.entry;
      heading.textContent = entry ? entry.slug : "";
      back.textContent = entry ? `All ${entry.collection}` : "";
      if (entry) {
        back.setAttribute(
          "href",
          formatRoute({ kind: "collection", collection: entry.collection })
        );
      } else {
        back.removeAttribute("href");
      }
      back.hidden = entry === null;
      const open = (entry == null ? void 0 : entry.pull) ?? null;
      const status = open ? statusOf(open) : null;
      badge.textContent = open ? status ? STATUS_LABELS[status] : "Open" : "";
      badge.hidden = open === null;
      pull.textContent = open ? `Pull request #${open.number}` : "";
      if (open) {
        pull.setAttribute("href", open.html_url);
      } else {
        pull.removeAttribute("href");
      }
      pull.hidden = open === null;
      submit.disabled = state.saving || entry === null;
      remove.hidden = !state.deletable;
      remove.disabled = state.saving || entry === null;
      deleting.hidden = !state.deleting;
      const config = state.config;
      const collection = config && entry ? findCollection(config, entry.collection) : null;
      const page = config && entry && collection ? editUrl(config, collection, entry.slug, (open == null ? void 0 : open.number) ?? null) : null;
      const href = page === null ? null : withEditFlag(page);
      edit.textContent = href === null ? "" : "Edit on the site";
      if (href === null) {
        edit.removeAttribute("href");
      } else {
        edit.setAttribute("href", href);
      }
      edit.hidden = href === null;
      stale.hidden = href === null || !editUrlIsStale(config, (open == null ? void 0 : open.number) ?? null);
      note.textContent = entry === null ? "Loading…" : state.saving ? "Saving…" : state.saved ?? "";
      conflictText.value = state.conflict ?? "";
      conflict.hidden = state.conflict === null;
      leaving.hidden = !state.leaving;
      fields.update(state.fields);
    }
  };
}
function mediaItem(config, file) {
  return {
    name: file.name,
    path: file.path,
    sha: file.sha,
    url: mediaURL(config, file.name),
    type: imageType(file.name)
  };
}
function partsOf(el) {
  return {
    image: el.querySelector(".ct-cms__media-thumb"),
    note: el.querySelector(".ct-cms__media-note")
  };
}
function buildMedia(doc, handlers) {
  const heading = h(doc, "h2", { class: "ct-cms__heading" }, ["Media"]);
  const folder = h(doc, "code", { class: "ct-cms__media-folder" });
  const note = h(doc, "p", { class: "ct-cms__note" });
  const grid = h(doc, "ul", { class: "ct-cms__media-grid" });
  const node = h(doc, "section", { class: "ct-cms__media" }, [
    h(doc, "div", { class: "ct-cms__entries-head" }, [heading, folder]),
    note,
    grid
  ]);
  function paint(el) {
    const { image, note: failed } = partsOf(el);
    failed.hidden = !(el.dataset.ctState === "failed");
    image.hidden = el.dataset.ctState === "failed";
  }
  function tile(item) {
    const image = h(doc, "img", {
      class: "ct-cms__media-thumb",
      /* The filename. A picture in a file browser is labelled by
         its caption below it, so repeating the name here would
         have a screen reader read it twice -- but an empty `alt`
         on an image that is also a button's target says nothing
         at all when the caption is off screen. The name it is. */
      alt: item.name,
      /* A media folder is the one place in this shell that can
         hold hundreds of items, and every one of them is a
         request. */
      loading: "lazy"
    });
    const el = h(doc, "li", { class: "ct-cms__media-item" }, [
      image,
      h(doc, "span", { class: "ct-cms__media-name" }, [item.name]),
      h(
        doc,
        "p",
        { class: "ct-cms__media-note" },
        ["This file could not be read."]
      )
    ]);
    image.addEventListener("error", () => {
      if (el.dataset.ctState !== "public") {
        el.dataset.ctState = "failed";
        paint(el);
        return;
      }
      el.dataset.ctState = "fallback";
      paint(el);
      void handlers.thumbnail(item).then((url) => {
        if (url) {
          image.src = url;
        } else {
          el.dataset.ctState = "failed";
          paint(el);
        }
      });
    });
    if (item.type === null) {
      el.dataset.ctState = "failed";
    } else {
      el.dataset.ctState = "public";
      image.src = item.url;
    }
    return el;
  }
  return {
    node,
    update(state) {
      folder.textContent = state.folder;
      const files = state.files;
      note.textContent = files === null ? "Loading…" : files.length === 0 ? "Nothing in this folder yet. Images are added from inside an entry, through the editor’s image button, so that a picture and the entry using it are committed together." : state.truncated ? "This folder is larger than GitHub will list in one request, so what follows is only the first part of it." : "";
      list(
        grid,
        files ?? [],
        /* The filename, which is the identity of a file in a
           folder -- and here the key genuinely earns itself
           rather than being recorded as equivalent-for-now, the
           way the entry list's was. A tile carries loading state
           nothing can rebuild: rekey it and every thumbnail
           restarts, including the ones that took an
           authenticated round trip to fetch. */
        (item) => item.name,
        (item) => tile(item),
        (el) => paint(el)
      );
    }
  };
}
function collectionFor(config, name) {
  return config.collections.find((c) => c.name === name) ?? null;
}
function row(doc) {
  return h(doc, "li", { class: "ct-cms__review" }, [
    h(doc, "a", { class: "ct-cms__review-link" }),
    h(doc, "span", { class: "ct-cms__review-where" }),
    h(doc, "span", { class: "ct-cms__badge ct-cms__review-badge" }),
    h(doc, "span", { class: "ct-cms__spacer" }),
    /* A group with a name, because three buttons in a row are
       otherwise announced as three unrelated commands, and "Ready"
       on its own says nothing about what it is ready for. */
    h(doc, "span", {
      class: "ct-cms__review-moves",
      role: "group",
      "aria-label": "Status"
    }, STATUSES.map((status) => h(doc, "button", {
      class: "ct-cms__button ct-cms__button--muted ct-cms__review-move",
      type: "button",
      "data-status": status
    }, [statusLabel(status)]))),
    /* `rel` as well as `target`: without it the opened tab gets a
       handle on this one through `window.opener`, and this one is
       holding a GitHub token. */
    h(doc, "a", {
      class: "ct-cms__review-pull",
      target: "_blank",
      rel: "noopener noreferrer"
    })
  ]);
}
function fill(el, handlers, state, entry) {
  const collection = collectionFor(state.config, entry.collection);
  const link = el.querySelector(".ct-cms__review-link");
  link.textContent = collection ? entryLabel(collection, entry.slug) : entry.slug;
  link.setAttribute("href", formatRoute({
    kind: "entry",
    collection: entry.collection,
    slug: entry.slug
  }));
  const where = el.querySelector(".ct-cms__review-where");
  where.textContent = collection ? collection.label : entry.collection;
  const status = statusOf(entry.pull);
  const badge = el.querySelector(".ct-cms__review-badge");
  badge.textContent = statusLabel(status);
  const moving = state.moving.includes(entry.pull.number);
  el.querySelectorAll(".ct-cms__review-move").forEach((node) => {
    const button = node;
    const wanted = button.dataset.status;
    const here = wanted === status;
    button.onclick = () => handlers.moveStatus(entry, wanted);
    button.setAttribute("aria-pressed", String(here));
    button.className = "ct-cms__button ct-cms__button--muted ct-cms__review-move" + (here ? " ct-cms__review-move--current" : "");
    button.disabled = moving || here;
  });
  const pull = el.querySelector(".ct-cms__review-pull");
  pull.textContent = `#${entry.pull.number} on GitHub`;
  pull.setAttribute("href", entry.pull.html_url);
}
function buildReview(doc, handlers) {
  const note = h(doc, "p", { class: "ct-cms__note" });
  const rows = h(doc, "ul", { class: "ct-cms__review-list" });
  const node = h(doc, "div", { class: "ct-cms__reviews" }, [
    h(doc, "div", { class: "ct-cms__entries-head" }, [
      h(doc, "h2", { class: "ct-cms__heading" }, ["In review"])
    ]),
    note,
    rows,
    h(
      doc,
      "p",
      { class: "ct-cms__hint" },
      ["Merging is a human decision, so it happens on GitHub. Moving an entry to Ready says it is finished, not that it is published."]
    )
  ]);
  return {
    node,
    update(state) {
      const entries = state.entries;
      note.textContent = entries === null ? "Loading…" : entries.length === 0 ? "Nothing is under review. Every change this tool makes opens a pull request, so this is where they wait." : "";
      list(
        rows,
        entries ?? [],
        /* The pull request number, which is the identity of a
           review: an entry can be renamed and a branch can be
           force-pushed, and it is the same review throughout.
           The key earns itself here rather than being recorded
           as equivalent-for-now, the way the entry list's was --
           a status move updates a row IN PLACE, so rekeying
           rebuilds the node under the pointer between the click
           and the answer. */
        (entry) => String(entry.pull.number),
        () => row(doc),
        (el, entry) => fill(el, handlers, state, entry)
      );
    }
  };
}
function notFound(doc, hash) {
  return [
    h(doc, "h2", { class: "ct-cms__heading" }, ["Not found"]),
    h(
      doc,
      "p",
      { class: "ct-cms__note" },
      ["Nothing here answers to ", h(doc, "code", {}, [hash]), "."]
    )
  ];
}
function collectionView(doc, state, entries, name) {
  const collection = state.config.collections.find((c) => c.name === name);
  if (!collection) {
    return missing(doc, name);
  }
  entries.update({
    collection,
    entries: state.entries,
    truncated: state.truncated
  });
  return [entries.node];
}
function createView(doc, state, create, entry, name) {
  if (state.entry.entry) {
    entry.update(state.entry);
    return [entry.node];
  }
  const collection = state.config.collections.find((c) => c.name === name);
  if (!collection) {
    return missing(doc, name);
  }
  create.update({ collection, busy: state.creating });
  return [create.node];
}
function missing(doc, name) {
  return [
    h(doc, "h2", { class: "ct-cms__heading" }, ["No such collection"]),
    h(
      doc,
      "p",
      { class: "ct-cms__note" },
      [
        "This deployment has no collection named ",
        h(doc, "code", {}, [name]),
        "."
      ]
    )
  ];
}
function mainView(doc, state, entries, entry, create, media, review) {
  switch (state.route.kind) {
    case "home":
      return [
        h(doc, "h2", { class: "ct-cms__heading" }, ["Collections"]),
        h(
          doc,
          "p",
          { class: "ct-cms__note" },
          ["Choose what to edit from the list on the left."]
        )
      ];
    case "collection":
      return collectionView(doc, state, entries, state.route.collection);
    case "new":
      return createView(doc, state, create, entry, state.route.collection);
    case "entry":
      entry.update(state.entry);
      return [entry.node];
    case "media":
      media.update(state.media);
      return [media.node];
    case "review":
      review.update({
        config: state.config,
        entries: state.review.entries,
        moving: state.review.moving
      });
      return [review.node];
    default:
      return notFound(doc, state.route.hash);
  }
}
function markCurrent(link, current) {
  link.className = "ct-cms__nav-link" + (current ? " ct-cms__nav-link--current" : "");
  if (current) {
    link.setAttribute("aria-current", "page");
  } else {
    link.removeAttribute("aria-current");
  }
}
function buildFrame(doc, handlers, widgets) {
  const repo = h(doc, "span", { class: "ct-cms__repo" });
  const navList = h(doc, "ul", { class: "ct-cms__nav-list" });
  const mediaLink = h(doc, "a", {
    class: "ct-cms__nav-link",
    href: formatRoute({ kind: "media" })
  }, ["Media"]);
  const reviewLink = h(doc, "a", {
    class: "ct-cms__nav-link",
    href: formatRoute({ kind: "review" })
  }, ["In review"]);
  const view = h(doc, "div", { class: "ct-cms__view" });
  const entries = buildEntries(doc);
  const entry = buildEntry(doc, handlers, widgets);
  const create = buildCreate(doc, handlers);
  const media = buildMedia(doc, handlers);
  const review = buildReview(doc, handlers);
  const alert = alertRegion(doc);
  const node = h(doc, "div", { class: "ct-cms" }, [
    h(doc, "header", { class: "ct-cms__header" }, [
      h(doc, "h1", { class: "ct-cms__title" }, ["Content"]),
      repo,
      h(doc, "span", { class: "ct-cms__spacer" }),
      h(doc, "button", {
        class: "ct-cms__button ct-cms__button--muted",
        type: "button",
        onclick: () => handlers.signOut()
      }, ["Sign out"])
    ]),
    h(doc, "div", { class: "ct-cms__body" }, [
      /* A real <nav> of real <a href> links, not click handlers on
         divs. This is the first surface in the project a person
         navigates rather than types into, so it is the first place
         keyboard and screen-reader access is owed -- and the hrefs
         are what make an entry linkable and reloadable at all. */
      h(doc, "nav", { class: "ct-cms__nav", "aria-label": "Collections" }, [
        h(doc, "h2", { class: "ct-cms__nav-heading" }, ["Collections"]),
        navList,
        h(doc, "h2", { class: "ct-cms__nav-heading" }, ["Library"]),
        h(doc, "ul", { class: "ct-cms__nav-list" }, [
          h(doc, "li", {}, [mediaLink])
        ]),
        h(doc, "h2", { class: "ct-cms__nav-heading" }, ["Workflow"]),
        h(doc, "ul", { class: "ct-cms__nav-list" }, [
          h(doc, "li", {}, [reviewLink])
        ])
      ]),
      h(doc, "main", { class: "ct-cms__main" }, [alert, view])
    ])
  ]);
  return {
    node,
    entry,
    update(state) {
      repo.textContent = state.config.backend.repo;
      showAlert(doc, alert, state.error);
      const current = state.route.kind === "collection" ? state.route.collection : null;
      markCurrent(mediaLink, state.route.kind === "media");
      markCurrent(reviewLink, state.route.kind === "review");
      list(
        navList,
        state.config.collections,
        (collection) => collection.name,
        (collection) => h(doc, "li", {}, [
          h(doc, "a", {
            class: "ct-cms__nav-link",
            href: formatRoute({ kind: "collection", collection: collection.name })
          }, [collection.label])
        ]),
        (el, collection) => markCurrent(
          el.firstElementChild,
          collection.name === current
        )
      );
      view.replaceChildren(
        ...mainView(doc, state, entries, entry, create, media, review)
      );
    }
  };
}
const TOKEN_URL = "https://github.com/settings/personal-access-tokens/new";
function buildGate(doc, handlers) {
  const alert = alertRegion(doc);
  const input = h(doc, "input", {
    class: "ct-cms__input",
    type: "password",
    id: "ct-cms-token",
    autocomplete: "off",
    spellcheck: "false",
    placeholder: "github_pat_..."
  });
  const repo = h(doc, "code", { class: "ct-cms__gate-repo" });
  const form = h(doc, "form", {
    class: "ct-cms__gate-form",
    onsubmit: (event) => {
      event.preventDefault();
      const given = input.value.trim();
      if (given) {
        handlers.signIn(given);
      }
    }
  }, [
    h(doc, "label", { class: "ct-cms__label", for: "ct-cms-token" }, ["Access token"]),
    input,
    h(doc, "button", { class: "ct-cms__button", type: "submit" }, ["Sign in"])
  ]);
  const pat = h(doc, "div", { class: "ct-cms__gate-pat" }, [
    h(
      doc,
      "p",
      { class: "ct-cms__gate-text" },
      ["Paste a fine-grained personal access token scoped to that repository, with these permissions:"]
    ),
    /* Named here rather than left to GitHub's own screen. A token
       scoped without them comes back as a 404 -- GitHub answers 404
       for a repository a token cannot see, so as not to disclose
       that it exists -- and a 404 reads to the person who just made
       the token as "that repository is gone", which is the one
       conclusion that leads nowhere. */
    h(doc, "ul", { class: "ct-cms__gate-permissions" }, [
      h(doc, "li", {}, ["Contents — read and write"]),
      h(doc, "li", {}, ["Pull requests — read and write"])
    ]),
    h(doc, "p", { class: "ct-cms__gate-text" }, [
      h(doc, "a", {
        class: "ct-cms__link",
        href: TOKEN_URL,
        target: "_blank",
        /* `noopener` because the opened page gets a handle on
           this one otherwise, and this one is holding a token. */
        rel: "noopener noreferrer"
      }, ["Create a token on GitHub"])
    ]),
    form,
    h(
      doc,
      "p",
      { class: "ct-cms__hint" },
      ["The token is kept for this tab only, and forgotten when you close it. It is never sent anywhere but GitHub."]
    )
  ]);
  const appNote = h(doc, "p", { class: "ct-cms__gate-text" });
  const appButton = h(doc, "button", {
    class: "ct-cms__button ct-cms__gate-app-button",
    type: "button",
    onclick: () => handlers.signIn(null)
  });
  const app = h(doc, "div", { class: "ct-cms__gate-app" }, [appNote, appButton]);
  const rescueText = h(doc, "textarea", {
    class: "ct-cms__conflict-text",
    readonly: "readonly",
    spellcheck: "false",
    "aria-label": "The markdown that was not saved"
  });
  const rescue = h(doc, "div", { class: "ct-cms__gate-rescue" }, [
    h(
      doc,
      "p",
      { class: "ct-cms__gate-text" },
      ["This did not save, because the sign-in had expired. Copy it now: it is kept only until you are signed in again."]
    ),
    rescueText
  ]);
  const node = h(doc, "div", { class: "ct-cms__gate" }, [
    h(doc, "div", { class: "ct-cms__gate-panel" }, [
      h(doc, "h1", { class: "ct-cms__gate-title" }, ["Sign in"]),
      h(doc, "p", { class: "ct-cms__gate-text" }, ["This site edits ", repo, "."]),
      /* Above both panels: which shape is showing does not change
         what a refusal says, and one alert cannot be left behind on
         the panel that is hidden. */
      alert,
      /* Above both panels, like the alert and for the same
         reason: which shape is showing has nothing to do with
         whether there is work to rescue, and a panel hidden with
         the token form would take the draft with it. */
      rescue,
      pat,
      app
    ])
  ]);
  return {
    node,
    update(state) {
      repo.textContent = state.repo;
      showAlert(doc, alert, state.error);
      rescue.hidden = state.unsaved === null;
      rescueText.value = state.unsaved ?? "";
      pat.hidden = state.gate !== null;
      app.hidden = state.gate === null;
      if (state.gate) {
        appButton.textContent = state.gate.label;
        appNote.textContent = state.gate.note;
      }
    }
  };
}
function buildStatus(doc) {
  const alert = alertRegion(doc);
  const waiting = h(doc, "p", { class: "ct-cms__note" }, ["Loading…"]);
  const node = h(doc, "div", { class: "ct-cms__gate" }, [
    h(doc, "div", { class: "ct-cms__gate-panel" }, [
      h(doc, "h1", { class: "ct-cms__gate-title" }, ["Content"]),
      alert,
      waiting
    ])
  ]);
  return {
    node,
    update(state) {
      showAlert(doc, alert, state.error);
      waiting.hidden = state.error !== null;
    }
  };
}
const TAG_NAME = "content-tools-cms";
const CONFIG_ATTRIBUTE = "config";
const RESCUE_KEY = "content-tools:unsaved";
class ContentToolsCms extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: "open" });
    this._frame = buildFrame(this.ownerDocument, {
      signOut: () => this._signOut(),
      submit: () => this._submit(),
      reload: () => this._reopen(),
      stay: () => this._stay(),
      discard: () => this._discard(),
      askDelete: (asking) => this._askDelete(asking),
      confirmDelete: () => this._delete(),
      create: (title) => this._create(title),
      thumbnail: (item) => this._thumbnail(item),
      moveStatus: (entry, status) => this._moveStatus(entry, status),
      openOnSite: (href) => this._openOnSite(href)
      /* A GETTER, not a snapshot. The frame is built here, in the
         constructor, and a host page sets `el.widgets` afterwards --
         it has no element to set it on until this has returned. A
         registry read once would ignore it silently, for the life of
         the page. */
    }, () => this.widgets);
    this._gate = null;
    this._status = null;
    this._config = null;
    this._route = HOME;
    this._error = null;
    this._repo = null;
    this._entries = null;
    this._truncated = false;
    this._creating = false;
    this._deleting = false;
    this._session = null;
    this._media = null;
    this._thumbnails = /* @__PURE__ */ new Set();
    this._review = null;
    this._moving = [];
    this._form = null;
    this._saving = false;
    this._saved = null;
    this._conflict = null;
    this._pendingLeave = null;
    this._restoring = false;
    this._nav = 0;
    this._booted = false;
    this._offered = null;
    this._unsaved = null;
    this._drafts = sessionStorageOrMemory();
    this._authGiven = null;
    this._authFromConfig = null;
    this._widgets = null;
    this._fetch = null;
    this._onHashChange = () => this._readRoute();
    this._onBeforeUnload = (ev) => this._guardUnload(ev);
    this._shadow.appendChild(this._frame.node);
  }
  // --- properties -------------------------------------------------------
  /**
   * How a token is obtained. Defaults to a `PatAuthAdapter` reading the
   * gate's field.
   *
   * Settable so M4's GitHub App adapter drops in without forking the
   * shell. The shell OWNS the adapter, which is why nothing here
   * subscribes to it: every transition it can cause goes through a
   * handler on this element, and signed-in-ness is derived at render
   * time from `currentToken()` rather than cached into a boolean that
   * can go stale.
   */
  get auth() {
    if (this._authGiven) {
      return this._authGiven;
    }
    if (!this._authFromConfig) {
      this._authFromConfig = new PatAuthAdapter({ prompt: () => this._offered });
    }
    return this._authFromConfig;
  }
  set auth(adapter) {
    this._authGiven = adapter;
    this._render();
  }
  /**
   * The `fetch` the config load and every API call go through.
   *
   * A property rather than a test-only attribute: a host page that has
   * to add a header, or route through its own proxy, wants exactly this,
   * and a seam that exists only for tests is one nobody maintains.
   */
  get fetch() {
    return this._fetch ?? globalThis.fetch;
  }
  set fetch(value) {
    this._fetch = value;
  }
  /**
   * The frontmatter widgets, so a site can add one without forking.
   *
   * MERGED over the defaults rather than replacing them: a deployment
   * with one `relation` field of its own would otherwise lose `string`
   * and the other eight, and every declared field would fall through
   * to the read-only `unknown` control -- a form that silently stops
   * editing anything. Overriding a default name is still possible, and
   * is then a deliberate act rather than a side effect of registering
   * something else.
   */
  get widgets() {
    return this._widgets ?? DEFAULT_WIDGETS;
  }
  set widgets(value) {
    this._widgets = Object.freeze({ ...DEFAULT_WIDGETS, ...value });
  }
  /** The repository client, once the config has loaded. */
  get repo() {
    return this._repo;
  }
  // --- lifecycle --------------------------------------------------------
  connectedCallback() {
    const sheet = shellStyleSheet(this.ownerDocument);
    if (sheet && !this._shadow.adoptedStyleSheets.includes(sheet)) {
      this._shadow.adoptedStyleSheets = [...this._shadow.adoptedStyleSheets, sheet];
    }
    const view = this.ownerDocument.defaultView;
    view == null ? void 0 : view.addEventListener("hashchange", this._onHashChange);
    view == null ? void 0 : view.addEventListener("beforeunload", this._onBeforeUnload);
    this._route = parseRoute(this._hash());
    if (!this._booted) {
      this._booted = true;
      void this._guard(() => this._loadConfig());
    } else {
      this._render();
    }
  }
  disconnectedCallback() {
    const view = this.ownerDocument.defaultView;
    view == null ? void 0 : view.removeEventListener("hashchange", this._onHashChange);
    view == null ? void 0 : view.removeEventListener("beforeunload", this._onBeforeUnload);
    void Promise.resolve().then(() => {
      if (!this.isConnected) {
        this._releaseThumbnails();
      }
    });
  }
  /** Give back every object URL this element handed to a thumbnail. */
  _releaseThumbnails() {
    for (const url of this._thumbnails) {
      URL.revokeObjectURL(url);
    }
    this._thumbnails.clear();
  }
  // --- state ------------------------------------------------------------
  _render() {
    const config = this._config;
    const token = config ? this.auth.currentToken() : null;
    const screen = config ? token ? "ready" : "signed-out" : this._error ? "unconfigured" : "loading";
    const shownOn = (which) => screen === which ? this._error : null;
    if (config) {
      this._frame.update({
        config,
        route: this._route,
        error: shownOn("ready"),
        entries: this._entries,
        truncated: this._truncated,
        entry: this._entryState(),
        creating: this._creating,
        media: this._mediaState(config),
        review: { entries: this._review, moving: this._moving }
      });
      this._gateView().update({
        repo: config.backend.repo,
        error: shownOn("signed-out"),
        /* Read every render, never cached: `el.auth` is settable
           at any moment, and a gate holding the shape the
           previous adapter asked for is a password field wired
           to something that ignores it. */
        gate: this.auth.gate ?? null,
        unsaved: this._unsaved
      });
    } else {
      this._statusView().update({ error: this._error });
    }
    this._show(screen);
  }
  /** Assign and re-render. The only way state changes. */
  _setState(patch) {
    if ("config" in patch) {
      this._config = patch.config ?? null;
    }
    if ("route" in patch && patch.route) {
      this._route = patch.route;
    }
    if ("error" in patch) {
      this._error = patch.error ?? null;
    }
    if ("entries" in patch) {
      this._entries = patch.entries ?? null;
    }
    if ("truncated" in patch) {
      this._truncated = patch.truncated ?? false;
    }
    if ("saving" in patch) {
      this._saving = patch.saving ?? false;
    }
    if ("saved" in patch) {
      this._saved = patch.saved ?? null;
    }
    if ("conflict" in patch) {
      this._conflict = patch.conflict ?? null;
    }
    if ("creating" in patch) {
      this._creating = patch.creating ?? false;
    }
    if ("deleting" in patch) {
      this._deleting = patch.deleting ?? false;
    }
    if ("media" in patch) {
      this._media = patch.media ?? null;
    }
    if ("review" in patch) {
      this._review = patch.review ?? null;
    }
    if ("moving" in patch) {
      this._moving = patch.moving ?? [];
    }
    this._render();
  }
  /**
   * Run something that can fail, and put the failure on the SCREEN.
   *
   * Every async entry point goes through here. An error that reaches
   * only the console leaves a shell that looks idle when it has failed,
   * and `shell-dist.spec.mjs` asserts the console stays clean for
   * exactly that reason.
   */
  async _guard(work) {
    var _a;
    try {
      await work();
    } catch (error) {
      const described = describeError(error);
      if (described.kind === "unauthorized") {
        const pending = ((_a = this._pending()) == null ? void 0 : _a.content) ?? null;
        if (pending !== null) {
          this._rescue(pending);
        }
        await this._dropToken();
      }
      this._setState({ error: described });
    }
  }
  // --- the work ---------------------------------------------------------
  _hash() {
    var _a;
    return ((_a = this.ownerDocument.defaultView) == null ? void 0 : _a.location.hash) ?? "";
  }
  _readRoute() {
    if (this._restoring) {
      this._restoring = false;
      return;
    }
    const route = parseRoute(this._hash());
    if (this._dirty()) {
      this._pendingLeave = route;
      this._restoreHash();
      this._render();
      return;
    }
    this._navigate(route);
  }
  /**
   * Put the address bar back where the shell actually is.
   *
   * The equality guard is load-bearing: assigning a hash that is
   * already set fires NO event, so `_restoring` would stay true and
   * swallow the next real navigation instead -- a shell that stops
   * responding to its own links, once.
   */
  _restoreHash() {
    const view = this.ownerDocument.defaultView;
    const want = formatRoute(this._route);
    if (!view || view.location.hash === want) {
      return;
    }
    this._restoring = true;
    view.location.hash = want;
  }
  /**
   * The tab is closing. Same predicate as the leave panel, deliberately.
   *
   * Two guards that disagree about whether there is work to lose is
   * worse than one: the panel would hold a navigation the browser then
   * let through without a word.
   */
  _guardUnload(ev) {
    if (!this._dirty()) {
      return;
    }
    ev.preventDefault();
    ev.returnValue = "";
  }
  /**
   * Go somewhere, and fetch whatever that somewhere needs.
   *
   * `_nav` is a monotonic token, taken here and re-checked after every
   * await in `_loadRoute`. Without it a slow listing for a collection
   * the user has already left renders over the one they are looking at
   * now: entry B's chrome with collection A's rows under it, and a
   * click that opens the wrong entry. Nothing throws, and the list
   * looks entirely plausible.
   *
   * It deliberately guards ROUTE-SCOPED work only. It was written into
   * the boot in M5-1 and taken out again: a hashchange during the
   * config load made the load's own post-await check fail, so the shell
   * sat on "Loading" for ever. The config belongs to the deployment,
   * not to a route, and nothing a person clicks makes it stale.
   *
   * Clearing the error is part of the same idea -- an alert about the
   * page you just left, still on screen over the page you just opened,
   * reads as a fresh failure of the new one -- and so is clearing the
   * entries: they belong to the route being left, and leaving them up
   * shows one collection's rows under another's heading until the new
   * listing lands.
   */
  _navigate(route) {
    this._nav += 1;
    const at = this._nav;
    this._pendingLeave = null;
    this._closeEntry();
    this._setState({
      route,
      error: null,
      entries: null,
      truncated: false,
      creating: false,
      review: null
    });
    void this._guard(() => this._loadRoute(at));
  }
  /**
   * Fetch what the current route displays.
   *
   * Both halves in ONE `Promise.all`, not one after the other: the
   * merged list needs both, and a sequential pair doubles the time an
   * author waits for a screen that cannot be drawn until the second
   * arrives.
   *
   * A file collection reaches `listEntries` too, and that is not a
   * wasted call: it answers from the config without touching the
   * network. `listInFlight` does fetch, for every collection alike --
   * a pull request against a file collection's entry is as real as any
   * other, and a file collection that silently never showed one would
   * hide a review in progress.
   */
  async _loadRoute(at) {
    var _a;
    const repo = this._repo;
    const route = this._route;
    if (!repo || !this.auth.currentToken()) {
      return;
    }
    if (route.kind === "media") {
      const folder = await repo.github.listDirectory(
        this._config.media.folder,
        repo.base
      );
      if (at !== this._nav) {
        return;
      }
      this._setState({ media: this._listing(folder) });
      return;
    }
    if (route.kind === "review") {
      const inFlight2 = await repo.listInFlight();
      if (at !== this._nav) {
        return;
      }
      this._setState({ review: inFlight2 });
      return;
    }
    if (route.kind !== "collection" && route.kind !== "entry") {
      return;
    }
    if (!((_a = this._config) == null ? void 0 : _a.collections.some((c) => c.name === route.collection))) {
      return;
    }
    if (route.kind === "entry") {
      await this._openEntry(at, route.collection, route.slug);
      return;
    }
    const [listing, inFlight] = await Promise.all([
      repo.listEntries(route.collection),
      repo.listInFlight()
    ]);
    if (at !== this._nav) {
      return;
    }
    this._setState({
      entries: mergeEntries(route.collection, listing.entries, inFlight),
      truncated: listing.truncated
    });
  }
  // --- the open entry ---------------------------------------------------
  /**
   * Read an entry and open its management screen.
   *
   * ONE request now. Until M6-3 this listed the media folder in the
   * same round trip, because the names it held decided what an upload
   * was staged as -- and uploads happen where the editor is, which is
   * the site's own page. A screen that cannot insert a picture has no
   * reason to ask what pictures there are.
   */
  async _openEntry(at, collection, slug) {
    const repo = this._repo;
    const entry = await repo.readEntry(collection, slug);
    if (at !== this._nav) {
      return;
    }
    this._mount(entry, MarkdownDocument.parse(entry.content ?? ""));
  }
  /**
   * Open an entry's management screen, however it was arrived at.
   *
   * Shared by opening an existing entry and creating a new one, and it
   * is the same code on purpose: the only thing a new entry does
   * differently is where its `MarkdownDocument` came from. Everything
   * after that -- the form, the dirty check, the save -- must not be
   * able to tell the two apart, or a created entry becomes a second
   * set of rules nobody exercises until somebody writes one.
   */
  _mount(entry, doc) {
    this._openForm(doc, entry.collection, entry.slug);
    this._session = new EntrySession({
      entry,
      doc,
      /* Asked of the live form, not snapshotted: the session wants
         the answers at the moment of the comparison, and the form
         is a set of controls somebody is still typing into. */
      values: () => this._frame.entry.values()
    });
    this._render();
  }
  /**
   * Name a new entry and open an editor for it.
   *
   * Nothing is committed here. The file appears in the repository at
   * the first Submit, so an author who names a post, reads what they
   * were about to write and closes the tab leaves nothing behind --
   * the same rule staged media follows, and for the same reason.
   *
   * The collision IS checked here even though `saveEntry` checks it
   * again at write time, and the second check is not the first one
   * repeated: this one runs before the editor opens, and the other
   * runs after somebody has spent an afternoon in it. Only the one at
   * write time can settle a race; only this one can save the
   * afternoon.
   */
  _create(title) {
    const route = this._route;
    const repo = this._repo;
    if (route.kind !== "new" || !repo || this._creating) {
      return;
    }
    const collection = findCollection(
      this._config,
      route.collection
    );
    const slug = expandSlug(collection, title, /* @__PURE__ */ new Date());
    const at = this._nav;
    this._setState({ creating: true });
    void this._guard(async () => {
      let entry;
      try {
        entry = await repo.readEntry(route.collection, slug);
      } finally {
        this._creating = false;
      }
      if (at !== this._nav) {
        return;
      }
      if (entry.content !== null || entry.pull) {
        throw new EntryExistsError(route.collection, slug, entry.path);
      }
      this._mount(entry, this._blankDocument(fieldsFor(collection, slug)));
    });
  }
  /**
   * The document a new entry starts from.
   *
   * The defaults go into the SOURCE, not into the form beside it. A
   * form seeded separately would be a second description of what the
   * file holds, and the byte-preserving comparison -- which asks
   * whether the form now says something the file does not -- would be
   * comparing the form against a document that never had them.
   */
  _blankDocument(fields) {
    const blank = MarkdownDocument.parse("");
    const defaults = fieldDefaults(fields);
    return Object.keys(defaults).length === 0 ? blank : MarkdownDocument.parse(blank.update("", { frontmatter: defaults }));
  }
  /**
   * Open the site's own page, handing this tab's token across.
   *
   * `/admin` and the page are different browsing contexts -- and for
   * any entry with a pull request, different origins, because the
   * page is that pull request's deploy preview. `sessionStorage` is
   * scoped to both, so an author who signed in here is nobody there
   * unless the link carries something. `src/auth/handoff.ts` holds
   * the whole of why it is a fragment.
   *
   * `noopener` for the same reason the link's own `rel` says it: the
   * page is on another origin and has no business holding a handle to
   * the screens that hold the token.
   *
   * An adapter with no `handoff` opens the plain link rather than
   * nothing. A host page may assign its own, and the page it reaches
   * then says how to sign in -- which is a worse afternoon than being
   * signed in already, and a much better one than a button that does
   * nothing when pressed.
   */
  _openOnSite(href) {
    var _a, _b, _c;
    const handed = ((_b = (_a = this.auth).handoff) == null ? void 0 : _b.call(_a)) ?? null;
    const url = handed === null ? href : `${href}#${handoffFragment(handed)}`;
    (_c = this.ownerDocument.defaultView) == null ? void 0 : _c.open(url, "_blank", "noopener");
  }
  /** Ask before deleting, or take the question back. */
  _askDelete(asking) {
    this._setState({ deleting: asking });
  }
  /**
   * Remove the open entry, as a pull request like any other edit.
   *
   * The shell never deletes anything from the site: it opens a pull
   * request that would, and a human merges it. So this is not a
   * destructive action behind a confirmation -- it is an ordinary
   * change, and the confirmation is there because the button sits
   * beside Submit.
   */
  _delete() {
    void this._guard(async () => {
      var _a;
      const repo = this._repo;
      const entry = ((_a = this._session) == null ? void 0 : _a.entry) ?? null;
      this._deleting = false;
      if (!repo || !entry) {
        return;
      }
      const back = { kind: "collection", collection: entry.collection };
      if (entry.content === null) {
        this._navigate(back);
        this._restoreHash();
        return;
      }
      this._setState({ saving: true, saved: null, conflict: null, error: null });
      const result = await repo.deleteEntry(entry.collection, entry.slug, {
        parent: entry.commit,
        message: `Delete ${entry.path}`
      });
      this._navigate(back);
      this._restoreHash();
      this._setState({ error: deletedNotice(result.pull.number) });
    });
  }
  /**
   * Decide what the frontmatter form shows, and whether it may be used.
   *
   * The fields come from the config and the values from the file, and
   * either can be absent without the other mattering: a collection
   * that declares none gets no form, and a file whose block cannot be
   * read gets a refusal instead of one.
   */
  _openForm(doc, collection, slug) {
    const config = this._config;
    const found = findCollection(config, collection);
    this._form = formState(found, slug, doc);
  }
  /**
   * Forget the open entry. Does NOT render; every caller sets state
   * immediately afterwards and a second render would only flicker.
   *
   * A plain assignment, and this used to be a method. Closing an entry
   * meant disconnecting an editor element from this host's light DOM,
   * and two failures lived in that and neither said anything: an editor
   * left connected holds the one-per-page `EditorApp` lease, so every
   * later entry refuses to open; and one removed by re-rendering the
   * shadow root instead is unslotted rather than disconnected, which is
   * the same thing with the element still on the page. Since M6-3 this
   * host has no light-DOM children at all -- the lease belongs to the
   * site's page now -- so there is nothing to get wrong.
   */
  _closeEntry() {
    this._session = null;
    this._form = null;
    this._deleting = false;
    this._saving = false;
    this._saved = null;
    this._conflict = null;
  }
  _entryState() {
    var _a;
    const entry = ((_a = this._session) == null ? void 0 : _a.entry) ?? null;
    const collection = entry && this._config ? findCollection(this._config, entry.collection) : null;
    return {
      entry,
      saving: this._saving,
      saved: this._saved,
      conflict: this._conflict,
      leaving: this._pendingLeave !== null,
      fields: this._form,
      /* Asked of the CONFIG every render rather than remembered
         from the open, because it is a property of the deployment
         and not of this entry -- and a remembered copy is a second
         answer that can disagree with the one the list used to
         decide whether to offer a New entry link. */
      deletable: (collection == null ? void 0 : collection.kind) === "folder" && collection.delete,
      deleting: this._deleting,
      /* Handed down whole rather than resolved to a URL here. The
         view needs the config to say whether this entry has a page
         at all, which is three different reasons for the same
         answer, and a URL computed up here would have thrown two
         of them away. */
      config: this._config
    };
  }
  /**
   * A directory listing as tiles, and whether it was cut short.
   *
   * `truncated` is measured on the RAW listing, one line from where the
   * request was made and before the directory filter below -- the same
   * rule and the same reason as `CmsRepo.listEntries`: a folder of a
   * thousand files holding a couple of subdirectories comes back under
   * the cap once filtered, so counting survivors reports a capped
   * listing as a complete one.
   */
  _listing(folder) {
    const config = this._config;
    return {
      /* Directories are not files. Without this a `thumbs/` folder
         beside the images becomes a tile with a broken preview and
         an Insert button that writes an `<img>` pointing at a
         directory. */
      files: folder.filter((file) => file.type === "file").map((file) => mediaItem(config, file)),
      truncated: folder.length >= DIRECTORY_LIMIT
    };
  }
  /**
   * The bytes of a file whose public URL did not answer.
   *
   * Failure is SILENT here, deliberately, and it is the one place in
   * the shell where that is right: one unreadable thumbnail is not a
   * reason to put a page-wide alert over somebody's work, and the tile
   * already says the file could not be read. Nothing is logged either
   * -- `shell-dist.spec.mjs` asserts a clean console, and a grid of
   * files a static host has not published yet would otherwise fill it.
   *
   * The cost is real and worth stating: a token revoked mid-session
   * shows up here as tiles that will not load rather than as a return
   * to the gate. The next request that is not a thumbnail -- any
   * navigation, any save -- goes through `_guard` and does the right
   * thing.
   */
  async _thumbnail(item) {
    const repo = this._repo;
    if (!repo || item.type === null) {
      return null;
    }
    try {
      const bytes = await repo.github.readBlob(item.sha);
      const url = URL.createObjectURL(
        new Blob([bytes.slice().buffer], { type: item.type })
      );
      this._thumbnails.add(url);
      return url;
    } catch {
      return null;
    }
  }
  /**
   * The media folder, for its own route.
   *
   * Read-only since M6-3, and the Insert button went with the editor.
   * A picture is put into an entry where the entry's words are, which
   * is the site's own page; a management screen that could insert one
   * would be inserting it into a body nothing here can see.
   */
  _mediaState(config) {
    var _a, _b;
    return {
      folder: config.media.folder,
      files: ((_a = this._media) == null ? void 0 : _a.files) ?? null,
      truncated: ((_b = this._media) == null ? void 0 : _b.truncated) ?? false
    };
  }
  /** Exactly what a save would write, or null if nothing is open. */
  _pending() {
    var _a;
    return ((_a = this._session) == null ? void 0 : _a.pending()) ?? null;
  }
  /** Whether there is work that a save would write. */
  _dirty() {
    var _a;
    return ((_a = this._session) == null ? void 0 : _a.dirty()) ?? false;
  }
  /**
   * Commit what is in the editor, and open or update the pull request.
   *
   * The open `MarkdownDocument` is NEVER re-parsed afterwards, and that
   * is the subtlest rule in the shell. Re-parsing the string just
   * written would renumber the blocks while the live DOM still carries
   * the old `data-ct-md` indices, so the next save would splice against
   * the wrong originals -- content corruption inside a diff that looks
   * perfectly reviewable. It stays correct because `parent` pins the
   * commit this edit was read at: the branch is what we read plus our
   * own change, or it is a `ConflictError`.
   */
  _submit() {
    void this._guard(async () => {
      const repo = this._repo;
      const session = this._session;
      const errors = this._frame.entry.errors();
      if (errors.length > 0) {
        this._setState({ error: fieldsNeeded(errors) });
        return;
      }
      if (!repo || !session) {
        return;
      }
      const pending = session.pending();
      this._setState({ saving: true, saved: null, conflict: null, error: null });
      let result;
      try {
        result = await session.commit(repo, pending);
      } catch (error) {
        this._saving = false;
        const described = describeError(error);
        if (described.kind === "conflict") {
          this._setState({ error: described, conflict: pending.content });
          return;
        }
        throw error;
      }
      if (this._route.kind === "new") {
        this._route = {
          kind: "entry",
          collection: session.entry.collection,
          slug: session.entry.slug
        };
        this._restoreHash();
      }
      this._setState({
        saving: false,
        saved: result.commit ? `Saved as ${result.commit.slice(0, 7)}.` : null,
        /* `changed: false` and a thrown `NothingToSaveError` are
           the same thing to the person who pressed the button:
           the repository already holds this. Which one the
           repository reports depends on whether a pull request
           happens to be open. */
        error: result.changed ? null : NOTHING_TO_SAVE
      });
    });
  }
  /** Throw away local edits and read the entry again. */
  _reopen() {
    this._navigate(this._route);
  }
  /** Abandon the held-back navigation. */
  _stay() {
    this._pendingLeave = null;
    this._render();
  }
  /**
   * Leave anyway, losing the unsaved work.
   *
   * Navigated directly rather than by setting the hash and waiting for
   * the event: the restoration's own hashchange may still be in
   * flight, and a second assignment racing it is how a discard turns
   * into two loads or none. The address bar is corrected afterwards,
   * with the resulting event suppressed because the work is done.
   */
  _discard() {
    const route = this._pendingLeave ?? this._route;
    this._pendingLeave = null;
    this._navigate(route);
    this._restoreHash();
  }
  async _loadConfig() {
    var _a, _b;
    const url = this.getAttribute(CONFIG_ATTRIBUTE);
    if (!url) {
      throw new ConfigError(
        CONFIG_ATTRIBUTE,
        `<${TAG_NAME}> needs a "${CONFIG_ATTRIBUTE}" attribute naming its config file`
      );
    }
    const config = await loadConfig(url, { fetch: this.fetch });
    this._repo = new CmsRepo({
      config,
      token: () => this.auth.currentToken(),
      /* Late-bound, and called UNBOUND. Late-bound because `fetch`
         is a property a host page may set at any point, and a
         client holding the function that was there at boot is a
         property that silently stops working. Unbound because
         `this.fetch(...)` would hand the browser this element as
         fetch's receiver -- "Illegal invocation", which is the
         exact bug the built-artifact suite found in the client in
         M3 and which no injected-transport test can see. */
      fetch: (input, init) => {
        const http = this.fetch;
        return http(input, init);
      }
    });
    this._authFromConfig = this._adapterFor(config);
    this._setState({ config, error: null });
    this._unsaved = this._recall();
    await ((_b = (_a = this.auth).resume) == null ? void 0 : _b.call(_a));
    if (this.auth.currentToken()) {
      this._rescue(null);
    }
    this._navigate(parseRoute(this._hash()));
  }
  /**
   * The adapter this deployment's config asks for.
   *
   * `fetch` is late-bound and called unbound, for the same two reasons
   * `CmsRepo` gets it that way: a host page may set the property at any
   * point, and `this.fetch(...)` would hand the browser this element as
   * fetch's receiver, which the native `fetch` refuses with "Illegal
   * invocation".
   *
   * That second half survives mutation at source level and is meant
   * to: every spec here assigns `el.fetch`, and an assigned function
   * does not care what it is called on. The page that does NOT assign
   * one is `app/index.html`, so the line is killed by the round trip
   * in `shell-dist.spec.mjs` -- which is where the identical bug in
   * the M3 client was found, and the reason that suite exists.
   */
  _adapterFor(config) {
    return adapterFor(config, {
      prompt: () => this._offered,
      fetch: (input, init) => {
        const http = this.fetch;
        return http(input, init);
      }
    });
  }
  _signIn(offered) {
    void this._guard(async () => {
      this._offered = offered;
      try {
        await this.auth.authenticate();
      } finally {
        this._offered = null;
      }
      let refused = null;
      try {
        refused = await this._verify();
      } catch (error) {
        refused = describeError(error);
      }
      if (refused) {
        await this._dropToken();
        this._setState({ error: refused });
        return;
      }
      this._rescue(null);
      this._navigate(this._route);
    });
  }
  /**
   * Ask GitHub whether this token is any good, before letting go of the
   * gate.
   *
   * Without this the first thing a mis-scoped token does is fail a
   * listing, several screens away from the field that produced it and
   * the permissions written next to that field. The worst version is a
   * token that can READ but not write: everything works until the first
   * save, which fails an hour into somebody's afternoon with their work
   * in the editor.
   *
   * A 401 or a 404 here throws, and `_guard` drops the token on a 401,
   * so the gate comes back with the reason on it. `permissions` is
   * absent for some token types, so an absent one is not read as "no":
   * a check that refuses tokens it cannot assess is worse than the
   * failure it prevents.
   */
  async _verify() {
    const repo = this._repo;
    if (!repo) {
      return null;
    }
    const meta = await repo.github.repo();
    return meta.permissions && meta.permissions.push === false ? cannotPush(repo.config.backend.repo) : null;
  }
  _signOut() {
    void this._guard(async () => {
      await this._dropToken();
      this._setState({ error: null });
    });
  }
  /**
   * Give up the token, and everything that needed one.
   *
   * The open entry goes with it. Every question the management screen
   * can ask about an entry needs the token that is being given up, so
   * one left open would be a heading and a form over an entry nothing
   * can read, save or delete.
   */
  async _dropToken() {
    await this.auth.logout();
    this._closeEntry();
  }
  /**
   * Hold a refused save's markdown, or let go of it.
   *
   * No `_setState`: every caller is already on its way to one, and a
   * render from in here would paint the gate before the token it is
   * about to drop has gone.
   */
  _rescue(content) {
    this._unsaved = content;
    try {
      if (content === null) {
        this._drafts.removeItem(RESCUE_KEY);
      } else {
        this._drafts.setItem(RESCUE_KEY, content);
      }
    } catch {
    }
  }
  /** The draft a previous page left behind, if there is one. */
  _recall() {
    try {
      return this._drafts.getItem(RESCUE_KEY);
    } catch {
      return null;
    }
  }
  // --- the review list --------------------------------------------------
  /**
   * Move an entry's pull request to a status.
   *
   * The shell NEVER MERGES. `ready` says an entry is finished, not
   * that it is published: branch protection, required reviews and
   * CODEOWNERS are the repository's own controls, and a tool that can
   * write, approve and publish in one session has quietly removed the
   * review gate this whole workflow exists for.
   */
  _moveStatus(entry, status) {
    const repo = this._repo;
    const number = entry.pull.number;
    this._setState({ moving: [...this._moving, number], error: null });
    void this._guard(async () => {
      var _a;
      try {
        const pull = await repo.setStatus(entry.pull, status);
        this._setState({
          review: (_a = this._review) == null ? void 0 : _a.map((row2) => row2.pull.number === number ? { ...row2, pull } : row2)
        });
      } finally {
        this._setState({ moving: this._moving.filter((n) => n !== number) });
      }
    });
  }
  // --- which screen -----------------------------------------------------
  _gateView() {
    if (!this._gate) {
      this._gate = buildGate(this.ownerDocument, {
        signIn: (offered) => this._signIn(offered)
      });
      this._shadow.appendChild(this._gate.node);
    }
    return this._gate;
  }
  _statusView() {
    if (!this._status) {
      this._status = buildStatus(this.ownerDocument);
      this._shadow.appendChild(this._status.node);
    }
    return this._status;
  }
  /**
   * Exactly one of the three screens, and the reflected `state`.
   *
   * The frame is HIDDEN rather than removed, and that is now a
   * preference rather than an invariant: it held `<slot name="editor">`
   * until M6-3, and a slot detached from the shadow root unslots
   * whatever was in it -- leaving an editor invisible, still connected,
   * and still holding the one-per-page lease. What is left is the
   * ordinary reason, which is that rebuilding the whole frame to come
   * back from a gate throws away scroll position and focus.
   *
   * `state` is reflected OUT and never read back in: it is how a host
   * page and a test wait for the shell without polling a property.
   */
  _show(state) {
    this._frame.node.hidden = state !== "ready";
    if (this._gate) {
      this._gate.node.hidden = state !== "signed-out";
    }
    if (this._status) {
      this._status.node.hidden = state === "ready" || state === "signed-out";
    }
    this.setAttribute("state", state);
  }
}
if (typeof customElements !== "undefined" && !customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, ContentToolsCms);
}
export {
  ContentToolsCms,
  TAG_NAME
};
