import { D as DocumentRootContext, C as ContentTools, a as ContentEdit, P as PROFILES, f as filterToolGroups } from "./remove-D_MYgiIV.js";
import { s as setRootContext, r as rootContext } from "./root-context-CaKowcmF.js";
import { s as sheetFactory, l as layered } from "./constructed-styles-BEftmh6P.js";
class ShadowRootContext extends DocumentRootContext {
  constructor(shadowRoot, options = {}) {
    const doc = shadowRoot.host.ownerDocument;
    super(doc, doc.defaultView);
    this.root = shadowRoot;
    this.host = shadowRoot.host;
    this._scope = options.contentScope === "shadow" ? "shadow" : "light";
  }
  // --- content scope ----------------------------------------------------
  /** 'light' (Mode A, the default) or 'shadow' (Mode B). */
  contentScopeMode() {
    return this._scope;
  }
  setContentScopeMode(mode) {
    this._scope = mode === "shadow" ? "shadow" : "light";
  }
  // --- mounting ---------------------------------------------------------
  /**
   * Chrome is mounted into a container of our own inside the shadow root,
   * created on first use.
   *
   * A dedicated element rather than the shadow root itself: the editor
   * appends and removes children freely, and the shadow root also holds the
   * consumer's `<slot>` and adopted-stylesheet-independent markup that must
   * survive a stop/start cycle.
   */
  mountPoint() {
    if (!this._mountPoint) {
      const host = this.document.createElement("div");
      host.className = "ct-app-host";
      this.root.appendChild(host);
      this._mountPoint = host;
    }
    return this._mountPoint;
  }
  /**
   * Where drag helpers and crop marks go.
   *
   * In Mode A this is `document.body`, NOT the shadow mount. The drag helper
   * is positioned in page coordinates over content that lives in the light
   * DOM, and putting it in the shadow root would make its offsets depend on
   * whether the host happens to establish a containing block (any transform,
   * filter, or `position: relative` on the host or an ancestor inside the
   * shadow root would do it). Keeping it in the document makes the
   * coordinates unconditionally correct.
   *
   * In Mode B the content is inside the shadow root, so the overlay must be
   * too or it cannot be positioned over it.
   */
  overlayPoint() {
    return this._scope === "shadow" ? this.mountPoint() : this.document.body;
  }
  /**
   * The subtree region queries run against.
   *
   * Mode A: the host element, whose light-DOM children are the regions.
   * Mode B: the shadow root.
   *
   * An explicit setContentScope() still wins, so a consumer can narrow it
   * further.
   */
  contentScope() {
    if (this._contentScope) {
      return this._contentScope;
    }
    return this._scope === "shadow" ? this.root : this.host;
  }
  // --- global UI state ---------------------------------------------------
  /**
   * Dual write: `document.body` and the shadow mount point.
   *
   * The body write is what the existing `.ce--dragging` / `.ce--resizing`
   * rules need -- they ship in the document-level content stylesheet and set
   * `cursor` and `user-select`, both inherited properties, so they do reach
   * into the shadow tree. What they cannot do is win against a chrome rule:
   * the toolbox, dialogs and inspector set `cursor: pointer` on their own
   * elements, which beats an inherited value regardless of `!important`.
   * The mount-point write gives the chrome sheet a selector it can use to
   * override that from inside the boundary.
   *
   * `no-scroll` stays document-only -- scroll locking is genuinely a page
   * concern and there is nothing inside the shadow root to lock.
   */
  setGlobalState(name, on) {
    super.setGlobalState(name, on);
    if (name === "no-scroll") {
      return;
    }
    this.mountPoint().classList.toggle(`ce--${name}`, !!on);
  }
  // --- selection ----------------------------------------------------------
  /**
   * The first selected range, as a live Range, or null.
   *
   * Three engines answer this three different ways, which is why the chain
   * exists and why CI runs all three. What is NOT obvious -- and what a
   * probe against Chromium established -- is that the wrong branch does not
   * fail loudly. Called with the wrong shadow root, or with the older
   * bare-array signature it does not recognise, `getComposedRanges()`
   * returns a *retargeted* range pointing at the host's parent
   * (`BODY@2..3`) rather than throwing. So "the call did not throw" is
   * useless as a discriminator.
   *
   * Containment is the discriminator instead: a shadow-aware read is
   * trusted only when it lands inside this root. Each branch is tried and
   * validated, so an unrecognised signature costs a wasted call, never a
   * wrong caret.
   */
  getRange() {
    const rootSelection = typeof this.root.getSelection === "function" ? this.root.getSelection() : null;
    if (rootSelection && rootSelection.rangeCount > 0) {
      const range2 = rootSelection.getRangeAt(0);
      if (this._inRoot(range2.startContainer)) {
        return range2;
      }
    }
    const selection = this.getSelection();
    if (!selection) {
      return null;
    }
    if (typeof selection.getComposedRanges === "function") {
      const range2 = this._composedRange(selection);
      if (range2) {
        return range2;
      }
    }
    if (selection.rangeCount === 0) {
      return null;
    }
    const range = selection.getRangeAt(0);
    if (this._inRoot(range.startContainer)) {
      return range;
    }
    return this._scope === "shadow" ? null : range;
  }
  /** Try each getComposedRanges signature; return the first live Range that lands in this root. */
  _composedRange(selection) {
    const attempts = [
      () => selection.getComposedRanges({ shadowRoots: [this.root] }),
      () => selection.getComposedRanges(this.root)
    ];
    for (const attempt of attempts) {
      let staticRanges;
      try {
        staticRanges = attempt();
      } catch {
        continue;
      }
      if (!staticRanges || staticRanges.length === 0) {
        continue;
      }
      const staticRange = staticRanges[0];
      if (!this._inRoot(staticRange.startContainer)) {
        continue;
      }
      const range = this.createRange();
      range.setStart(staticRange.startContainer, staticRange.startOffset);
      range.setEnd(staticRange.endContainer, staticRange.endOffset);
      return range;
    }
    return null;
  }
  /**
   * Whether a node is inside this shadow root, crossing nested shadow
   * boundaries on the way up.
   *
   * `root.contains()` alone stops at a nested root, so an input inside a
   * dialog that itself uses a shadow root would read as foreign.
   */
  _inRoot(node) {
    let current = node;
    while (current) {
      if (current === this.root || this.root.contains(current)) {
        return true;
      }
      const parentRoot = current.getRootNode ? current.getRootNode() : null;
      current = parentRoot && parentRoot.host ? parentRoot.host : null;
    }
    return false;
  }
}
const chromeCSS = '/**\n * Local replacements for the handful of Bourbon mixins this project used.\n *\n * Bourbon existed here only to emit vendor prefixes for transform, transition,\n * animation, @keyframes, box-sizing, user-select and hyphens. All of those are\n * unprefixed standards in every browser this library targets, so the mixins are\n * gone and the properties are written directly -- except where a prefix is still\n * genuinely required (see `user-select` and `hyphens` below).\n */\n/**\n * The one Bourbon *variable* this project used, inlined verbatim from\n * bourbon/addons/_font-family.scss so the `pre` styling is unchanged.\n */\n/**\n * Contain floats. The one Bourbon mixin worth keeping as a mixin, since it\n * expands to a pseudo-element rather than a single declaration.\n */\n/**\n * Safari still requires -webkit-user-select; the -moz- and -ms- forms are long\n * obsolete and are not emitted.\n */\n/**\n * Safari still requires -webkit-hyphens.\n */\n/**\n * All widgets are assigned a z-index equal to or higher than this setting. The\n * base z-index can be adjusted to overcome z-index conflicts with existing page\n * elements.\n */\n/**\n * For UI widgets that appear on the page (as opposed to appearing in front of a\n * modal screen) we define a base background colour.\n */\n/**\n * The colour used when casting shadows for widgets that appear to float.\n */\n/**\n * Confirm, Cancel and Edit actions are common amoung the various ui components.\n * Each action has an associated/common colour.\n */\n/**\n * Tooltips feature for a number of components, their base appearance is\n * configured using a mixin.\n */\n/**\n * The following settings relate to typography. For portability we limit the the\n * use of fonts to:\n *\n * - `type-icon` used for displaying icons (courtesy of http://icomoon.io).\n * - `type-text` used for displaying text.\n *\n */\n/*\nThe widget CSS class should be applied any UI element that\'s insert into the DOM\nand not within a widget, the widget CSS class resets the style for of all\nsupported child elements.\n*/\n.ct-widget,\n.ct-widget * {\n  /* Reset */\n}\n.ct-widget div, .ct-widget span,\n.ct-widget iframe,\n.ct-widget a, .ct-widget b, .ct-widget i fieldset,\n.ct-widget form, .ct-widget label, .ct-widget legend,\n.ct-widget table, .ct-widget caption, .ct-widget tbody, .ct-widget tfoot, .ct-widget thead, .ct-widget tr, .ct-widget th, .ct-widget td,\n.ct-widget * div,\n.ct-widget * span,\n.ct-widget * iframe,\n.ct-widget * a,\n.ct-widget * b,\n.ct-widget * i fieldset,\n.ct-widget * form,\n.ct-widget * label,\n.ct-widget * legend,\n.ct-widget * table,\n.ct-widget * caption,\n.ct-widget * tbody,\n.ct-widget * tfoot,\n.ct-widget * thead,\n.ct-widget * tr,\n.ct-widget * th,\n.ct-widget * td {\n  border: 0;\n  font-size: 100%;\n  font: inherit;\n  margin: 0;\n  padding: 0;\n  vertical-align: baseline;\n}\n.ct-widget ol, .ct-widget ul,\n.ct-widget * ol,\n.ct-widget * ul {\n  list-style: none;\n}\n.ct-widget table,\n.ct-widget * table {\n  border-collapse: collapse;\n  border-spacing: 0;\n}\n.ct-widget,\n.ct-widget * {\n  /* Defaults */\n  box-sizing: border-box;\n}\n\n.ct-widget {\n  opacity: 0;\n  font-family: arial, sans-serif;\n  font-size: 14px;\n  line-height: 18px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  z-index: 9999;\n  transition-property: opacity;\n  transition-duration: 0.25s;\n  transition-timing-function: ease-in;\n}\n\n.ct-widget--active {\n  opacity: 1;\n  transition-property: opacity;\n  transition-duration: 0.25s;\n  transition-timing-function: ease-in;\n}\n\n/**\n * Attributes are similar to sections in that they are used to divide up\n * configuration blocks within a dialog\'s view. However attributes\n * exclusively support text inputs (no switches) and both the name and value of\n * an attribute can be modified (unlike sections where the label is fixed).\n */\n.ct-widget .ct-attribute {\n  border-bottom: 1px solid #eee;\n}\n.ct-widget .ct-attribute::after {\n  clear: both;\n  content: "";\n  display: table;\n}\n.ct-widget .ct-attribute {\n  height: 48px;\n  vertical-align: top;\n  /**\n   * Each section has a name and value component, both of which can be\n   * modified.\n   */\n}\n.ct-widget .ct-attribute__name {\n  background: #f6f6f6;\n  border: none;\n  color: #646464;\n  float: left;\n  height: 47px;\n  outline: none;\n  padding: 0 16px;\n  font-family: arial, sans-serif;\n  font-size: 14px;\n  line-height: 48px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  width: 25%;\n  /**\n   * If the the attributes name is invalid then the `invalid` modifier\n   * is set against the input (programmatically).\n   */\n}\n.ct-widget .ct-attribute__name--invalid {\n  color: #e74c3c;\n}\n.ct-widget .ct-attribute__value {\n  -webkit-appearance: none;\n  -moz-appearance: none;\n  appearance: none;\n  background: white;\n  border: none;\n  color: #646464;\n  float: right;\n  height: 47px;\n  outline: none;\n  padding: 0 16px;\n  font-family: arial, sans-serif;\n  font-size: 14px;\n  line-height: 48px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  width: 75%;\n}\n\n/**\n * Cropmarks define the region within an image that will be cropped. They appear\n * in the image dialog when crop is active.\n */\n.ct-widget .ct-crop-marks {\n  height: 320px;\n  left: 73px;\n  position: absolute;\n  top: 0;\n  width: 427px;\n  /**\n   * The clipper is used to prevent the rulers extending outside of the\n   * image.\n   */\n}\n.ct-widget .ct-crop-marks__clipper {\n  height: 100%;\n  overflow: hidden;\n  position: relative;\n  width: 100%;\n}\n.ct-widget .ct-crop-marks {\n  /**\n   * The cropping region is defined by 2 L shaped framing rulers at\n   * opposite corners.\n   */\n}\n.ct-widget .ct-crop-marks__ruler--top-left {\n  position: absolute;\n}\n.ct-widget .ct-crop-marks__ruler--top-left:after {\n  border: 1px solid rgba(255, 255, 255, 0.5);\n  border-bottom: none;\n  border-right: none;\n  box-shadow: -1px -1px 1px rgba(0, 0, 0, 0.25), inset 1px 1px 1px rgba(0, 0, 0, 0.25);\n  content: "";\n  height: 999px;\n  left: 0;\n  position: absolute;\n  top: 0;\n  width: 999px;\n}\n.ct-widget .ct-crop-marks__ruler--bottom-right {\n  position: absolute;\n}\n.ct-widget .ct-crop-marks__ruler--bottom-right:after {\n  border: 1px solid rgba(255, 255, 255, 0.5);\n  border-top: none;\n  border-left: none;\n  bottom: 0;\n  box-shadow: 1px 1px 1px rgba(0, 0, 0, 0.25), inset -1px -1px 1px rgba(0, 0, 0, 0.25);\n  content: "";\n  height: 999px;\n  position: absolute;\n  right: 0;\n  width: 999px;\n}\n.ct-widget .ct-crop-marks {\n  /**\n   * The rulers defing the crop region can be moved by the user, handles\n   * provide a draggable handle for each ruler.\n   */\n}\n.ct-widget .ct-crop-marks__handle {\n  background: #2980b9;\n  border: 1px solid rgb(25.2038868645%, 60.3782752039%, 83.4235641159%);\n  border-radius: 7px;\n  cursor: pointer;\n  height: 15px;\n  margin-left: -7px;\n  margin-top: -7px;\n  position: absolute;\n  width: 15px;\n}\n.ct-widget .ct-crop-marks__handle--bottom-right {\n  margin-left: -8px;\n  margin-top: -8px;\n}\n.ct-widget .ct-crop-marks__handle:hover {\n  background: rgb(17.8925906646%, 55.8597952455%, 80.7348603158%);\n}\n\n/**\n * The content tools library supports a number of dialogs for different types of\n * functionality (e.g insert an image, change a tables dimensions, etc).\n *\n * The dialog component itself sits above the page content (typically over a\n * modal.\n */\n/**\n * If the dialog is performing a remote task that requires the user to wait for\n * a response from the server then it may be set to a busy state. The busy state\n * uses an animation (a rotating cog) defined below.\n */\n@keyframes busy-dialog {\n  0% {\n    transform: translate(-50%, -50%) rotate(0deg);\n  }\n  100% {\n    transform: translate(-50%, -50%) rotate(359deg);\n  }\n}\n.ct-widget.ct-dialog {\n  background: white;\n  box-shadow: 0 8px 8px rgba(0, 0, 0, 0.35);\n  border-radius: 2px;\n  height: 480px;\n  left: 50%;\n  margin-left: -350px;\n  margin-top: -240px;\n  position: fixed;\n  top: 50%;\n  width: 700px;\n  z-index: 10099;\n  /**\n   * The `busy` modifier maybe programatically applied to a dialog to\n   * prevent any further interaction with the dialog until a task has been\n   * completed.\n   */\n}\n.ct-widget.ct-dialog--busy .ct-dialog__busy {\n  display: block;\n}\n.ct-widget.ct-dialog--busy .ct-dialog__body {\n  opacity: 0.1;\n}\n.ct-widget .ct-dialog {\n  /**\n   * The `header`, `caption` and `close` components of the dialog make up\n   * what might traditionally be thought of as a title bar for a window.\n   */\n}\n.ct-widget .ct-dialog__header {\n  color: rgb(64.2156862745%, 64.2156862745%, 64.2156862745%);\n  border-bottom: 1px solid #eee;\n  height: 48px;\n  padding: 0 16px;\n  position: relative;\n}\n.ct-widget .ct-dialog__caption {\n  font-family: arial, sans-serif;\n  font-size: 18px;\n  line-height: 48px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n.ct-widget .ct-dialog__close {\n  border-left: 1px solid #eee;\n  cursor: pointer;\n  height: 48px;\n  line-height: 48px;\n  position: absolute;\n  right: 0;\n  text-align: center;\n  top: 0;\n  font-family: "icon";\n  font-size: 16px;\n  font-style: normal;\n  font-weight: normal;\n  font-variant: normal;\n  speak: none;\n  text-transform: none;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  width: 48px;\n}\n.ct-widget .ct-dialog__close:before {\n  content: "\\ea0f";\n}\n.ct-widget .ct-dialog__close:hover:before {\n  color: #646464;\n}\n.ct-widget .ct-dialog {\n  /**\n   * The dialog `body` is typically composed of a `view` and `controls`\n   * component. The `view` component contains the dialogs content (e.g an\n   * image) and the `controls` component the controls (e.g crop, rotate,\n   * insert).\n   */\n}\n.ct-widget .ct-dialog__body {\n  margin: auto;\n  width: 572px;\n}\n.ct-widget .ct-dialog__view {\n  height: 320px;\n  margin-top: 32px;\n}\n.ct-widget .ct-dialog__controls::after {\n  clear: both;\n  content: "";\n  display: table;\n}\n.ct-widget .ct-dialog__controls {\n  margin-top: 16px;\n}\n.ct-widget .ct-dialog {\n  /**\n   * If the dialog is in a busy state then the `busy` component is\n   * displayed.\n   */\n}\n.ct-widget .ct-dialog__busy {\n  display: none;\n  position: absolute;\n}\n.ct-widget .ct-dialog__busy:before {\n  animation: busy-dialog 5s linear;\n  animation-iteration-count: infinite;\n  animation-fill-mode: forwards;\n  color: rgb(64.2156862745%, 64.2156862745%, 64.2156862745%);\n  content: "\\e994";\n  left: 50%;\n  position: fixed;\n  top: 50%;\n  font-family: "icon";\n  font-size: 80px;\n  font-style: normal;\n  font-weight: normal;\n  font-variant: normal;\n  speak: none;\n  text-transform: none;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n.ct-widget {\n  /**\n   * The controls section of the dialog features icon and text buttons which\n   * provide the user with controls for the contents dialog.\n   */\n  /**\n   * Controls can be grouped left, right or centrally. Both a left and right\n   * group can coexist but the central group can only be used on it\'s own.\n   */\n}\n.ct-widget .ct-control-group {\n  font-size: 0;\n}\n.ct-widget .ct-control-group--center {\n  text-align: center;\n}\n.ct-widget .ct-control-group--left {\n  float: left;\n}\n.ct-widget .ct-control-group--right {\n  float: right;\n}\n.ct-widget {\n  /**\n   * Controls can either contain text or an icon depending on the modifier\n   * set against the component (`text` or `icon` respectively).\n   */\n}\n.ct-widget .ct-control {\n  margin-left: 16px;\n  position: relative;\n}\n.ct-widget .ct-control:first-child {\n  margin-left: 0;\n}\n.ct-widget .ct-control--icon {\n  border-radius: 2px;\n  color: rgb(64.2156862745%, 64.2156862745%, 64.2156862745%);\n  cursor: pointer;\n  display: inline-block;\n  height: 32px;\n  line-height: 32px;\n  text-align: center;\n  font-family: "icon";\n  font-size: 16px;\n  font-style: normal;\n  font-weight: normal;\n  font-variant: normal;\n  speak: none;\n  text-transform: none;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n.ct-widget .ct-control--icon:after {\n  background: black;\n  border-radius: 2px;\n  color: white;\n  content: attr(data-ct-tooltip);\n  display: block;\n  -webkit-hyphens: auto;\n  hyphens: auto;\n  left: calc(0 - (85px - 32px) / 2);\n  line-height: 20px;\n  opacity: 0;\n  padding: 0 8px;\n  pointer-events: none;\n  position: absolute;\n  bottom: 37px;\n  font-family: arial, sans-serif;\n  font-size: 12px;\n  line-height: 20px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  visibility: hidden;\n  width: 85px;\n  word-break: break-word;\n}\n.ct-widget .ct-control--icon:hover:after {\n  opacity: 0.8;\n  visibility: visible;\n  transition-property: opacity;\n  transition-duration: 0s;\n  transition-timing-function: ease-in;\n  transition-delay: 2s;\n}\n.ct-widget .ct-control--icon {\n  width: 32px;\n}\n.ct-widget .ct-control--icon:before {\n  content: "";\n}\n.ct-widget .ct-control--icon:hover {\n  background: #eee;\n  color: #646464;\n}\n.ct-widget .ct-control--active, .ct-widget .ct-control--on {\n  background: rgb(64.2156862745%, 64.2156862745%, 64.2156862745%);\n  color: white;\n}\n.ct-widget .ct-control--active:hover, .ct-widget .ct-control--on:hover {\n  background: #646464;\n  color: white;\n}\n.ct-widget .ct-control--rotate-ccw:before {\n  content: "\\e965";\n}\n.ct-widget .ct-control--rotate-cw:before {\n  content: "\\e966";\n}\n.ct-widget .ct-control--crop:before {\n  content: "\\ea57";\n}\n.ct-widget .ct-control--remove:before {\n  content: "\\e9ac";\n}\n.ct-widget .ct-control--styles:before {\n  content: "\\e90b";\n}\n.ct-widget .ct-control--attributes:before {\n  content: "\\e994";\n}\n.ct-widget .ct-control--code:before {\n  content: "\\ea80";\n}\n.ct-widget .ct-control--icon.ct-control--muted {\n  cursor: default;\n}\n.ct-widget .ct-control--icon.ct-control--muted:before {\n  opacity: 0.5;\n}\n.ct-widget .ct-control--icon.ct-control--muted:hover {\n  color: rgb(64.2156862745%, 64.2156862745%, 64.2156862745%);\n  background: transparent;\n}\n.ct-widget .ct-control--text {\n  background: #2980b9;\n  border-radius: 2px;\n  color: white;\n  cursor: pointer;\n  display: inline-block;\n  font-weight: bold;\n  height: 32px;\n  overflow: hidden;\n  padding: 0 8px;\n  text-align: center;\n  text-overflow: ellipsis;\n  font-family: arial, sans-serif;\n  font-size: 14px;\n  line-height: 32px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  vertical-align: top;\n  width: 100px;\n}\n.ct-widget .ct-control--text:hover {\n  background: rgb(17.8925906646%, 55.8597952455%, 80.7348603158%);\n}\n.ct-widget .ct-control--apply, .ct-widget .ct-control--insert, .ct-widget .ct-control--ok {\n  background: #27ae60;\n}\n.ct-widget .ct-control--apply:hover, .ct-widget .ct-control--insert:hover, .ct-widget .ct-control--ok:hover {\n  background: rgb(17.1251035626%, 76.4043082022%, 42.1541010771%);\n}\n.ct-widget .ct-control--cancel, .ct-widget .ct-control--clear {\n  background: #e74c3c;\n}\n.ct-widget .ct-control--cancel:hover, .ct-widget .ct-control--clear:hover {\n  background: rgb(91.6841257051%, 37.9774375504%, 32.4335213537%);\n}\n.ct-widget .ct-control--text.ct-control--muted {\n  background: #ccc;\n  cursor: default;\n}\n.ct-widget .ct-control--text.ct-control--muted:hover {\n  background: #ccc;\n}\n.ct-widget .ct-control--upload {\n  overflow: hidden;\n}\n.ct-widget {\n  /**\n   * The following classes relate to the various types of dialog available.\n   */\n  /**\n   * The image dialog supports the insertion of images, the dialog has a\n   * number of states to support the various steps in inserting an image.\n   */\n}\n.ct-widget.ct-image-dialog--empty .ct-progress-bar,\n.ct-widget.ct-image-dialog--empty .ct-control--rotate-ccw,\n.ct-widget.ct-image-dialog--empty .ct-control--rotate-cw,\n.ct-widget.ct-image-dialog--empty .ct-control--crop,\n.ct-widget.ct-image-dialog--empty .ct-control--insert,\n.ct-widget.ct-image-dialog--empty .ct-control--cancel,\n.ct-widget.ct-image-dialog--empty .ct-control--clear {\n  display: none;\n}\n.ct-widget.ct-image-dialog--uploading .ct-control--rotate-ccw,\n.ct-widget.ct-image-dialog--uploading .ct-control--rotate-cw,\n.ct-widget.ct-image-dialog--uploading .ct-control--crop,\n.ct-widget.ct-image-dialog--uploading .ct-control--upload,\n.ct-widget.ct-image-dialog--uploading .ct-control--insert,\n.ct-widget.ct-image-dialog--uploading .ct-control--clear {\n  display: none;\n}\n.ct-widget.ct-image-dialog--populated .ct-progress-bar,\n.ct-widget.ct-image-dialog--populated .ct-control--upload,\n.ct-widget.ct-image-dialog--populated .ct-control--cancel {\n  display: none;\n}\n.ct-widget .ct-image-dialog__view {\n  background: #eee;\n  position: relative;\n}\n.ct-widget .ct-image-dialog__view:empty {\n  font-family: "icon";\n  font-size: 80px;\n  font-style: normal;\n  font-weight: normal;\n  font-variant: normal;\n  speak: none;\n  text-transform: none;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  line-height: 320px;\n  text-align: center;\n}\n.ct-widget .ct-image-dialog__view:empty:before {\n  color: white;\n  content: "\\e90d";\n}\n.ct-widget .ct-image-dialog__image {\n  background-color: transparent;\n  background-position: center center;\n  background-repeat: no-repeat;\n  background-size: contain;\n  height: 100%;\n  width: 100%;\n}\n.ct-widget .ct-image-dialog {\n  /**\n   * HACK: We style the file upload button as a control, however to ensure\n   * the user activates the system file browser dialog we hide the file\n   * input in the control and use a large font to ensure it covers the\n   * whole control.\n   */\n}\n.ct-widget .ct-image-dialog__file-upload {\n  cursor: pointer;\n  font-size: 400px;\n  left: 0;\n  opacity: 0;\n  position: absolute;\n  top: 0;\n}\n.ct-widget {\n  /**\n   * The properties dialog displays the attributes and styles for an element\n   * in page, each property can by modified and each style turned on or off.\n   */\n}\n.ct-widget.ct-properties-dialog--attributes .ct-properties-dialog__attributes {\n  display: block;\n}\n.ct-widget.ct-properties-dialog--styles .ct-properties-dialog__styles {\n  display: block;\n}\n.ct-widget.ct-properties-dialog--styles .ct-properties-dialog__styles:empty:before {\n  color: rgb(64.2156862745%, 64.2156862745%, 64.2156862745%);\n  content: attr(data-ct-empty);\n  display: block;\n  font-style: italic;\n  margin-top: 20px;\n  text-align: center;\n}\n.ct-widget.ct-properties-dialog--code .ct-properties-dialog__code {\n  display: block;\n}\n.ct-widget .ct-properties-dialog__view {\n  border: 1px solid #ddd;\n  overflow: auto;\n}\n.ct-widget .ct-properties-dialog__attributes, .ct-widget .ct-properties-dialog__code, .ct-widget .ct-properties-dialog__styles {\n  display: none;\n}\n.ct-widget .ct-properties-dialog {\n  /**\n   * The code tab supports an textarea for editing inner HTML.\n   */\n}\n.ct-widget .ct-properties-dialog__inner-html {\n  border: none;\n  display: block;\n  font-family: courier, "Bitstream Vera Sans Mono", Consolas, Courier, monospace;\n  height: 318px;\n  padding: 16px;\n  outline: none;\n  resize: none;\n  width: 100%;\n}\n.ct-widget .ct-properties-dialog__inner-html--invalid {\n  color: #e74c3c;\n}\n.ct-widget {\n  /**\n   * The table dialog supports the insertion and updating of tables.\n   */\n}\n.ct-widget .ct-table-dialog__view {\n  border: 1px solid #ddd;\n  overflow: auto;\n}\n.ct-widget {\n  /**\n   * The video dialog supports the insertion of embedded videos (vimeo and\n   * youtube).\n   */\n}\n.ct-widget .ct-video-dialog__preview:empty {\n  background: #eee;\n  font-family: "icon";\n  font-size: 80px;\n  font-style: normal;\n  font-weight: normal;\n  font-variant: normal;\n  speak: none;\n  text-transform: none;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  line-height: 320px;\n  text-align: center;\n}\n.ct-widget .ct-video-dialog__preview:empty:before {\n  color: white;\n  content: "\\ea98";\n}\n.ct-widget .ct-video-dialog__input {\n  border: none;\n  border-bottom: 1px solid #eee;\n  height: 32px;\n  line-height: 32px;\n  outline: none;\n  padding: 0 4px;\n  font-family: arial, sans-serif;\n  font-size: 14px;\n  line-height: 18px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  vertical-align: top;\n  width: 456px;\n}\n.ct-widget .ct-video-dialog__input:focus {\n  border-bottom: 1px solid rgb(88.3333333333%, 88.3333333333%, 88.3333333333%);\n}\n.ct-widget {\n  /**\n   * Anchored dialogs are a special type of dialog that are appear at a fixed\n   * position with the page, for example above a selection of text. They are\n   * used to support simple task (such as inserting a link) in a less\n   * intrusive mannor than full dialogs.\n   *\n   * Anchored dialogs support an single text input and a confirm button only.\n   */\n}\n.ct-widget.ct-anchored-dialog {\n  border-bottom: 2px solid #27ae60;\n  box-shadow: 0 3px 3px rgba(0, 0, 0, 0.35);\n  font-size: 0;\n  height: 34px;\n  left: 0;\n  margin-left: -160px;\n  margin-top: -48px;\n  position: absolute;\n  top: 0;\n  width: 320px;\n  z-index: 10099;\n}\n.ct-widget.ct-anchored-dialog:after {\n  border: 16px solid rgba(255, 255, 255, 0);\n  border-top-color: #27ae60;\n  content: "";\n  left: 144px;\n  position: absolute;\n  top: 34px;\n}\n.ct-widget .ct-anchored-dialog__input {\n  border: none;\n  color: #646464;\n  height: 32px;\n  outline: none;\n  font-family: arial, sans-serif;\n  font-size: 14px;\n  line-height: 32px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  padding: 0 8px 0 16px;\n  vertical-align: top;\n  width: 256px;\n}\n.ct-widget .ct-anchored-dialog__button {\n  background: #27ae60;\n  cursor: pointer;\n  display: inline-block;\n  height: 32px;\n  line-height: 32px;\n  text-align: center;\n  font-family: "icon";\n  font-size: 16px;\n  font-style: normal;\n  font-weight: normal;\n  font-variant: normal;\n  speak: none;\n  text-transform: none;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  width: 32px;\n}\n.ct-widget .ct-anchored-dialog__button:before {\n  color: white;\n  content: "\\ea10";\n}\n.ct-widget .ct-anchored-dialog__button:hover {\n  background: rgb(17.1251035626%, 76.4043082022%, 42.1541010771%);\n}\n.ct-widget .ct-anchored-dialog__target-button {\n  background: white;\n  cursor: pointer;\n  display: inline-block;\n  height: 32px;\n  line-height: 32px;\n  text-align: center;\n  font-family: "icon";\n  font-size: 16px;\n  font-style: normal;\n  font-weight: normal;\n  font-variant: normal;\n  speak: none;\n  text-transform: none;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  width: 32px;\n}\n.ct-widget .ct-anchored-dialog__target-button:before {\n  color: rgb(64.2156862745%, 64.2156862745%, 64.2156862745%);\n  content: "\\ea7d";\n}\n.ct-widget .ct-anchored-dialog__target-button:hover:before {\n  color: rgb(69.2156862745%, 69.2156862745%, 69.2156862745%);\n}\n.ct-widget .ct-anchored-dialog__target-button--active:before {\n  color: #27ae60;\n}\n.ct-widget .ct-anchored-dialog__target-button--active:hover:before {\n  color: rgb(17.1251035626%, 76.4043082022%, 42.1541010771%);\n}\n\n/**\n * Flashes are used to display a visual confirmation to the user that an action\n * has completed successfully (or failed).\n */\n.ct-widget {\n  /**\n   * The flash animation displays an icon in the center of the user\'s screen\n   * that flashes into view and then out.\n   */\n}\n@keyframes flash {\n  0% {\n    opacity: 0;\n    font-size: 32px;\n  }\n  25% {\n    font-size: 320px;\n    opacity: 1;\n  }\n  50% {\n    font-size: 320px;\n    opacity: 1;\n  }\n  75% {\n    font-size: 320px;\n    opacity: 1;\n  }\n  100% {\n    opacity: 0;\n  }\n}\n.ct-widget {\n  /**\n   * The flash timer animation is used purely to indicated to the Javascript\n   * that created the flash element that the animation has finished.\n   */\n}\n@keyframes flash-timer {\n  0% {\n    opacity: 1;\n  }\n  99% {\n    opacity: 1;\n  }\n  100% {\n    opacity: 0;\n  }\n}\n.ct-widget {\n  /**\n   * The icon that is flashed.\n   */\n}\n.ct-widget.ct-flash {\n  color: rgba(255, 255, 255, 0.9);\n  height: 0;\n  left: 0;\n  position: fixed;\n  font-family: "icon";\n  font-size: 16px;\n  font-style: normal;\n  font-weight: normal;\n  font-variant: normal;\n  speak: none;\n  text-transform: none;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  top: 0;\n  width: 0;\n  z-index: 10999;\n}\n.ct-widget.ct-flash:before {\n  left: 50%;\n  opacity: 0;\n  position: fixed;\n  text-shadow: 0 0 20px rgba(0, 0, 0, 0.5);\n  top: 50%;\n  transform: translate(-50%, -50%);\n}\n.ct-widget.ct-flash--active {\n  animation: flash-timer 2s ease-in;\n  animation-iteration-count: 1;\n  animation-fill-mode: forwards;\n}\n.ct-widget.ct-flash--active:before {\n  animation: flash 2s ease-in;\n  animation-iteration-count: 1;\n  animation-fill-mode: forwards;\n  font-size: 320px;\n  opacity: 1;\n}\n.ct-widget.ct-flash {\n  /**\n   * Modifiers that can be applied to the flash to change it\'s appearance.\n   */\n}\n.ct-widget.ct-flash--ok:before {\n  content: "\\ea10";\n}\n.ct-widget.ct-flash--no:before {\n  content: "\\ea0f";\n}\n\n/**\n * Grip\'s provide a visual hint to the user that they can use the mouse to drag\n * an item (for example the toolbar has a grip that can be used to drag it to a\n * new location.\n */\n.ct-widget .ct-grip {\n  cursor: move;\n  font-size: 0;\n  text-align: center;\n  -webkit-user-select: none;\n  user-select: none;\n  /**\n   * Grips consist of one or more bumps, elements that appear to be sunk\n   * or raised and therefore provide grip.\n   */\n}\n.ct-widget .ct-grip__bump {\n  background: rgba(70, 70, 70, 0.15);\n  border-radius: 12px;\n  display: inline-block;\n  height: 12px;\n  margin-left: 12px;\n  width: 12px;\n}\n.ct-widget .ct-grip__bump:first-child {\n  margin-left: 0;\n}\n\n/**\n * The ignition switch is how users start and stop editing the page.\n */\n/**\n * If the app is performing a remote task that requires the user to wait for\n * a response from the server then the ignition may be set to a busy state. The\n * busy state uses an animation (a rotating cog) defined below.\n */\n@keyframes busy-ignition {\n  0% {\n    transform: rotate(0deg);\n  }\n  100% {\n    transform: rotate(359deg);\n  }\n}\n.ct-widget.ct-ignition {\n  /**\n   * Position of the switch on the page\n   */\n  left: 16px;\n  position: fixed;\n  top: 16px;\n  /**\n   * Depending on the current state of the switch we show either the edit\n   * button (page ready to edit), or the confirm and cancel buttons (\n   * page currently being edited).\n   */\n}\n.ct-widget.ct-ignition .ct-ignition__button {\n  display: none;\n}\n.ct-widget.ct-ignition--editing .ct-ignition__button--confirm,\n.ct-widget.ct-ignition--editing .ct-ignition__button--cancel {\n  display: block;\n}\n.ct-widget.ct-ignition--ready .ct-ignition__button--edit {\n  display: block;\n}\n.ct-widget.ct-ignition--busy .ct-ignition__button {\n  display: none;\n}\n.ct-widget.ct-ignition--busy .ct-ignition__button--busy {\n  display: block;\n}\n.ct-widget .ct-ignition {\n  /**\n   * The ignition switch is constructed of 3 buttons, edit, confirm and\n   * cancel.\n   */\n}\n.ct-widget .ct-ignition__button {\n  border-radius: 50%;\n  content: "";\n  cursor: pointer;\n  display: block;\n  height: 48px;\n  line-height: 48px;\n  opacity: 0.9;\n  position: absolute;\n  text-align: center;\n  font-family: "icon";\n  font-size: 24px;\n  font-style: normal;\n  font-weight: normal;\n  font-variant: normal;\n  speak: none;\n  text-transform: none;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  width: 48px;\n}\n.ct-widget .ct-ignition__button:before {\n  color: white;\n}\n.ct-widget .ct-ignition__button {\n  /* Busy button */\n}\n.ct-widget .ct-ignition__button--busy {\n  animation: busy-ignition 5s linear;\n  animation-iteration-count: infinite;\n  animation-fill-mode: forwards;\n  background: #646464;\n  cursor: default;\n}\n.ct-widget .ct-ignition__button--busy:before {\n  content: "\\e994";\n}\n.ct-widget .ct-ignition__button--busy:hover {\n  background: #646464;\n}\n.ct-widget .ct-ignition__button {\n  /* Confirm button */\n}\n.ct-widget .ct-ignition__button--confirm {\n  background: #27ae60;\n}\n.ct-widget .ct-ignition__button--confirm:before {\n  content: "\\ea10";\n}\n.ct-widget .ct-ignition__button--confirm:hover {\n  background: rgb(17.1251035626%, 76.4043082022%, 42.1541010771%);\n}\n.ct-widget .ct-ignition__button {\n  /* Cancel button */\n}\n.ct-widget .ct-ignition__button--cancel {\n  background: #e74c3c;\n  left: 64px;\n}\n.ct-widget .ct-ignition__button--cancel:before {\n  content: "\\ea0f";\n}\n.ct-widget .ct-ignition__button--cancel:hover {\n  background: rgb(91.6841257051%, 37.9774375504%, 32.4335213537%);\n}\n.ct-widget .ct-ignition__button {\n  /* Edit button */\n}\n.ct-widget .ct-ignition__button--edit {\n  background: #2980b9;\n  /**\n   * Unlike the confirm and cancel buttons we rotate the edit\n   * button\'s pencil icon on mouse over to add a sense of\n   * purpose :)\n   */\n}\n.ct-widget .ct-ignition__button--edit:before {\n  content: "\\e905";\n  transition-property: transform;\n  transition-duration: 0.1s;\n  transition-timing-function: ease-in;\n}\n.ct-widget .ct-ignition__button--edit:hover {\n  background: rgb(17.8925906646%, 55.8597952455%, 80.7348603158%);\n}\n.ct-widget .ct-ignition__button--edit:hover:before {\n  display: inline-block;\n  transform: rotate(-15deg);\n}\n\n/**\n * The inspector provides a breadcrumb style path (constructured from tags) for\n * the currently selected element and its parent/ancestor tags.\n *\n * Tags can be selected which triggers the properties dialog. This allows\n * elements which typically can\'t be directly selected using the editor to be\n * modified.\n */\n.ct-widget.ct-inspector {\n  background: rgba(233, 233, 233, 0.2);\n  border-top: 1px solid rgba(255, 255, 255, 0.1);\n  bottom: 0;\n  height: 32px;\n  left: 0;\n  overflow: hidden;\n  padding: 3px 16px 0;\n  position: fixed;\n  width: 100%;\n}\n.ct-widget {\n  /**\n   * The inspector bar is consists of a list of one or more tags, each tag\n   * represents an element in the lineage between the currently selected\n   * element and the top level element it is defined within, e.g for a table\n   * division the path might look like this:\n   *\n   * table > tbody > tr > td\n   */\n}\n.ct-widget .ct-inspector__tags::after {\n  clear: both;\n  content: "";\n  display: table;\n}\n.ct-widget .ct-inspector__tags {\n  width: calc(100% - 128px);\n}\n.ct-widget .ct-inspector__tags:before {\n  color: #464646;\n  content: "\\ea80";\n  display: block;\n  float: left;\n  height: 24px;\n  line-height: 24px;\n  margin-right: 16px;\n  text-align: center;\n  font-family: "icon";\n  font-size: 16px;\n  font-style: normal;\n  font-weight: normal;\n  font-variant: normal;\n  speak: none;\n  text-transform: none;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  width: 24px;\n}\n.ct-widget .ct-inspector__counter {\n  border-left: 1px solid rgba(0, 0, 0, 0.1);\n  height: 24px;\n  line-height: 24px;\n  margin-right: 16px;\n  position: absolute;\n  right: 0;\n  text-align: right;\n  top: 3px;\n  width: 128px;\n}\n.ct-widget .ct-tag {\n  background-color: #2980b9;\n  border-radius: 2px 0 0 2px;\n  color: white;\n  cursor: pointer;\n  float: left;\n  font-weight: bold;\n  height: 24px;\n  line-height: 24px;\n  margin-left: 24px;\n  padding: 0 8px;\n  position: relative;\n  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);\n}\n.ct-widget .ct-tag:after {\n  border-style: solid;\n  border-bottom: 12px solid rgba(255, 0, 0, 0);\n  border-left: 12px solid #2980b9;\n  border-right: none;\n  border-top: 12px solid rgba(255, 0, 0, 0);\n  content: "";\n  display: block;\n  height: 24px;\n  bottom: 0;\n  right: -24px;\n  position: absolute;\n  width: 24px;\n  -moz-transform: scale(0.9999);\n}\n.ct-widget .ct-tag:first-child {\n  margin-left: 0;\n}\n.ct-widget .ct-tag:hover {\n  background-color: rgb(28.8858807121%, 63.9174665682%, 87.3886290918%);\n}\n.ct-widget .ct-tag:hover:after {\n  border-left-color: rgb(28.8858807121%, 63.9174665682%, 87.3886290918%);\n}\n.ct-widget .ct-tag:nth-child(1) {\n  background-color: #8e44ad;\n}\n.ct-widget .ct-tag:nth-child(1):after {\n  border-left-color: #8e44ad;\n}\n.ct-widget .ct-tag:nth-child(1):hover {\n  background-color: rgb(60.7737368806%, 31.4530957611%, 73.0567081604%);\n}\n.ct-widget .ct-tag:nth-child(1):hover:after {\n  border-left-color: rgb(60.7737368806%, 31.4530957611%, 73.0567081604%);\n}\n.ct-widget .ct-tag:nth-child(2) {\n  background-color: #2980b9;\n}\n.ct-widget .ct-tag:nth-child(2):after {\n  border-left-color: #2980b9;\n}\n.ct-widget .ct-tag:nth-child(2):hover {\n  background-color: rgb(17.8925906646%, 55.8597952455%, 80.7348603158%);\n}\n.ct-widget .ct-tag:nth-child(2):hover:after {\n  border-left-color: rgb(17.8925906646%, 55.8597952455%, 80.7348603158%);\n}\n.ct-widget .ct-tag:nth-child(3) {\n  background-color: #27ae60;\n}\n.ct-widget .ct-tag:nth-child(3):after {\n  border-left-color: #27ae60;\n}\n.ct-widget .ct-tag:nth-child(3):hover {\n  background-color: rgb(17.1251035626%, 76.4043082022%, 42.1541010771%);\n}\n.ct-widget .ct-tag:nth-child(3):hover:after {\n  border-left-color: rgb(17.1251035626%, 76.4043082022%, 42.1541010771%);\n}\n.ct-widget .ct-tag:nth-child(4) {\n  background-color: #d35400;\n}\n.ct-widget .ct-tag:nth-child(4):after {\n  border-left-color: #d35400;\n}\n.ct-widget .ct-tag:nth-child(4):hover {\n  background-color: rgb(92.7450980392%, 36.9222191246%, 0%);\n}\n.ct-widget .ct-tag:nth-child(4):hover:after {\n  border-left-color: rgb(92.7450980392%, 36.9222191246%, 0%);\n}\n.ct-widget .ct-tag:nth-child(5) {\n  background-color: #f39c12;\n}\n.ct-widget .ct-tag:nth-child(5):after {\n  border-left-color: #f39c12;\n}\n.ct-widget .ct-tag:nth-child(5):hover {\n  background-color: rgb(95.7760453579%, 65.1523742027%, 16.5768958186%);\n}\n.ct-widget .ct-tag:nth-child(5):hover:after {\n  border-left-color: rgb(95.7760453579%, 65.1523742027%, 16.5768958186%);\n}\n.ct-widget .ct-tag:nth-child(6) {\n  background-color: #16a085;\n}\n.ct-widget .ct-tag:nth-child(6):after {\n  border-left-color: #16a085;\n}\n.ct-widget .ct-tag:nth-child(6):hover {\n  background-color: rgb(9.8362421892%, 71.5363068304%, 59.4645550528%);\n}\n.ct-widget .ct-tag:nth-child(6):hover:after {\n  border-left-color: rgb(9.8362421892%, 71.5363068304%, 59.4645550528%);\n}\n\n/**\n * The modal widget provides a layer over the page limiting interaction to just\n * the components positioned above the layer. This is commonly used when\n * displaying a dialog, for example if we\'re editing a table\'s properties then\n * the modal ensures the user can\'t change the element selected on the page\n * while the dialog is open.\n */\n.ct-widget.ct-modal {\n  background: rgba(0, 0, 0, 0.7);\n  height: 0;\n  left: 0;\n  position: fixed;\n  top: 0;\n  width: 0;\n  z-index: 10009;\n}\n.ct-widget.ct-modal--transparent {\n  background: transparent;\n}\n\n.ct-widget--active.ct-modal {\n  height: 100%;\n  width: 100%;\n}\n\n/**\n * The progress bar appears in dialogs (such as the image dialog) and provides\n * feedback to the user on a task (such as uploading an image).\n */\n.ct-widget .ct-progress-bar {\n  border: 1px solid #eee;\n  height: 32px;\n  line-height: 32px;\n  padding: 1px;\n  width: 456px;\n  /**\n   * Note: The width of the progress bar should be set (as a percentage)\n   * programatially, e.g `progressBarDOM.style.width = \'50%\'`.\n   */\n}\n.ct-widget .ct-progress-bar__progress {\n  background: #2980b9;\n  height: 28px;\n}\n\n/**\n * Sections are used to divide up configuration blocks within a dialog\'s view.\n * They contain wither a switch or an input, for example the table dialog has\n * header (switch), body (input - e.g number of columns) and footer (switch)\n * sections.\n */\n.ct-widget .ct-section {\n  border-bottom: 1px solid #eee;\n}\n.ct-widget .ct-section::after {\n  clear: both;\n  content: "";\n  display: table;\n}\n.ct-widget .ct-section {\n  color: rgb(74.2156862745%, 74.2156862745%, 74.2156862745%);\n  cursor: pointer;\n  font-style: italic;\n  height: 48px;\n  padding: 0 16px;\n  font-family: arial, sans-serif;\n  font-size: 16px;\n  line-height: 48px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n.ct-widget .ct-section:hover {\n  background: #f6f6f6;\n}\n.ct-widget .ct-section {\n  /**\n   * If the section is a switch then the `applied` modifier is set when\n   * the switch is on.\n   */\n}\n.ct-widget .ct-section--applied {\n  color: #646464;\n  font-style: normal;\n}\n.ct-widget .ct-section--applied .ct-section__switch {\n  background-color: #27ae60;\n  border: 1px solid rgb(11.6321458161%, 51.8972659486%, 28.6329743165%);\n}\n.ct-widget .ct-section--applied .ct-section__switch:before {\n  left: 25px;\n  transition-property: left;\n  transition-duration: 0.1s;\n  transition-timing-function: ease-in;\n}\n.ct-widget .ct-section {\n  /**\n   * If the section contains an input field the `contains-input` modifier\n   * is set.\n   */\n}\n.ct-widget .ct-section--contains-input .ct-section__label {\n  width: 75%;\n}\n.ct-widget .ct-section {\n  /**\n   * Each section has a label describing the purpose of the switch or\n   * input within the section.\n   */\n}\n.ct-widget .ct-section__label {\n  float: left;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  width: 472px;\n  white-space: nowrap;\n}\n.ct-widget .ct-section__switch {\n  background-color: #ccc;\n  border: 1px solid rgb(70%, 70%, 70%);\n  border-radius: 12px;\n  box-shadow: inset 0px 0 2px rgba(0, 0, 0, 0.1);\n  float: right;\n  height: 24px;\n  margin-top: 12px;\n  position: relative;\n  width: 48px;\n}\n.ct-widget .ct-section__switch:before {\n  background: white;\n  border-radius: 10px;\n  content: "";\n  height: 20px;\n  left: 1px;\n  position: absolute;\n  top: 1px;\n  transition-property: left;\n  transition-duration: 0.1s;\n  transition-timing-function: ease-in;\n  width: 20px;\n}\n.ct-widget .ct-section__input {\n  background: white;\n  border: none;\n  color: #646464;\n  float: right;\n  height: 47px;\n  outline: none;\n  padding: 0 16px;\n  text-align: right;\n  font-family: arial, sans-serif;\n  font-size: 14px;\n  line-height: 48px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  width: 25%;\n  /**\n   * If the contents of the sections input is invalid then the\n   * `invalid` modifier is set against the input (programmatically).\n   */\n}\n.ct-widget .ct-section__input--invalid {\n  color: #e74c3c;\n}\n\n/**\n * The toolbox widget displays a set of tools the user can use to edit the\n * content of the page.\n */\n.ct-widget {\n  /**\n   * Define the spacing for the toolbox:\n   *\n   * spacing / 1 = the padding around the contents of the toolbox.\n   * spacing / 1 = the vertical padding around the toolbox\'s grip.\n   * spacing / 2 = the margin between each tool.\n   * spacing / 2 = the vertical padding around each tool group.\n   */\n  /**\n   * The size of a tool.\n   */\n}\n.ct-widget.ct-toolbox {\n  /**\n   * The position of the toolbox is typically determined by the position\n   * the user last placed it (this information is stored in local\n   * storage). However we set a default position for the first time the\n   * toolbox is displayed.\n   */\n  background: rgba(233, 233, 233, 0.9);\n  border: 1px solid rgba(255, 255, 255, 0.5);\n  box-shadow: 0 3px 3px rgba(0, 0, 0, 0.35);\n  padding: 8px;\n  position: fixed;\n  bottom: 48px;\n  right: 16px;\n  width: 138px;\n  /**\n   * When the toolbox is being dragged to a new position by the user the\n   * dragging modifier is applied. Whilst being dragged we reduce the\n   * opacity of the toolbox to make it easier for the user to see the\n   * content being dragged over.\n   */\n}\n.ct-widget.ct-toolbox--dragging {\n  opacity: 0.5;\n}\n.ct-widget {\n  /**\n   * The grip is positioned at the top of the toolbox. If the user clicks and\n   * holds the mouse down whilst over the grip then the toolbox will be\n   * draggable until they release the mouse button.\n   */\n}\n.ct-widget .ct-toolbox__grip {\n  padding: 8px 0;\n}\n.ct-widget {\n  /**\n   * Tools are organized into groups of related tools.\n   */\n}\n.ct-widget .ct-tool-group {\n  /**\n   * Tools are floated to align horizontally so each group must clear its\n   * children.\n   */\n}\n.ct-widget .ct-tool-group::after {\n  clear: both;\n  content: "";\n  display: table;\n}\n.ct-widget .ct-tool-group {\n  padding: 4px 0;\n}\n.ct-widget .ct-tool-group:first-child {\n  padding-top: 0;\n}\n.ct-widget {\n  /**\n   * The toolbox features a set of tools for editing the page content.\n   */\n}\n.ct-widget .ct-tool {\n  border-radius: 2px;\n  color: #464646;\n  cursor: pointer;\n  float: left;\n  height: 32px;\n  margin: 4px;\n  margin-right: 4px;\n  position: relative;\n  text-align: center;\n  font-family: "icon";\n  font-size: 16px;\n  font-style: normal;\n  font-weight: normal;\n  font-variant: normal;\n  speak: none;\n  text-transform: none;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n.ct-widget .ct-tool:after {\n  background: black;\n  border-radius: 2px;\n  color: white;\n  content: attr(data-ct-tooltip);\n  display: block;\n  -webkit-hyphens: auto;\n  hyphens: auto;\n  left: calc(0 - (85px - 32px) / 2);\n  line-height: 20px;\n  opacity: 0;\n  padding: 0 8px;\n  pointer-events: none;\n  position: absolute;\n  bottom: 37px;\n  font-family: arial, sans-serif;\n  font-size: 12px;\n  line-height: 20px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  visibility: hidden;\n  width: 85px;\n  word-break: break-word;\n}\n.ct-widget .ct-tool:hover:after {\n  opacity: 0.8;\n  visibility: visible;\n  transition-property: opacity;\n  transition-duration: 0s;\n  transition-timing-function: ease-in;\n  transition-delay: 2s;\n}\n.ct-widget .ct-tool {\n  width: 32px;\n}\n.ct-widget .ct-tool:before {\n  line-height: 32px;\n}\n.ct-widget .ct-tool {\n  /**\n   * Tools are displayed in rows of 3 so re remove margin from the last\n   * (3rd) tool in every row.\n   */\n}\n.ct-widget .ct-tool:nth-child(3n) {\n  margin-right: 0;\n}\n.ct-widget .ct-tool:hover {\n  background: rgba(255, 255, 255, 0.5);\n}\n.ct-widget .ct-tool {\n  /**\n   * The following modifiers reflect the state of the tool.\n   */\n  /**\n   * The tools is currently disabled and cannot be selected (the hover\n   * style is also disabled).\n   */\n}\n.ct-widget .ct-tool--disabled {\n  color: rgba(70, 70, 70, 0.33);\n}\n.ct-widget .ct-tool--disabled:hover {\n  background: transparent;\n}\n.ct-widget .ct-tool {\n  /**\n   * The button has been clicked on and the mouse button is still in the\n   * down state.\n   */\n}\n.ct-widget .ct-tool--down {\n  background: rgba(0, 0, 0, 0.025);\n  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.25);\n  line-height: 34px;\n}\n.ct-widget .ct-tool--down:hover {\n  background: rgba(0, 0, 0, 0.025);\n}\n.ct-widget .ct-tool {\n  /**\n   * The tool is currently applied to the selected element, and if there\n   * is one text selection.\n   */\n}\n.ct-widget .ct-tool--applied {\n  background: rgba(0, 0, 0, 0.1);\n  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.25);\n}\n.ct-widget .ct-tool--applied:hover {\n  background: rgba(0, 0, 0, 0.15);\n}\n.ct-widget .ct-tool {\n  /**\n   * Each of the modifiers below sets the content of the pseudo before\n   * element to match the required icon. The list is ordered by the\n   * position each tool in the default toolbox (as opposed to\n   * alphabetically).\n   */\n}\n.ct-widget .ct-tool--bold:before {\n  content: "\\ea62";\n}\n.ct-widget .ct-tool--heading:before {\n  content: "H";\n  font-weight: bold;\n}\n.ct-widget .ct-tool--subheading:before {\n  content: "H";\n}\n.ct-widget .ct-tool--paragraph:before {\n  content: "P";\n}\n.ct-widget .ct-tool--preformatted:before {\n  content: "\\ea80";\n}\n.ct-widget .ct-tool--italic:before {\n  content: "\\ea64";\n}\n.ct-widget .ct-tool--link:before {\n  content: "\\e9cb";\n}\n.ct-widget .ct-tool--align-left:before {\n  content: "\\ea77";\n}\n.ct-widget .ct-tool--align-center:before {\n  content: "\\ea78";\n}\n.ct-widget .ct-tool--align-right:before {\n  content: "\\ea79";\n}\n.ct-widget .ct-tool--unordered-list:before {\n  content: "\\e9ba";\n}\n.ct-widget .ct-tool--ordered-list:before {\n  content: "\\e9b9";\n}\n.ct-widget .ct-tool--table:before {\n  content: "\\ea71";\n}\n.ct-widget .ct-tool--indent:before {\n  content: "\\ea7b";\n}\n.ct-widget .ct-tool--unindent:before {\n  content: "\\ea7c";\n}\n.ct-widget .ct-tool--line-break:before {\n  content: "\\ea6e";\n}\n.ct-widget .ct-tool--image:before {\n  content: "\\e90d";\n}\n.ct-widget .ct-tool--video:before {\n  content: "\\ea98";\n}\n.ct-widget .ct-tool--undo:before {\n  content: "\\e965";\n}\n.ct-widget .ct-tool--redo:before {\n  content: "\\e966";\n}\n.ct-widget .ct-tool--remove:before {\n  content: "\\e9ac";\n}\n\n.ct-app {\n  box-sizing: border-box;\n}\n.ct-app *, .ct-app *:before, .ct-app *:after {\n  box-sizing: border-box;\n}';
const chromeStyles = layered(chromeCSS, "ct-chrome");
const hostStyles = [
  /* An unstyled custom element is display:inline, which gives the host a
     zero content box and collapses everything inside it. */
  ":host { display: block; position: relative; }",
  ":host([hidden]) { display: none; }",
  /* Mode B only: the wrapper the light-DOM content is parked in. */
  ".ct-content { display: block; }"
].join("\n");
const chromeStyleSheet = sheetFactory(chromeStyles);
const hostStyleSheet = sheetFactory(hostStyles);
const iconFont = "data:font/woff;base64,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";
function alreadyRegistered(doc) {
  try {
    for (const face of doc.fonts) {
      if (String(face.family).replace(/['"]/g, "") === "icon") {
        return true;
      }
    }
  } catch {
  }
  return false;
}
function ensureIconFont(doc) {
  if (alreadyRegistered(doc)) {
    return;
  }
  const src = `url("${iconFont}")`;
  const view = doc.defaultView;
  if (view && typeof view.FontFace === "function" && doc.fonts) {
    const face = new view.FontFace("icon", src, {
      weight: "normal",
      style: "normal"
    });
    doc.fonts.add(face);
    face.load().catch(() => {
    });
    return;
  }
  const style = doc.createElement("style");
  style.setAttribute("data-content-tools", "icon-font");
  style.textContent = `@font-face{font-family:'icon';src:${src};font-weight:normal;font-style:normal}`;
  (doc.head || doc.documentElement).appendChild(style);
}
const BRIDGED = [
  // The four intents. A `preventDefault()` on these aborts the action.
  { name: "start", cancelable: true },
  { name: "stop", cancelable: true },
  { name: "save", cancelable: true },
  { name: "revert", cancelable: true },
  // The three facts. Cancelling something that already happened is
  // meaningless, so they are not cancelable and the flag is asserted.
  { name: "started", cancelable: false },
  { name: "stopped", cancelable: false },
  { name: "saved", cancelable: false }
];
function createEventBridge(app, host) {
  var _a;
  const view = ((_a = host.ownerDocument) == null ? void 0 : _a.defaultView) ?? null;
  const CustomEventCtor = view && view.CustomEvent || CustomEvent;
  function emit(type, detail, cancelable) {
    return host.dispatchEvent(new CustomEventCtor(type, {
      detail,
      // `composed` is the whole contract. Without it the event stops
      // dead at the shadow boundary and every consumer listener on a
      // parent node silently never fires -- so it is asserted per
      // event rather than once.
      bubbles: true,
      composed: true,
      cancelable
    }));
  }
  const bound = [];
  for (const { name, cancelable } of BRIDGED) {
    const handler = (ev) => {
      const proceed = emit(`ct-${name}`, ev.detail(), cancelable);
      if (!proceed) {
        ev.preventDefault();
      }
    };
    app.addEventListener(name, handler);
    bound.push([name, handler]);
  }
  const restoreBusy = patchBusy(app, (busy) => {
    emit("ct-busy", { busy }, false);
  });
  return {
    dispose() {
      for (const [name, handler] of bound) {
        app.removeEventListener(name, handler);
      }
      bound.length = 0;
      restoreBusy();
    }
  };
}
function patchBusy(app, onChange) {
  const hadOwn = Object.prototype.hasOwnProperty.call(app, "busy");
  const previous = app.busy;
  const patched = function patchedBusy(busy) {
    const result = previous.call(this, busy);
    if (busy !== void 0) {
      onChange(!!busy);
    }
    return result;
  };
  app.busy = patched;
  return () => {
    if (app.busy !== patched) {
      return;
    }
    if (hadOwn) {
      app.busy = previous;
    } else {
      delete app.busy;
    }
  };
}
let owner = null;
let pendingTeardown = null;
function setPendingTeardown(fn) {
  pendingTeardown = fn;
}
function flushPendingTeardown() {
  const fn = pendingTeardown;
  pendingTeardown = null;
  if (fn) {
    fn();
  }
}
function claimLease(claimant) {
  if (owner === claimant) {
    return true;
  }
  if (owner !== null) {
    flushPendingTeardown();
  }
  if (owner !== null) {
    return false;
  }
  owner = claimant;
  return true;
}
function releaseLease(claimant) {
  if (owner === claimant) {
    owner = null;
  }
}
function snapshotGlobals() {
  const palette = ContentTools.StylePalette._styles;
  return {
    imageUploader: ContentTools.IMAGE_UPLOADER,
    // A copy: StylePalette.add() concatenates onto a new array today, but
    // a snapshot that aliases live state is a bug waiting for the day it
    // mutates in place instead.
    stylePalette: palette ? palette.slice() : [],
    language: ContentEdit.LANGUAGE
  };
}
function applyGlobals(config) {
  if (config.imageUploader !== void 0) {
    ContentTools.IMAGE_UPLOADER = config.imageUploader;
  }
  if (config.stylePalette !== void 0) {
    setStylePalette(config.stylePalette);
  }
  if (config.uiLang !== void 0 && config.uiLang) {
    ContentEdit.LANGUAGE = config.uiLang;
  }
}
function restoreGlobals(snapshot) {
  ContentTools.IMAGE_UPLOADER = snapshot.imageUploader;
  ContentTools.StylePalette._styles = snapshot.stylePalette.slice();
  ContentEdit.LANGUAGE = snapshot.language;
}
function setStylePalette(styles) {
  ContentTools.StylePalette._styles = styles ? styles.slice() : [];
}
const TAG_NAME = "content-tools-editor";
const DEFAULT_REGIONS = "[data-editable], [data-fixture]";
const DEFAULT_NAMING_PROP = "data-name";
const DEFAULT_FIXTURE_TEST = (domElement) => domElement.hasAttribute("data-fixture");
const SETTABLE_PROPERTIES = [
  "tools",
  "fixtureTest",
  "stylePalette",
  "imageUploader",
  "regionElements"
];
class ContentToolsEditor extends HTMLElement {
  static get observedAttributes() {
    return [
      "regions",
      "naming-prop",
      "ignition",
      "content-scope",
      "content-styles",
      "ui-lang",
      "mode"
    ];
  }
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: "open" });
    this._slot = this.ownerDocument.createElement("slot");
    this._shadow.appendChild(this._slot);
    this._booted = false;
    this._inert = false;
    this._app = null;
    this._ctx = null;
    this._previousContext = null;
    this._bridge = null;
    this._globals = null;
    this._contentWrapper = null;
    this._contentLink = null;
    this._adopted = [];
    this._fallbackStyles = [];
    this._tools = null;
    this._regionElements = null;
    this._fixtureTest = null;
    this._stylePalette = void 0;
    this._imageUploader = void 0;
    this._deferredTeardown = () => {
      if (this.isConnected) {
        return;
      }
      this._teardown();
    };
    this._reflect = () => this._reflectState();
  }
  // --- attributes -------------------------------------------------------
  /** The selector (or a comma-separated list) identifying editable regions. */
  get regions() {
    return this.getAttribute("regions") || DEFAULT_REGIONS;
  }
  set regions(value) {
    this.setAttribute("regions", value);
  }
  /** The attribute a region's name is read from. */
  get namingProp() {
    return this.getAttribute("naming-prop") || DEFAULT_NAMING_PROP;
  }
  set namingProp(value) {
    this.setAttribute("naming-prop", value);
  }
  /* Absent means OFF, which INVERTS the imperative default. A boolean
     attribute cannot express "on unless you say otherwise", and an element
     is normally driven by the shell around it rather than by its own
     on-page switch. Add `ignition` to get the v1.6.x behaviour. */
  get ignition() {
    return this.hasAttribute("ignition");
  }
  set ignition(value) {
    this.toggleAttribute("ignition", !!value);
  }
  /**
   * `html` (default) or `markdown`.
   *
   * Markdown mode constrains the editor to what markdown can express: 17
   * of the 21 tools, no CSS classes, no raw-HTML tab, no image resizing,
   * no table head/foot switches and an attribute allow-list. It does NOT
   * pull in the serializer -- parsing and serializing markdown is the
   * shell's job, which is what keeps the element free of I/O.
   *
   * An unrecognised value falls back to `html` rather than throwing: an
   * attribute typo should not leave the element dead on the page.
   */
  get mode() {
    const mode = this.getAttribute("mode");
    return mode && PROFILES[mode] ? mode : "html";
  }
  set mode(value) {
    this.setAttribute("mode", value);
  }
  /** `light` (default, Mode A) or `shadow` (Mode B, experimental). */
  get contentScope() {
    return this.getAttribute("content-scope") === "shadow" ? "shadow" : "light";
  }
  set contentScope(value) {
    this.setAttribute("content-scope", value);
  }
  /** A stylesheet URL to load into the shadow root. Mode B needs one. */
  get contentStyles() {
    return this.getAttribute("content-styles");
  }
  set contentStyles(value) {
    if (value === null) {
      this.removeAttribute("content-styles");
    } else {
      this.setAttribute("content-styles", value);
    }
  }
  /* `ui-lang`, NOT `lang`. `lang` is a global HTML attribute with real
     platform semantics -- it is inherited by the light-DOM content and
     tells the browser that THE TEXT BEING EDITED is in that language,
     driving spellcheck, hyphenation, :lang(), font fallback and screen
     reader pronunciation. The chrome's language and the content's language
     are different things, and conflating them makes a French UI editing
     English copy impossible without lying to the accessibility tree.
     `lang` is honoured as a fallback, because an element with only `lang`
     set almost certainly means both. */
  get uiLang() {
    return this.getAttribute("ui-lang") || this.lang || null;
  }
  set uiLang(value) {
    if (value === null) {
      this.removeAttribute("ui-lang");
    } else {
      this.setAttribute("ui-lang", value);
    }
  }
  // --- reflected out ----------------------------------------------------
  /** `dormant` | `ready` | `editing`. Read-only; mirrored to `state`. */
  get state() {
    return this.getAttribute("state") || "dormant";
  }
  /** Whether the editor is waiting on the consumer. Mirrored to `busy`. */
  get busy() {
    return this.hasAttribute("busy");
  }
  // --- properties attributes cannot carry -------------------------------
  get tools() {
    return this._tools;
  }
  set tools(value) {
    this._tools = value;
    if (this._booted && value) {
      this._app.toolbox().tools(
        filterToolGroups(PROFILES[this.mode], value)
      );
    }
  }
  /**
   * The regions, as ELEMENTS, when a selector cannot say which they are.
   *
   * Mode A resolves the `regions` selector against this element's own
   * light children, which is right wherever the editor owns the markup
   * around what is being edited. The in-page surface does not: it edits
   * ONE element of somebody's published page, in place, with the site's
   * template and stylesheet around it -- and moving that element under
   * this one to make a selector reach it changes its ancestry, so
   * `.layout > article` stops matching and the page reflows the moment
   * an author presses Edit. Preview fidelity is the whole reason that
   * surface exists, so the page is left exactly as it is and the
   * elements are named directly.
   *
   * `EditorApp.init` has taken a list of elements since 1.6 -- it is
   * the documented `queryOrDOMElements` half of its contract -- so this
   * is that capability reaching the element rather than a new one. It
   * also removes a whole class of mistake the selector has: nothing
   * else on a page we do not own can match by accident.
   *
   * Null (the default) means the `regions` selector decides, exactly as
   * before.
   */
  get regionElements() {
    return this._regionElements;
  }
  set regionElements(value) {
    this._regionElements = value ? [...value] : null;
    if (this._booted) {
      this._app.syncRegions(this._regionSource());
    }
  }
  get fixtureTest() {
    return this._fixtureTest;
  }
  set fixtureTest(value) {
    this._fixtureTest = value;
    if (this._booted) {
      this._app._fixtureTest = value || DEFAULT_FIXTURE_TEST;
    }
  }
  get stylePalette() {
    return this._stylePalette;
  }
  set stylePalette(value) {
    this._stylePalette = value;
    if (this._booted) {
      applyGlobals({ stylePalette: value });
    }
  }
  get imageUploader() {
    return this._imageUploader;
  }
  set imageUploader(value) {
    this._imageUploader = value;
    if (this._booted) {
      applyGlobals({ imageUploader: value });
    }
  }
  /** The RootContext this element installed, or null when not booted. */
  get rootContext() {
    return this._ctx;
  }
  /**
   * The underlying `EditorApp`. UNSTABLE: it is the v1.6.x singleton and
   * Milestone 2 reshapes it. Use the `ct-*` events and the methods below
   * wherever they suffice.
   */
  get editorApp() {
    return this._app;
  }
  // --- lifecycle --------------------------------------------------------
  connectedCallback() {
    this._applyStyles();
    ensureIconFont(this.ownerDocument);
    this._boot();
  }
  disconnectedCallback() {
    this._inert = false;
    if (!this._booted) {
      return;
    }
    setPendingTeardown(this._deferredTeardown);
    queueMicrotask(flushPendingTeardown);
  }
  adoptedCallback() {
    this._applyStyles();
    ensureIconFont(this.ownerDocument);
    if (this._booted) {
      console.warn(
        "<content-tools-editor>: moved to another document while booted. Styles have been rebuilt, but the editor context still refers to the previous document -- remove and re-add the element to re-home it."
      );
      return;
    }
    this._ctx = null;
  }
  attributeChangedCallback(name, previous, next) {
    if (previous === next || !this._booted) {
      return;
    }
    switch (name) {
      case "regions":
        this._app.syncRegions(this._regionSource());
        break;
      case "naming-prop":
      case "ignition":
      case "content-scope":
      case "mode":
        this._reboot(name);
        break;
      case "content-styles":
        this._applyContentStyles();
        break;
      case "ui-lang":
        this._applyLanguage();
        break;
    }
  }
  // --- methods ----------------------------------------------------------
  /** Begin editing. */
  start() {
    this._requireApp().start();
  }
  /**
   * Stop editing, SAVING by default.
   *
   * A deliberate divergence from the imperative `stop()`, which reverts.
   * Reverting shows a confirm dialog and, if the user cancels, aborts the
   * stop -- neither is a defensible default for a method the shell calls.
   * Pass `false` explicitly to revert.
   */
  stop(save = true) {
    this._requireApp().stop(save);
  }
  /** Save the current changes. `passive` leaves the page editable. */
  save(passive = false) {
    this._requireApp().save(passive);
  }
  /** Discard changes. Returns false if the user cancelled the confirm. */
  revert() {
    return this._requireApp().revert();
  }
  /** Re-scan the page for regions. Safe while editing. */
  /**
   * What the regions ARE right now: the element list, or the selector.
   *
   * One expression, in one place, because it is asked at four moments
   * -- boot, a `regions` attribute change, `refresh()`, and the
   * `regionElements` setter -- and the four disagreeing means a
   * refresh silently swaps a supplied element for whatever the
   * selector happens to match. For the in-page surface that is the
   * site's own `<article>` being dropped in favour of nothing.
   *
   * Never null. `syncRegions` leaves the existing query in place for a
   * falsy argument, so a withdrawn list has to be answered with the
   * selector or the editor carries on editing the elements the caller
   * just took away.
   */
  _regionSource() {
    return this._regionElements ?? this.regions;
  }
  refresh() {
    this._requireApp().syncRegions(this._regionSource());
  }
  /** Show a flash indicator: `ok` or `no`. */
  flash(type = "ok") {
    const app = this._requireApp();
    if (!app.isMounted()) {
      console.warn("<content-tools-editor>: flash() ignored, the editor is not mounted.");
      return;
    }
    new ContentTools.FlashUI(type);
  }
  /**
   * Add consumer styles to the shadow root.
   *
   * Accepts a `CSSStyleSheet`, CSS text, or a URL. Text and URL are told
   * apart by the presence of a `{` -- documented rather than guessed at,
   * because there is no reliable way to distinguish `body{color:red}` from
   * a relative path in general.
   *
   * A URL becomes a `<link>`: fetching it and calling `replaceSync` would
   * need CORS headers and so would break every cross-origin sheet, which
   * is most of them.
   */
  adoptStyles(styles) {
    if (typeof styles !== "string") {
      this._adopted.push(styles);
      this._applyStyles();
      return;
    }
    if (styles.includes("{")) {
      const style = this.ownerDocument.createElement("style");
      style.setAttribute("data-content-tools", "adopted");
      style.textContent = styles;
      this._shadow.appendChild(style);
      return;
    }
    const link = this.ownerDocument.createElement("link");
    link.setAttribute("data-content-tools", "adopted");
    link.rel = "stylesheet";
    link.href = styles;
    this._shadow.appendChild(link);
  }
  /** Remove everything added through adoptStyles(). */
  removeAdoptedStyles() {
    this._adopted = [];
    for (const node of this._shadow.querySelectorAll('[data-content-tools="adopted"]')) {
      node.remove();
    }
    this._applyStyles();
  }
  // --- internals --------------------------------------------------------
  _requireApp() {
    if (this._inert) {
      throw new Error(
        "<content-tools-editor> is inert: another instance already holds the editor."
      );
    }
    if (!this._booted) {
      throw new Error(
        "<content-tools-editor> is not connected to a document."
      );
    }
    return this._app;
  }
  _boot() {
    if (this._booted || this._inert) {
      return;
    }
    this._upgradeProperties();
    if (!claimLease(this)) {
      this._goInert();
      return;
    }
    this._reconcileEditorApp();
    if (this._ctx) {
      this._ctx.setContentScopeMode(this.contentScope);
    } else {
      this._ctx = new ShadowRootContext(this._shadow, {
        contentScope: this.contentScope
      });
    }
    this._previousContext = setRootContext(this._ctx);
    this._parkContent();
    this._globals = snapshotGlobals();
    applyGlobals({
      imageUploader: this._imageUploader,
      stylePalette: this._stylePalette,
      uiLang: this.uiLang
    });
    this._app = ContentTools.EditorApp.get();
    this._app.profile(PROFILES[this.mode]);
    this._app.init(
      this._regionSource(),
      this.namingProp,
      this._fixtureTest || DEFAULT_FIXTURE_TEST,
      this.ignition
    );
    if (this._tools) {
      this._app.toolbox().tools(
        filterToolGroups(PROFILES[this.mode], this._tools)
      );
    }
    this._bridge = createEventBridge(this._app, this);
    this._booted = true;
    this.addEventListener("ct-started", this._reflect);
    this.addEventListener("ct-stopped", this._reflect);
    this.addEventListener("ct-busy", this._reflect);
    this._applyContentStyles();
    this._reflectState();
  }
  _teardown() {
    if (!this._booted) {
      releaseLease(this);
      return;
    }
    const app = this._app;
    try {
      if (app.isEditing()) {
        app.stop(true);
      }
    } catch (error) {
      console.error("<content-tools-editor>: error stopping the editor", error);
    }
    this.removeEventListener("ct-started", this._reflect);
    this.removeEventListener("ct-stopped", this._reflect);
    this.removeEventListener("ct-busy", this._reflect);
    if (this._bridge) {
      this._bridge.dispose();
      this._bridge = null;
    }
    try {
      app.destroy();
    } catch (error) {
      console.error("<content-tools-editor>: error destroying the editor", error);
    }
    if (rootContext() === this._ctx && this._previousContext) {
      setRootContext(this._previousContext);
    }
    this._previousContext = null;
    if (this._globals) {
      restoreGlobals(this._globals);
      this._globals = null;
    }
    this._unparkContent();
    this._app = null;
    this._booted = false;
    releaseLease(this);
    this.removeAttribute("busy");
    this.setAttribute("state", "dormant");
  }
  _reboot(attribute) {
    if (this._app && this._app.isEditing()) {
      console.warn(
        `<content-tools-editor>: ignoring the change to ${attribute} while editing. Stop the editor first.`
      );
      return;
    }
    this._teardown();
    this._boot();
  }
  /**
   * Take back a property assigned before the element upgraded.
   *
   * A value set on the element before its definition loads becomes an OWN
   * property, which shadows the prototype accessor permanently -- the
   * setter never runs, and `el.tools = [...]` in a framework template
   * would silently do nothing.
   */
  _upgradeProperties() {
    for (const name of SETTABLE_PROPERTIES) {
      if (Object.prototype.hasOwnProperty.call(this, name)) {
        const value = this[name];
        delete this[name];
        this[name] = value;
      }
    }
  }
  /**
   * Put the singleton back to a known state before booting onto it.
   *
   * An imperative integration on the same page may already have called
   * `init()`. Without this the element would boot onto someone else's
   * regions and naming property, which fails in a way that looks like the
   * element ignoring its own attributes.
   */
  _reconcileEditorApp() {
    const app = ContentTools.EditorApp.get();
    if (app.isDormant() && !app.isMounted() && app._regionQuery === null) {
      return;
    }
    console.warn(
      "<content-tools-editor>: ContentTools.EditorApp was already initialised imperatively. It is a singleton, so the element is resetting it and taking over."
    );
    try {
      if (app.isEditing()) {
        app.stop(true);
      }
      app.destroy();
    } catch (error) {
      console.error("<content-tools-editor>: error reclaiming the editor", error);
    }
  }
  _goInert() {
    this._inert = true;
    const message = "<content-tools-editor>: another instance already holds the editor. ContentTools.EditorApp and ContentEdit.Root are singletons, so only one can be live per page. This element is inert; its content is still rendered and untouched.";
    console.error(message);
    this.dispatchEvent(new CustomEvent("ct-error", {
      bubbles: true,
      composed: true,
      detail: { code: "singleton-conflict", message }
    }));
  }
  _reflectState() {
    this.setAttribute("state", this._app ? this._app.getState() : "dormant");
    this.toggleAttribute("busy", Boolean(this._app && this._app.busy()));
  }
  // --- content scope ----------------------------------------------------
  _parkContent() {
    if (this.contentScope !== "shadow" || this._contentWrapper) {
      return;
    }
    const wrapper = this.ownerDocument.createElement("div");
    wrapper.className = "ct-content";
    while (this.firstChild) {
      wrapper.appendChild(this.firstChild);
    }
    this._shadow.insertBefore(wrapper, this._slot);
    this._contentWrapper = wrapper;
  }
  _unparkContent() {
    if (!this._contentWrapper) {
      return;
    }
    while (this._contentWrapper.firstChild) {
      this.appendChild(this._contentWrapper.firstChild);
    }
    this._contentWrapper.remove();
    this._contentWrapper = null;
  }
  // --- styles -----------------------------------------------------------
  _applyStyles() {
    const doc = this.ownerDocument;
    const host = hostStyleSheet(doc);
    const chrome = chromeStyleSheet(doc);
    if (host && chrome) {
      this._shadow.adoptedStyleSheets = [host, chrome, ...this._adopted];
      return;
    }
    for (const style of this._fallbackStyles) {
      style.remove();
    }
    this._fallbackStyles = [hostStyles, chromeStyles].map((css) => {
      const style = doc.createElement("style");
      style.setAttribute("data-content-tools", "chrome");
      style.textContent = css;
      this._shadow.insertBefore(style, this._shadow.firstChild);
      return style;
    });
  }
  _applyContentStyles() {
    const href = this.contentStyles;
    if (this._contentLink && this._contentLink.getAttribute("href") === href) {
      return;
    }
    if (this._contentLink) {
      this._contentLink.remove();
      this._contentLink = null;
    }
    if (!href) {
      return;
    }
    const link = this.ownerDocument.createElement("link");
    link.setAttribute("data-content-tools", "content-styles");
    link.rel = "stylesheet";
    link.href = href;
    this._shadow.appendChild(link);
    this._contentLink = link;
  }
  // --- language ---------------------------------------------------------
  _applyLanguage() {
    const lang = this.uiLang;
    if (!lang) {
      return;
    }
    ContentEdit.LANGUAGE = lang;
    const toolbox = this._booted && this._app.toolbox();
    if (toolbox && toolbox.isMounted()) {
      toolbox.tools(toolbox.tools());
    }
  }
}
export {
  ContentToolsEditor as C,
  ShadowRootContext as S,
  TAG_NAME as T
};
