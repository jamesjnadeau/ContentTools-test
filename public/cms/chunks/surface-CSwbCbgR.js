import { E as EntrySession, m as mediaUploader, R as REGION, h, b as buildFields, f as fieldsNeeded, d as describeError, N as NOTHING_TO_SAVE, l as loadConfig, a as declaredEntry, e as entryForUrl, c as adapterFor, C as CmsRepo, M as MediaStore, g as formState, i as findCollection, j as ConfigError, k as bodySelector } from "./session-BRRA5z-z.js";
import { M as MarkdownDocument } from "./index-BNtVnYoY.js";
import { T as TAG_NAME, C as ContentToolsEditor } from "./content-tools-editor-wKXO4w5c.js";
import { s as sheetFactory } from "./constructed-styles-BEftmh6P.js";
const EDITOR_REGIONS = "[data-editable]";
class EditingSession extends EntrySession {
  constructor(options) {
    super(options);
    this.store = options.store;
    this._edited = null;
    this.editor = this._build(options);
  }
  /**
   * Begin editing.
   *
   * Started by the caller, not by an ignition button: pressing Edit on
   * the page IS the decision to edit it, and an editor sitting inert
   * behind a second press is a page that looks broken. It also has to
   * be started for `save(true)` to have any regions to report --
   * `_regions` is populated by `start()`.
   */
  start() {
    this.editor.start();
  }
  /** Take the editor back off the page. */
  close() {
    this.editor.remove();
  }
  /**
   * What a save would write, with the body as the editor holds it.
   *
   * The media rewrite belongs in the same pass for the reason the base
   * class gives about `pending` generally: it happens on the way to the
   * commit, so it has to happen on the way to the comparison. Rewriting
   * the HTML and asking separately what to commit can disagree, and the
   * way they disagree is an entry referencing an image nobody uploaded.
   *
   * `update` rather than the base's `updateFrontmatter`, because here
   * the body genuinely has been through an editor and every block has
   * to be re-compared against the source.
   */
  pending() {
    const merged = this.merged();
    const { html, media } = this.store.rewrite(this.html());
    return {
      content: this.doc.update(html, merged === null ? void 0 : { frontmatter: merged }),
      media
    };
  }
  /**
   * The body HTML as it stands right now.
   *
   * `save(true)` is passive: it reports without unmounting the
   * regions, so the caret stays where the person left it. It fills
   * `_edited` synchronously through the handler below, and the cache
   * is why this may be called twice -- the dirty check and the submit
   * both want the answer, and the second caller would otherwise be
   * told nothing had changed.
   */
  html() {
    this.editor.save(true);
    return this._edited ?? this.doc.toHTML();
  }
  /**
   * The editor element for this entry, built and not yet connected.
   *
   * Everything is in place before it enters the DOM, because
   * `connectedCallback` boots immediately: an element connected first
   * and configured afterwards boots against the defaults and then has
   * to be rebooted, which tears down and re-claims the lease for
   * nothing.
   */
  _build(options) {
    const document = options.document;
    const editor = document.createElement(TAG_NAME);
    editor.setAttribute("regions", EDITOR_REGIONS);
    editor.setAttribute("mode", "markdown");
    editor.imageUploader = mediaUploader({ store: this.store });
    const region = options.region;
    region.setAttribute("data-name", REGION);
    region.innerHTML = this.doc.toHTML();
    editor.regionElements = [region];
    editor.addEventListener("ct-saved", (ev) => this._remember(ev));
    return editor;
  }
  /**
   * Remember what the editor last reported for the body.
   *
   * Only when the region is actually in the map. `save()` reports the
   * regions whose content moved since the last save and then RESETS
   * that baseline, so an unchanged save reports none -- and reading
   * the absent key as "the body is empty now" would make the next
   * submit write an empty file over somebody's post.
   */
  _remember(ev) {
    var _a;
    const regions = (_a = ev.detail) == null ? void 0 : _a.regions;
    const html = regions ? regions[REGION] : void 0;
    if (typeof html === "string") {
      this._edited = html;
    }
  }
}
const editCSS = "/**\n * Local replacements for the handful of Bourbon mixins this project used.\n *\n * Bourbon existed here only to emit vendor prefixes for transform, transition,\n * animation, @keyframes, box-sizing, user-select and hyphens. All of those are\n * unprefixed standards in every browser this library targets, so the mixins are\n * gone and the properties are written directly -- except where a prefix is still\n * genuinely required (see `user-select` and `hyphens` below).\n */\n/**\n * The one Bourbon *variable* this project used, inlined verbatim from\n * bourbon/addons/_font-family.scss so the `pre` styling is unchanged.\n */\n/**\n * Contain floats. The one Bourbon mixin worth keeping as a mixin, since it\n * expands to a pseudo-element rather than a single declaration.\n */\n/**\n * Safari still requires -webkit-user-select; the -moz- and -ms- forms are long\n * obsolete and are not emitted.\n */\n/**\n * Safari still requires -webkit-hyphens.\n */\n/**\n * All widgets are assigned a z-index equal to or higher than this setting. The\n * base z-index can be adjusted to overcome z-index conflicts with existing page\n * elements.\n */\n/**\n * For UI widgets that appear on the page (as opposed to appearing in front of a\n * modal screen) we define a base background colour.\n */\n/**\n * The colour used when casting shadows for widgets that appear to float.\n */\n/**\n * Confirm, Cancel and Edit actions are common amoung the various ui components.\n * Each action has an associated/common colour.\n */\n/**\n * Tooltips feature for a number of components, their base appearance is\n * configured using a mixin.\n */\n/**\n * The following settings relate to typography. For portability we limit the the\n * use of fonts to:\n *\n * - `type-icon` used for displaying icons (courtesy of http://icomoon.io).\n * - `type-text` used for displaying text.\n *\n */\n:host {\n  all: initial;\n  display: block;\n  position: fixed;\n  right: 12px;\n  top: 12px;\n  z-index: 9998;\n}\n\n.ct-edit {\n  background: white;\n  border: 1px solid #d0d0d0;\n  border-radius: 2px;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);\n  box-sizing: border-box;\n  color: #646464;\n  max-width: 320px;\n  padding: 8px 10px;\n  font-family: arial, sans-serif;\n  font-size: 14px;\n  line-height: 18px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-edit__title {\n  color: black;\n  font-weight: bold;\n  margin: 0;\n}\n\n.ct-edit__hint {\n  margin: 4px 0 0;\n}\n\n.ct-edit--broken .ct-edit__title,\n.ct-edit--no-body .ct-edit__title,\n.ct-edit--failed .ct-edit__title {\n  color: #e74c3c;\n}\n\n.ct-edit--loading .ct-edit__hint {\n  font-style: italic;\n}\n\n.ct-edit {\n  max-height: calc(100vh - 24px);\n  overflow-y: auto;\n}\n\n.ct-edit__actions {\n  align-items: center;\n  display: flex;\n  flex-wrap: wrap;\n  gap: 8px;\n  margin: 8px 0 0;\n}\n.ct-edit__actions[hidden][hidden] {\n  display: none;\n}\n\n.ct-edit__submit,\n.ct-edit__details {\n  background: #f7f7f7;\n  border: 1px solid #d0d0d0;\n  border-radius: 2px;\n  color: #646464;\n  cursor: pointer;\n  padding: 4px 10px;\n  font-family: arial, sans-serif;\n  font-size: 12px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n.ct-edit__submit:focus-visible,\n.ct-edit__details:focus-visible {\n  outline: 2px solid #2980b9;\n  outline-offset: 1px;\n}\n.ct-edit__submit:disabled,\n.ct-edit__details:disabled {\n  color: #646464;\n  cursor: default;\n}\n\n.ct-edit__submit {\n  background: #2980b9;\n  border-color: #2980b9;\n  color: white;\n  font-weight: bold;\n}\n.ct-edit__submit:disabled {\n  background: #f7f7f7;\n  border-color: #d0d0d0;\n}\n\n.ct-edit__pull {\n  color: #2980b9;\n  font-family: arial, sans-serif;\n  font-size: 12px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-edit__note {\n  margin: 8px 0 0;\n  font-family: arial, sans-serif;\n  font-size: 12px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n.ct-edit__note:empty {\n  display: none;\n}\n\n.ct-edit__note--refused {\n  color: #e74c3c;\n}\n\n.ct-edit__conflict {\n  box-sizing: border-box;\n  border: 1px solid #d0d0d0;\n  display: block;\n  height: 120px;\n  margin: 8px 0 0;\n  resize: vertical;\n  white-space: pre;\n  width: 100%;\n}\n.ct-edit__conflict[hidden][hidden] {\n  display: none;\n}\n\n.ct-fields {\n  border-top: 1px solid #d0d0d0;\n  margin: 8px 0 0;\n  padding: 8px 0 0;\n}\n\n.ct-fields__heading {\n  display: none;\n}\n\n.ct-fields__note {\n  color: #646464;\n  margin: 0 0 8px;\n  font-family: arial, sans-serif;\n  font-size: 12px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n.ct-fields__note:empty {\n  display: none;\n}\n\n.ct-fields__rows {\n  display: grid;\n  gap: 8px;\n}\n\n.ct-field__label {\n  display: block;\n  font-weight: bold;\n  margin: 0 0 2px;\n  font-family: arial, sans-serif;\n  font-size: 12px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-field__input {\n  border: 1px solid #d0d0d0;\n  box-sizing: border-box;\n  display: block;\n  padding: 4px 6px;\n  width: 100%;\n  font-family: arial, sans-serif;\n  font-size: 12px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n.ct-field__input:focus-visible {\n  outline: 2px solid #2980b9;\n  outline-offset: -1px;\n}\n.ct-field__input[readonly] {\n  background: #f7f7f7;\n  color: #646464;\n}\n\ntextarea.ct-field__input {\n  min-height: 48px;\n  resize: vertical;\n}\n\n.ct-field__check {\n  display: block;\n  margin: 2px 0;\n}\n\n.ct-field__hint {\n  color: #646464;\n  margin: 2px 0 0;\n  font-family: arial, sans-serif;\n  font-size: 11px;\n  line-height: 15px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-field__error {\n  color: #e74c3c;\n  margin: 2px 0 0;\n  font-family: arial, sans-serif;\n  font-size: 11px;\n  line-height: 15px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-field__preview {\n  border: 1px solid #d0d0d0;\n  display: block;\n  margin: 4px 0 0;\n  max-height: 80px;\n  max-width: 100%;\n}";
const BAR_TAG = "content-tools-edit-bar";
const barStyleSheet = sheetFactory(editCSS);
const FIELDS_ID = "ct-edit-fields";
function buildBar(doc, handlers) {
  const node = doc.createElement(BAR_TAG);
  const root = node.attachShadow({ mode: "open" });
  const sheet = barStyleSheet(doc);
  if (sheet) {
    root.adoptedStyleSheets = [sheet];
  }
  const title = h(doc, "p", { class: "ct-edit__title" });
  const hint = h(doc, "p", { class: "ct-edit__hint" });
  let open2 = false;
  const details = h(doc, "button", {
    class: "ct-edit__details",
    type: "button",
    "aria-controls": FIELDS_ID,
    "aria-expanded": "false",
    onclick: () => handlers.showFields(!open2)
  }, ["Details"]);
  const pull = h(doc, "a", {
    class: "ct-edit__pull",
    target: "_blank",
    rel: "noopener noreferrer"
  });
  const submit = h(doc, "button", {
    class: "ct-edit__submit",
    type: "button",
    onclick: () => handlers.submit()
  }, [SUBMIT_LABEL]);
  const actions = h(doc, "div", { class: "ct-edit__actions" }, [details, pull, submit]);
  const note = h(doc, "p", { class: "ct-edit__note" });
  const conflict = h(doc, "textarea", {
    class: "ct-edit__conflict",
    readonly: "readonly",
    spellcheck: "false",
    "aria-label": "The markdown this submit would have written"
  });
  const fields = buildFields(doc);
  fields.node.setAttribute("id", FIELDS_ID);
  const panel = h(
    doc,
    "div",
    { class: "ct-edit", role: "status" },
    [title, hint, actions, note, fields.node, conflict]
  );
  root.appendChild(panel);
  return {
    node,
    values: () => fields.values(),
    errors: () => fields.errors(),
    update(state) {
      const said2 = describe(state);
      panel.className = `ct-edit ct-edit--${state.kind}`;
      title.textContent = said2.title;
      hint.textContent = said2.hint;
      const editing = state.kind === "editing" ? state : null;
      actions.hidden = editing === null;
      fields.update(editing ? editing.fields : null);
      const form = !fields.node.hidden;
      details.hidden = !form;
      if (form) {
        open2 = editing.fieldsOpen;
        fields.node.hidden = !open2;
        details.setAttribute("aria-expanded", String(open2));
      }
      const save = editing ? editing.save : null;
      submit.disabled = save === null || save.busy;
      submit.textContent = (save == null ? void 0 : save.busy) ? "Submitting…" : SUBMIT_LABEL;
      note.textContent = save ? save.note : "";
      note.classList.toggle(
        "ct-edit__note--refused",
        save !== null && save.refused
      );
      const open_pull = save ? save.pull : null;
      pull.textContent = open_pull ? `Pull request #${open_pull.number}` : "";
      if (open_pull) {
        pull.setAttribute("href", open_pull.url);
      } else {
        pull.removeAttribute("href");
      }
      pull.hidden = open_pull === null;
      conflict.value = (save == null ? void 0 : save.conflict) ?? "";
      conflict.hidden = !(save == null ? void 0 : save.conflict);
    }
  };
}
const SUBMIT_LABEL = "Submit for review";
function describe(state) {
  switch (state.kind) {
    case "broken":
      return { title: "The CMS config could not be read", hint: state.hint };
    case "not-an-entry":
      return { title: "Not an editable page", hint: state.hint };
    case "no-body":
      return { title: entryName(state.entry), hint: state.hint };
    case "ready":
    case "editing":
      return {
        title: entryName(state.entry),
        hint: `Editing ${found(state)}.`
      };
    case "signed-out":
      return {
        title: entryName(state.entry),
        /* The element is named HERE TOO, and that is the point of
           saying it in two states rather than one: checking a
           `body` selector is a deployment job, and asking somebody
           to obtain a token before they can see whether they
           pointed it at the right element makes the check cost an
           afternoon instead of a page load. */
        hint: `Found ${found(state)}. Sign in through the admin screens in this tab, then come back to edit it.`
      };
    case "loading":
      return {
        title: entryName(state.entry),
        /* "the branch" rather than "the repository", because that
           is the surprising part: the words about to replace what
           is on screen are the ones under review, not the ones
           this page was built from. */
        hint: "Reading the version on the branch..."
      };
    case "failed":
      return { title: entryName(state.entry), hint: state.hint };
  }
}
function found(state) {
  return `${describeElement(state.body)}, matched by ${state.selector}`;
}
function entryName(entry) {
  return `${entry.collection}/${entry.slug}`;
}
function describeElement(el) {
  const id = el.id === "" ? "" : `#${el.id}`;
  const classes = [...el.classList].map((name) => `.${name}`).join("");
  return `${el.tagName.toLowerCase()}${id}${classes}`;
}
class PageEdit {
  constructor(options) {
    this.session = options.session;
    this._bar = options.bar;
    this._repo = options.repo;
    this._seen = options.seen;
    this._fields = options.fields;
    this._open = false;
    this._busy = false;
    this._note = "";
    this._refused = false;
    this._conflict = null;
  }
  /**
   * Put the current state on the bar.
   *
   * The form starts CLOSED, which is the one place this surface
   * differs from the shell's and it is not a style choice. Under
   * /admin the form is a pane beside the editor and the screen is
   * ours; here the bar floats over somebody's published page, and a
   * panel that opens itself to the height of a nine-field form covers
   * the words the author came to read.
   */
  render() {
    this._bar.update({
      kind: "editing",
      ...this._seen,
      fields: this._fields,
      fieldsOpen: this._open,
      save: this._state()
    });
  }
  /** Show or hide the frontmatter form. */
  show(open2) {
    this._open = open2;
    this.render();
  }
  /**
   * Commit what is in the editor, and open or update the pull request.
   *
   * Returns nothing and never rejects: it is a click handler, and the
   * promise it starts is one nobody is holding. The `void` is what
   * says so at the one call site that matters.
   */
  submit() {
    void this._submit();
  }
  async _submit() {
    const errors = this._bar.errors();
    if (errors.length > 0) {
      this._say(fieldsNeeded(errors));
      return;
    }
    const pending = this.session.pending();
    this._busy = true;
    this._note = "";
    this._refused = false;
    this._conflict = null;
    this.render();
    let result;
    try {
      result = await this.session.commit(this._repo, pending);
    } catch (error) {
      this._busy = false;
      const said2 = describeError(error);
      this._say(said2, said2.kind === "conflict" ? pending.content : null);
      return;
    }
    this._busy = false;
    if (result.commit === null) {
      this._say(NOTHING_TO_SAVE);
      return;
    }
    this._note = `Submitted as ${result.commit.slice(0, 7)}.`;
    this._refused = false;
    this._conflict = null;
    this.render();
  }
  /** Say a described outcome, and show it. */
  _say(said2, conflict = null) {
    this._note = `${said2.title} ${said2.detail}`;
    this._refused = said2.kind !== "notice";
    this._conflict = conflict;
    this.render();
  }
  _state() {
    const pull = this.session.entry.pull;
    return {
      busy: this._busy,
      note: this._note,
      refused: this._refused,
      pull: pull ? { number: pull.number, url: pull.html_url } : null,
      conflict: this._conflict
    };
  }
}
const DEFAULT_CONFIG_URL = "/cms-config.yml";
const CONFIG_META = "cms:config";
const CONTENT_STYLES_MARK = "ct-edit-content-styles";
async function open(where, options = {}) {
  const doc = where.document;
  const live = { editing: null };
  const bar = buildBar(doc, {
    submit: () => {
      var _a;
      return (_a = live.editing) == null ? void 0 : _a.submit();
    },
    showFields: (open2) => {
      var _a;
      return (_a = live.editing) == null ? void 0 : _a.show(open2);
    }
  });
  doc.body.appendChild(bar.node);
  let located2;
  try {
    located2 = await resolve(where, options);
  } catch (error) {
    bar.update(failure(error));
    return { bar, editing: null, session: null };
  }
  bar.update(located2);
  if (located2.kind !== "ready") {
    return { bar, editing: null, session: null };
  }
  const seen = {
    entry: located2.entry,
    selector: located2.selector,
    body: located2.body
  };
  try {
    const editing = await start(where, bar, located2.config, seen, options);
    live.editing = editing;
    editing == null ? void 0 : editing.render();
    return { bar, editing, session: editing ? editing.session : null };
  } catch (error) {
    bar.update({ kind: "failed", ...seen, hint: said(error) });
    return { bar, editing: null, session: null };
  }
}
async function resolve(where, options = {}) {
  const doc = where.document;
  const config = await loadConfig(configUrl(doc), { fetch: options.fetch });
  const entry = declaredEntry(config, doc) ?? entryForUrl(config, where.location.href);
  if (!entry) {
    return { kind: "not-an-entry", hint: unmapped(config) };
  }
  return located(config, entry, doc);
}
async function start(where, bar, config, seen, options) {
  const token = adapterFor(config).currentToken();
  if (token === null) {
    bar.update({ kind: "signed-out", ...seen });
    return null;
  }
  bar.update({ kind: "loading", ...seen });
  const repo = new CmsRepo({ config, token, fetch: options.fetch });
  const [entry, folder] = await Promise.all([
    repo.readEntry(seen.entry.collection, seen.entry.slug),
    repo.github.listDirectory(config.media.folder, repo.base)
  ]);
  linkContentStyles(where.document, options.contentStyles);
  defineEditor();
  const doc = MarkdownDocument.parse(entry.content ?? "");
  const session = new EditingSession({
    document: where.document,
    entry,
    doc,
    store: new MediaStore({ config, taken: folder.map((file) => file.name) }),
    /* The BAR's form, asked at the moment of the comparison. It
       answers null for a collection with no fields and for a block
       the form refused, and null is exactly how a session is told
       there is none -- it then reaches `update` with no options
       object at all, which is what preserves the block byte for
       byte. */
    values: () => bar.values(),
    /* THE site's own element, edited where it stands. */
    region: seen.body
  });
  where.document.body.appendChild(session.editor);
  session.start();
  const editing = new PageEdit({
    bar,
    session,
    repo,
    seen,
    /* Non-null for the reason `located` gives one line at a time:
       an entry in hand names a collection this config holds,
       because both mappings resolve the name against it. */
    fields: formState(
      findCollection(config, seen.entry.collection),
      seen.entry.slug,
      doc
    )
  });
  return editing;
}
function defineEditor() {
  if (typeof customElements === "undefined" || customElements.get(TAG_NAME)) {
    return;
  }
  customElements.define(TAG_NAME, ContentToolsEditor);
}
function linkContentStyles(doc, href) {
  if (!href || doc.querySelector(`link[data-content-tools="${CONTENT_STYLES_MARK}"]`)) {
    return;
  }
  const link = doc.createElement("link");
  link.setAttribute("data-content-tools", CONTENT_STYLES_MARK);
  link.rel = "stylesheet";
  link.href = href;
  doc.head.appendChild(link);
}
function located(config, entry, doc) {
  const collection = findCollection(config, entry.collection);
  const selector = bodySelector(collection, doc);
  if (selector === null) {
    return {
      kind: "no-body",
      entry,
      hint: `\`${entry.collection}\` has no \`body\` selector, so nothing on this page can be edited in place.`
    };
  }
  const body = doc.querySelector(selector);
  if (!(body instanceof HTMLElement)) {
    return {
      kind: "no-body",
      entry,
      hint: `Nothing on this page matches \`${selector}\`.`
    };
  }
  return { kind: "ready", config, entry, selector, body };
}
function unmapped(config) {
  const mapped = config.collections.some((collection) => collection.kind === "file" ? collection.files.some((file) => file.page !== null) : collection.page !== null);
  return mapped ? "This page is not one of the entries this site can edit." : "No collection says where its entries are published, so no page maps to an entry.";
}
function failure(error) {
  return { kind: "broken", hint: said(error) };
}
function said(error) {
  if (error instanceof ConfigError && error.path !== "") {
    return `${error.path}: ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}
function configUrl(doc) {
  var _a, _b;
  const said2 = (_b = (_a = doc.querySelector(`meta[name="${CONFIG_META}"]`)) == null ? void 0 : _a.getAttribute("content")) == null ? void 0 : _b.trim();
  return said2 ? said2 : DEFAULT_CONFIG_URL;
}
export {
  CONFIG_META,
  CONTENT_STYLES_MARK,
  DEFAULT_CONFIG_URL,
  open,
  resolve
};
