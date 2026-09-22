import { d as deepActiveElement, s as setRootContext, r as rootContext } from "./root-context-CaKowcmF.js";
class DocumentRootContext {
  constructor(doc = document, win = window) {
    this.document = doc;
    this.window = win;
    this.root = doc;
    this._mountPoint = null;
    this._contentScope = null;
  }
  // --- mounting -------------------------------------------------------
  /** Where editor chrome (toolbox, dialogs, inspector) is attached. */
  mountPoint() {
    return this._mountPoint || this.document.body;
  }
  setMountPoint(el) {
    this._mountPoint = el;
  }
  /** Where drag helpers and crop marks go. Same node in light DOM. */
  overlayPoint() {
    return this.mountPoint();
  }
  /** The subtree region queries run against. */
  contentScope() {
    return this._contentScope || this.document;
  }
  setContentScope(node) {
    this._contentScope = node;
  }
  // --- element construction -------------------------------------------
  createElement(tagName) {
    return this.document.createElement(tagName);
  }
  createTextNode(text) {
    return this.document.createTextNode(text);
  }
  createRange() {
    return this.document.createRange();
  }
  /**
   * A detached document used to sanitise untrusted HTML without running
   * scripts or loading resources in the live page.
   */
  createSandboxDocument() {
    return this.document.implementation.createHTMLDocument();
  }
  // --- selection ------------------------------------------------------
  getSelection() {
    return this.window.getSelection();
  }
  /**
   * The first selected range, as a LIVE Range, or null if nothing is
   * selected.
   *
   * Callers rely on it being live: ContentSelect.Range.rect() measures a
   * collapsed caret by inserting a marker span into the range, which a
   * StaticRange cannot do. A shadow-backed context reads StaticRanges from
   * getComposedRanges() and has to rebuild a live Range before returning
   * it -- doing that here, once, is why no call site has to care which
   * engine it is running on.
   */
  getRange() {
    const selection = this.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }
    return selection.getRangeAt(0);
  }
  /**
   * Select the given range.
   *
   * setBaseAndExtent rather than addRange: addRange is unreliable in WebKit
   * once shadow-tree nodes are involved, and this is the method a
   * ShadowRootContext needs, so the two implementations stay the same shape.
   * In light DOM the two are equivalent here because every caller clears the
   * selection first.
   */
  selectRange(range) {
    const selection = this.getSelection();
    if (!selection) {
      return;
    }
    selection.setBaseAndExtent(
      range.startContainer,
      range.startOffset,
      range.endContainer,
      range.endOffset
    );
  }
  clearSelection() {
    const selection = this.getSelection();
    if (selection) selection.removeAllRanges();
  }
  // --- focus ----------------------------------------------------------
  /** Descends through open shadow roots; in light DOM this is activeElement. */
  getActiveElement() {
    return deepActiveElement(this.document);
  }
  hasFocus() {
    return this.document.hasFocus();
  }
  // --- global UI state -------------------------------------------------
  /**
   * Page-level flags the library toggles while dragging, resizing or
   * showing a modal. A shadow-backed context has to write these in two
   * places; in light DOM one is enough.
   */
  setGlobalState(name, on) {
    const className = name === "no-scroll" ? "ct--no-scroll" : `ce--${name}`;
    this.document.body.classList.toggle(className, !!on);
  }
  // --- geometry and environment ----------------------------------------
  scrollPosition() {
    const win = this.window;
    if (win.pageXOffset !== void 0) {
      return [win.pageXOffset, win.pageYOffset];
    }
    const isCSS1Compat = (this.document.compatMode || 4) === 4;
    return isCSS1Compat ? [
      this.document.documentElement.scrollLeft,
      this.document.documentElement.scrollTop
    ] : [this.document.body.scrollLeft, this.document.body.scrollTop];
  }
  viewportSize() {
    return [this.window.innerWidth, this.window.innerHeight];
  }
  pageWidth() {
    return this.document.documentElement.clientWidth || this.document.body.clientWidth;
  }
  getComputedStyle(el) {
    return this.window.getComputedStyle(el);
  }
  /**
   * Whether the host supports getComputedStyle at all.
   *
   * Read live rather than assumed: the widget code falls back to unmounting
   * immediately when it is unavailable, and a spec exercises that path by
   * nulling window.getComputedStyle to stop transition monitoring.
   */
  supportsComputedStyle() {
    return Boolean(this.window.getComputedStyle);
  }
  confirm(message) {
    return this.window.confirm(message);
  }
  /**
   * The event currently being dispatched.
   *
   * Only the drag-clone check uses this, to read altKey. It reaches for a
   * global because ContentEdit's dropper functions take
   * (element, target, placement) and never received the event -- changing
   * that signature would break every consumer-defined dropper, so the read
   * is routed here rather than fixed. Worth revisiting when droppers are
   * next revised.
   */
  currentEvent() {
    return this.window.event;
  }
  /** Legacy IE clipboard access; null everywhere else. */
  clipboardData() {
    return this.window.clipboardData || null;
  }
  /** True on the legacy IE rendering path ContentEdit still branches on. */
  isLegacyIE() {
    return Boolean(this.document.documentMode);
  }
  // --- storage ----------------------------------------------------------
  /**
   * Persisted UI preferences (toolbox position, last-used dialog tab).
   *
   * Wrapped because localStorage throws in a sandboxed iframe and in
   * Safari's private mode, where the library previously would have taken
   * the whole editor down with it.
   */
  storage() {
    const win = this.window;
    return {
      getItem(key) {
        try {
          return win.localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem(key, value) {
        try {
          win.localStorage.setItem(key, value);
        } catch {
        }
      }
    };
  }
  // --- listeners --------------------------------------------------------
  /**
   * Add a document- or window-level listener and get back a disposer.
   *
   * The library used to remove these by re-deriving the same bound
   * function, which is easy to get subtly wrong and was untested. Returning
   * the disposer makes teardown structurally correct.
   */
  /**
   * Add a document- or window-level listener, paired with off().
   *
   * These exist alongside addGlobalListener because the library's existing
   * teardown removes listeners by function identity; converting all of it
   * to disposers at the same time as introducing this seam would have made
   * a behaviour-preserving phase unverifiable.
   */
  on(target, type, fn, opts) {
    (target === "window" ? this.window : this.document).addEventListener(type, fn, opts);
  }
  off(target, type, fn, opts) {
    (target === "window" ? this.window : this.document).removeEventListener(type, fn, opts);
  }
  addGlobalListener(target, type, fn, opts) {
    const node = target === "window" ? this.window : this.document;
    node.addEventListener(type, fn, opts);
    return () => node.removeEventListener(type, fn, opts);
  }
}
setRootContext(new DocumentRootContext());
const FSM = {};
FSM.Machine = (function() {
  function Machine(context) {
    this.context = context;
    this._stateTransitions = {};
    this._stateTransitionsAny = {};
    this._defaultTransition = null;
    this._initialState = null;
    this._currentState = null;
  }
  Machine.prototype.addTransition = function(action, state, nextState, callback) {
    if (!nextState) {
      nextState = state;
    }
    return this._stateTransitions[String([action, state])] = [nextState, callback];
  };
  Machine.prototype.addTransitions = function(actions, state, nextState, callback) {
    var action, _i, _len, _results;
    if (!nextState) {
      nextState = state;
    }
    _results = [];
    for (_i = 0, _len = actions.length; _i < _len; _i++) {
      action = actions[_i];
      _results.push(this.addTransition(action, state, nextState, callback));
    }
    return _results;
  };
  Machine.prototype.addTransitionAny = function(state, nextState, callback) {
    if (!nextState) {
      nextState = state;
    }
    return this._stateTransitionsAny[state] = [nextState, callback];
  };
  Machine.prototype.setDefaultTransition = function(state, callback) {
    return this._defaultTransition = [state, callback];
  };
  Machine.prototype.getTransition = function(action, state) {
    if (this._stateTransitions[String([action, state])]) {
      return this._stateTransitions[String([action, state])];
    } else if (this._stateTransitionsAny[state]) {
      return this._stateTransitionsAny[state];
    } else if (this._defaultTransition) {
      return this._defaultTransition;
    }
    throw new Error("Transition is undefined: (" + action + ", " + state + ")");
  };
  Machine.prototype.getCurrentState = function() {
    return this._currentState;
  };
  Machine.prototype.setInitialState = function(state) {
    this._initialState = state;
    if (!this._currentState) {
      return this.reset();
    }
  };
  Machine.prototype.reset = function() {
    return this._currentState = this._initialState;
  };
  Machine.prototype.process = function(action) {
    var result;
    result = this.getTransition(action, this._currentState);
    if (result[1]) {
      result[1].call(this.context || (this.context = this), action);
    }
    return this._currentState = result[0];
  };
  return Machine;
})();
const HTMLString = {};
const Cls$strings = HTMLString.String = class String2 {
  static initClass() {
    this._parser = null;
  }
  constructor(html, preserveWhitespace) {
    if (preserveWhitespace == null) {
      preserveWhitespace = false;
    }
    this._preserveWhitespace = preserveWhitespace;
    if (html) {
      if (HTMLString.String._parser === null) {
        HTMLString.String._parser = new _Parser();
      }
      this.characters = HTMLString.String._parser.parse(
        html,
        this._preserveWhitespace
      ).characters;
    } else {
      this.characters = [];
    }
  }
  // Read-only properties
  isWhitespace() {
    for (var c of Array.from(this.characters)) {
      if (!c.isWhitespace()) {
        return false;
      }
    }
    return true;
  }
  length() {
    return this.characters.length;
  }
  preserveWhitespace() {
    return this._preserveWhitespace;
  }
  // Methods
  capitalize() {
    const newString = this.copy();
    if (newString.length()) {
      const c = newString.characters[0]._c.toUpperCase();
      newString.characters[0]._c = c;
    }
    return newString;
  }
  charAt(index) {
    return this.characters[index].copy();
  }
  concat(...args) {
    let adjustedLength = Math.max(args.length, 1), strings = args.slice(0, adjustedLength - 1), inheritFormat = args[adjustedLength - 1];
    if (!(typeof inheritFormat === "undefined" || typeof inheritFormat === "boolean")) {
      strings.push(inheritFormat);
      inheritFormat = true;
    }
    const newString = this.copy();
    for (var string of Array.from(strings)) {
      var c;
      if (string.length === 0) {
        continue;
      }
      var tail = string;
      if (typeof string === "string") {
        tail = new HTMLString.String(string, this._preserveWhitespace);
      }
      if (inheritFormat && newString.length()) {
        var indexChar = newString.charAt(newString.length() - 1);
        var inheritedTags = indexChar.tags();
        if (indexChar.isTag()) {
          inheritedTags.shift();
        }
        if (typeof string !== "string") {
          tail = tail.copy();
        }
        for (c of Array.from(tail.characters)) {
          c.addTags.apply(c, inheritedTags);
        }
      }
      for (c of Array.from(tail.characters)) {
        newString.characters.push(c);
      }
    }
    return newString;
  }
  contains(substring) {
    if (typeof substring === "string") {
      return this.text().indexOf(substring) > -1;
    }
    let from = 0;
    while (from <= this.length() - substring.length()) {
      var found = true;
      for (var i = 0; i < substring.characters.length; i++) {
        var c = substring.characters[i];
        if (!c.eq(this.characters[i + from])) {
          found = false;
          break;
        }
      }
      if (found) {
        return true;
      }
      from++;
    }
    return false;
  }
  endsWith(substring) {
    if (typeof substring === "string") {
      return substring === "" || this.text().slice(-substring.length) === substring;
    }
    const characters = this.characters.slice().reverse();
    const iterable = substring.characters.slice().reverse();
    for (let i = 0; i < iterable.length; i++) {
      var c = iterable[i];
      if (!c.eq(characters[i])) {
        return false;
      }
    }
    return true;
  }
  format(from, to, ...tags) {
    if (to < 0) {
      to = this.length() + to + 1;
    }
    if (from < 0) {
      from = this.length() + from;
    }
    const newString = this.copy();
    for (let i = from, end = to, asc = from <= end; asc ? i < end : i > end; asc ? i++ : i--) {
      var c = newString.characters[i];
      c.addTags.apply(c, tags);
    }
    return newString;
  }
  hasTags(...args) {
    let adjustedLength = Math.max(args.length, 1), tags = args.slice(0, adjustedLength - 1), strict = args[adjustedLength - 1];
    if (!(typeof strict === "undefined" || typeof strict === "boolean")) {
      tags.push(strict);
      strict = false;
    }
    let found = false;
    for (var c of Array.from(this.characters)) {
      if (c.hasTags.apply(c, tags)) {
        found = true;
      } else {
        if (strict) {
          return false;
        }
      }
    }
    return found;
  }
  html() {
    let tag;
    let html = "";
    const openTags = [];
    const openHeads = [];
    let closingTags = [];
    for (var c of Array.from(this.characters)) {
      var head;
      closingTags = [];
      for (var openTag of Array.from(openTags.slice().reverse())) {
        closingTags.push(openTag);
        if (!c.hasTags(openTag)) {
          for (var closingTag of Array.from(closingTags)) {
            html += closingTag.tail();
            openTags.pop();
            openHeads.pop();
          }
          closingTags = [];
        }
      }
      for (tag of Array.from(c._tags)) {
        if (openHeads.indexOf(tag.head()) === -1) {
          if (!tag.selfClosing()) {
            head = tag.head();
            html += head;
            openTags.push(tag);
            openHeads.push(head);
          }
        }
      }
      if (c._tags.length > 0 && c._tags[0].selfClosing()) {
        html += c._tags[0].head();
      }
      html += c.c();
    }
    for (tag of Array.from(openTags.reverse())) {
      html += tag.tail();
    }
    return html;
  }
  indexOf(substring, from) {
    if (from == null) {
      from = 0;
    }
    if (from < 0) {
      from = 0;
    }
    if (typeof substring === "string") {
      return this.text().indexOf(substring, from);
    }
    while (from <= this.length() - substring.length()) {
      var found = true;
      for (var i = 0; i < substring.characters.length; i++) {
        var c = substring.characters[i];
        if (!c.eq(this.characters[i + from])) {
          found = false;
          break;
        }
      }
      if (found) {
        return from;
      }
      from++;
    }
    return -1;
  }
  insert(index, substring, inheritFormat) {
    let c;
    if (inheritFormat == null) {
      inheritFormat = true;
    }
    const head = this.slice(0, index);
    const tail = this.slice(index);
    if (index < 0) {
      index = this.length() + index;
    }
    let middle = substring;
    if (typeof substring === "string") {
      middle = new HTMLString.String(substring, this._preserveWhitespace);
    }
    if (inheritFormat && index > 0) {
      const indexChar = this.charAt(index - 1);
      const inheritedTags = indexChar.tags();
      if (indexChar.isTag()) {
        inheritedTags.shift();
      }
      if (typeof substring !== "string") {
        middle = middle.copy();
      }
      for (c of Array.from(middle.characters)) {
        c.addTags.apply(c, inheritedTags);
      }
    }
    const newString = head;
    for (c of Array.from(middle.characters)) {
      newString.characters.push(c);
    }
    for (c of Array.from(tail.characters)) {
      newString.characters.push(c);
    }
    return newString;
  }
  lastIndexOf(substring, from) {
    let c, found, i;
    if (from == null) {
      from = 0;
    }
    if (from < 0) {
      from = 0;
    }
    const characters = this.characters.slice(from).reverse();
    from = 0;
    if (typeof substring === "string") {
      if (!this.contains(substring)) {
        return -1;
      }
      substring = substring.split("").reverse();
      while (from <= characters.length - substring.length) {
        found = true;
        var skip = 0;
        for (i = 0; i < substring.length; i++) {
          c = substring[i];
          if (characters[i + from].isTag()) {
            skip += 1;
          }
          if (c !== characters[skip + i + from].c()) {
            found = false;
            break;
          }
        }
        if (found) {
          return from;
        }
        from++;
      }
      return -1;
    }
    substring = substring.characters.slice().reverse();
    while (from <= characters.length - substring.length) {
      found = true;
      for (i = 0; i < substring.length; i++) {
        c = substring[i];
        if (!c.eq(characters[i + from])) {
          found = false;
          break;
        }
      }
      if (found) {
        return from;
      }
      from++;
    }
    return -1;
  }
  optimize() {
    let c, tag;
    const openTags = [];
    const openHeads = [];
    let lastC = null;
    for (c of Array.from(this.characters.slice().reverse())) {
      c._runLengthMap = {};
      c._runLengthMapSize = 0;
      var closingTags = [];
      for (var openTag of Array.from(openTags.slice().reverse())) {
        closingTags.push(openTag);
        if (!c.hasTags(openTag)) {
          for (var closingTag of Array.from(closingTags)) {
            openTags.pop();
            openHeads.pop();
          }
          closingTags = [];
        }
      }
      for (tag of Array.from(c._tags)) {
        if (openHeads.indexOf(tag.head()) === -1) {
          if (!tag.selfClosing()) {
            openTags.push(tag);
            openHeads.push(tag.head());
          }
        }
      }
      for (tag of Array.from(openTags)) {
        var head = tag.head();
        if (!lastC) {
          c._runLengthMap[head] = [tag, 1];
          continue;
        }
        if (!c._runLengthMap[head]) {
          c._runLengthMap[head] = [tag, 0];
        }
        var run_length = 0;
        if (lastC._runLengthMap[head]) {
          run_length = lastC._runLengthMap[head][1];
        }
        c._runLengthMap[head][1] = run_length + 1;
      }
      lastC = c;
    }
    const runLengthSort = (a, b) => b[1] - a[1];
    return (() => {
      const result = [];
      for (c of Array.from(this.characters)) {
        var len = c._tags.length;
        if (len > 0 && c._tags[0].selfClosing() && len < 3 || len < 2) {
          continue;
        }
        var runLengths = [];
        for (tag in c._runLengthMap) {
          var runLength = c._runLengthMap[tag];
          runLengths.push(runLength);
        }
        runLengths.sort(runLengthSort);
        for (tag of Array.from(c._tags.slice())) {
          if (!tag.selfClosing()) {
            c.removeTags(tag);
          }
        }
        result.push(c.addTags.apply(c, Array.from(runLengths).map((t) => t[0])));
      }
      return result;
    })();
  }
  slice(from, to) {
    const newString = new HTMLString.String("", this._preserveWhitespace);
    newString.characters = Array.from(this.characters.slice(from, to)).map((c) => c.copy());
    return newString;
  }
  split(separator, limit) {
    if (separator == null) {
      separator = "";
    }
    if (limit == null) {
      limit = 0;
    }
    let lastIndex = 0;
    const count = 0;
    const indexes = [0];
    while (true) {
      if (limit > 0 && count > limit) {
        break;
      }
      var index = this.indexOf(separator, lastIndex);
      if (index === -1) {
        break;
      }
      indexes.push(index);
      lastIndex = index + 1;
    }
    indexes.push(this.length());
    const substrings = [];
    for (let i = 0, end1 = indexes.length - 2, asc = 0 <= end1; asc ? i <= end1 : i >= end1; asc ? i++ : i--) {
      var start = indexes[i];
      if (i > 0) {
        start += 1;
      }
      var end = indexes[i + 1];
      substrings.push(this.slice(start, end));
    }
    return substrings;
  }
  startsWith(substring) {
    if (typeof substring === "string") {
      return this.text().slice(0, substring.length) === substring;
    }
    for (let i = 0; i < substring.characters.length; i++) {
      var c = substring.characters[i];
      if (!c.eq(this.characters[i])) {
        return false;
      }
    }
    return true;
  }
  substr(from, length) {
    if (length <= 0) {
      return new HTMLString.String("", this._preserveWhitespace);
    }
    if (from < 0) {
      from = this.length() + from;
    }
    if (length === void 0) {
      length = this.length() - from;
    }
    return this.slice(from, from + length);
  }
  substring(from, to) {
    if (to === void 0) {
      to = this.length();
    }
    return this.slice(from, to);
  }
  text() {
    let text = "";
    for (var c of Array.from(this.characters)) {
      if (c.isTag()) {
        if (c.isTag("br")) {
          text += "\n";
        }
        continue;
      }
      if (c.c() === "&nbsp;") {
        text += c.c();
        continue;
      }
      text += c.c();
    }
    return this.constructor.decode(text);
  }
  toLowerCase() {
    const newString = this.copy();
    for (var c of Array.from(newString.characters)) {
      if (c._c.length === 1) {
        c._c = c._c.toLowerCase();
      }
    }
    return newString;
  }
  toUpperCase() {
    const newString = this.copy();
    for (var c of Array.from(newString.characters)) {
      if (c._c.length === 1) {
        c._c = c._c.toUpperCase();
      }
    }
    return newString;
  }
  trim() {
    let from, to;
    let c;
    for (from = 0; from < this.characters.length; from++) {
      c = this.characters[from];
      if (!c.isWhitespace()) {
        break;
      }
    }
    const iterable = this.characters.slice().reverse();
    for (to = 0; to < iterable.length; to++) {
      c = iterable[to];
      if (!c.isWhitespace()) {
        break;
      }
    }
    to = this.length() - to - 1;
    const newString = new HTMLString.String("", this._preserveWhitespace);
    newString.characters = (() => {
      const result = [];
      for (c of Array.from(this.characters.slice(from, +to + 1 || void 0))) {
        result.push(c.copy());
      }
      return result;
    })();
    return newString;
  }
  trimLeft() {
    let from;
    let c;
    const to = this.length() - 1;
    for (from = 0; from < this.characters.length; from++) {
      c = this.characters[from];
      if (!c.isWhitespace()) {
        break;
      }
    }
    const newString = new HTMLString.String("", this._preserveWhitespace);
    newString.characters = (() => {
      const result = [];
      for (c of Array.from(this.characters.slice(from, +to + 1 || void 0))) {
        result.push(c.copy());
      }
      return result;
    })();
    return newString;
  }
  trimRight() {
    let to;
    let c;
    const from = 0;
    const iterable = this.characters.slice().reverse();
    for (to = 0; to < iterable.length; to++) {
      c = iterable[to];
      if (!c.isWhitespace()) {
        break;
      }
    }
    to = this.length() - to - 1;
    const newString = new HTMLString.String("", this._preserveWhitespace);
    newString.characters = (() => {
      const result = [];
      for (c of Array.from(this.characters.slice(from, +to + 1 || void 0))) {
        result.push(c.copy());
      }
      return result;
    })();
    return newString;
  }
  unformat(from, to, ...tags) {
    if (to < 0) {
      to = this.length() + to + 1;
    }
    if (from < 0) {
      from = this.length() + from;
    }
    const newString = this.copy();
    for (let i = from, end = to, asc = from <= end; asc ? i < end : i > end; asc ? i++ : i--) {
      var c = newString.characters[i];
      c.removeTags.apply(c, tags);
    }
    return newString;
  }
  copy() {
    const stringCopy = new HTMLString.String("", this._preserveWhitespace);
    stringCopy.characters = Array.from(this.characters).map((c) => c.copy());
    return stringCopy;
  }
  // Class methods
  static decode(string) {
    const textarea = rootContext().createElement("textarea");
    textarea.innerHTML = string;
    return textarea.textContent;
  }
  static encode(string) {
    const textarea = rootContext().createElement("textarea");
    textarea.textContent = string;
    return textarea.innerHTML;
  }
  static join(separator, strings) {
    let joined = strings.shift();
    for (var s of Array.from(strings)) {
      joined = joined.concat(separator, s);
    }
    return joined;
  }
};
Cls$strings.initClass();
const ALPHA_CHARS = "AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz-_$".split("");
const ALPHA_NUMERIC_CHARS = ALPHA_CHARS.concat("1234567890".split(""));
const ATTR_NAME_CHARS = ALPHA_NUMERIC_CHARS.concat([":"]);
const ENTITY_CHARS = ALPHA_NUMERIC_CHARS.concat(["#"]);
const TAG_NAME_CHARS = ALPHA_NUMERIC_CHARS.concat([":"]);
const CHAR_OR_ENTITY_OR_TAG = 1;
const ENTITY = 2;
const OPENNING_OR_CLOSING_TAG = 3;
const OPENING_TAG = 4;
const CLOSING_TAG = 5;
const TAG_NAME_OPENING = 6;
const TAG_NAME_CLOSING = 7;
const TAG_OPENING_SELF_CLOSING = 8;
const TAG_NAME_MUST_CLOSE = 9;
const ATTR_OR_TAG_END = 10;
const ATTR_NAME = 11;
const ATTR_NAME_FIND_VALUE = 12;
const ATTR_DELIM = 13;
const ATTR_VALUE_SINGLE_DELIM = 14;
const ATTR_VALUE_DOUBLE_DELIM = 15;
const ATTR_VALUE_NO_DELIM = 16;
const ATTR_ENTITY_NO_DELIM = 17;
const ATTR_ENTITY_SINGLE_DELIM = 18;
const ATTR_ENTITY_DOUBLE_DELIM = 19;
class _Parser {
  // A HTML parser for creating HTML strings
  constructor() {
    this.fsm = new FSM.Machine(this);
    this.fsm.setInitialState(CHAR_OR_ENTITY_OR_TAG);
    this.fsm.addTransitionAny(CHAR_OR_ENTITY_OR_TAG, null, function(c) {
      return this._pushChar(c);
    });
    this.fsm.addTransition("<", CHAR_OR_ENTITY_OR_TAG, OPENNING_OR_CLOSING_TAG);
    this.fsm.addTransition("&", CHAR_OR_ENTITY_OR_TAG, ENTITY);
    this.fsm.addTransitions(ENTITY_CHARS, ENTITY, null, function(c) {
      return this.entity += c;
    });
    this.fsm.addTransition(";", ENTITY, CHAR_OR_ENTITY_OR_TAG, function() {
      this._pushChar(`&${this.entity};`);
      return this.entity = "";
    });
    this.fsm.addTransitions([" ", "\n"], OPENNING_OR_CLOSING_TAG);
    this.fsm.addTransitions(ALPHA_CHARS, OPENNING_OR_CLOSING_TAG, OPENING_TAG, function() {
      return this._back();
    });
    this.fsm.addTransition("/", OPENNING_OR_CLOSING_TAG, CLOSING_TAG);
    this.fsm.addTransitions([" ", "\n"], OPENING_TAG);
    this.fsm.addTransitions(ALPHA_CHARS, OPENING_TAG, TAG_NAME_OPENING, function() {
      return this._back();
    });
    this.fsm.addTransitions([" ", "\n"], CLOSING_TAG);
    this.fsm.addTransitions(ALPHA_CHARS, CLOSING_TAG, TAG_NAME_CLOSING, function() {
      return this._back();
    });
    this.fsm.addTransitions(TAG_NAME_CHARS, TAG_NAME_OPENING, null, function(c) {
      return this.tagName += c;
    });
    this.fsm.addTransitions([" ", "\n"], TAG_NAME_OPENING, ATTR_OR_TAG_END);
    this.fsm.addTransition("/", TAG_NAME_OPENING, TAG_OPENING_SELF_CLOSING, function() {
      return this.selfClosing = true;
    });
    this.fsm.addTransition(">", TAG_NAME_OPENING, CHAR_OR_ENTITY_OR_TAG, function() {
      return this._pushTag();
    });
    this.fsm.addTransitions([" ", "\n"], TAG_OPENING_SELF_CLOSING);
    this.fsm.addTransition(">", TAG_OPENING_SELF_CLOSING, CHAR_OR_ENTITY_OR_TAG, function() {
      return this._pushTag();
    });
    this.fsm.addTransitions([" ", "\n"], ATTR_OR_TAG_END);
    this.fsm.addTransition("/", ATTR_OR_TAG_END, TAG_OPENING_SELF_CLOSING, function() {
      return this.selfClosing = true;
    });
    this.fsm.addTransition(">", ATTR_OR_TAG_END, CHAR_OR_ENTITY_OR_TAG, function() {
      return this._pushTag();
    });
    this.fsm.addTransitions(ALPHA_CHARS, ATTR_OR_TAG_END, ATTR_NAME, function() {
      return this._back();
    });
    this.fsm.addTransitions(TAG_NAME_CHARS, TAG_NAME_CLOSING, null, function(c) {
      return this.tagName += c;
    });
    this.fsm.addTransitions([" ", "\n"], TAG_NAME_CLOSING, TAG_NAME_MUST_CLOSE);
    this.fsm.addTransition(">", TAG_NAME_CLOSING, CHAR_OR_ENTITY_OR_TAG, function() {
      return this._popTag();
    });
    this.fsm.addTransitions([" ", "\n"], TAG_NAME_MUST_CLOSE);
    this.fsm.addTransition(">", TAG_NAME_MUST_CLOSE, CHAR_OR_ENTITY_OR_TAG, function() {
      return this._popTag();
    });
    this.fsm.addTransitions(ATTR_NAME_CHARS, ATTR_NAME, null, function(c) {
      return this.attributeName += c;
    });
    this.fsm.addTransitions([" ", "\n"], ATTR_NAME, ATTR_NAME_FIND_VALUE);
    this.fsm.addTransition("=", ATTR_NAME, ATTR_DELIM);
    this.fsm.addTransitions([" ", "\n"], ATTR_NAME_FIND_VALUE);
    this.fsm.addTransition("=", ATTR_NAME_FIND_VALUE, ATTR_DELIM);
    this.fsm.addTransitions(">", ATTR_NAME, ATTR_OR_TAG_END, function() {
      this._pushAttribute();
      return this._back();
    });
    this.fsm.addTransitionAny(ATTR_NAME_FIND_VALUE, ATTR_OR_TAG_END, function() {
      this._pushAttribute();
      return this._back();
    });
    this.fsm.addTransitions([" ", "\n"], ATTR_DELIM);
    this.fsm.addTransition("'", ATTR_DELIM, ATTR_VALUE_SINGLE_DELIM);
    this.fsm.addTransition('"', ATTR_DELIM, ATTR_VALUE_DOUBLE_DELIM);
    this.fsm.addTransitions(
      ALPHA_NUMERIC_CHARS.concat(["&"], ATTR_DELIM, ATTR_VALUE_NO_DELIM, function() {
        return this._back();
      })
    );
    this.fsm.addTransition(" ", ATTR_VALUE_NO_DELIM, ATTR_OR_TAG_END, function() {
      return this._pushAttribute();
    });
    this.fsm.addTransitions(["/", ">"], ATTR_VALUE_NO_DELIM, ATTR_OR_TAG_END, function() {
      this._back();
      return this._pushAttribute();
    });
    this.fsm.addTransition("&", ATTR_VALUE_NO_DELIM, ATTR_ENTITY_NO_DELIM);
    this.fsm.addTransitionAny(ATTR_VALUE_NO_DELIM, null, function(c) {
      return this.attributeValue += c;
    });
    this.fsm.addTransition("'", ATTR_VALUE_SINGLE_DELIM, ATTR_OR_TAG_END, function() {
      return this._pushAttribute();
    });
    this.fsm.addTransition("&", ATTR_VALUE_SINGLE_DELIM, ATTR_ENTITY_SINGLE_DELIM);
    this.fsm.addTransitionAny(ATTR_VALUE_SINGLE_DELIM, null, function(c) {
      return this.attributeValue += c;
    });
    this.fsm.addTransition('"', ATTR_VALUE_DOUBLE_DELIM, ATTR_OR_TAG_END, function() {
      return this._pushAttribute();
    });
    this.fsm.addTransition("&", ATTR_VALUE_DOUBLE_DELIM, ATTR_ENTITY_DOUBLE_DELIM);
    this.fsm.addTransitionAny(ATTR_VALUE_DOUBLE_DELIM, null, function(c) {
      return this.attributeValue += c;
    });
    this.fsm.addTransitions(ENTITY_CHARS, ATTR_ENTITY_NO_DELIM, null, function(c) {
      return this.entity += c;
    });
    this.fsm.addTransitions(ENTITY_CHARS, ATTR_ENTITY_SINGLE_DELIM, function(c) {
      return this.entity += c;
    });
    this.fsm.addTransitions(ENTITY_CHARS, ATTR_ENTITY_DOUBLE_DELIM, null, function(c) {
      return this.entity += c;
    });
    this.fsm.addTransition(";", ATTR_ENTITY_NO_DELIM, ATTR_VALUE_NO_DELIM, function() {
      this.attributeValue += `&${this.entity};`;
      return this.entity = "";
    });
    this.fsm.addTransition(";", ATTR_ENTITY_SINGLE_DELIM, ATTR_VALUE_SINGLE_DELIM, function() {
      this.attributeValue += `&${this.entity};`;
      return this.entity = "";
    });
    this.fsm.addTransition(";", ATTR_ENTITY_DOUBLE_DELIM, ATTR_VALUE_DOUBLE_DELIM, function() {
      this.attributeValue += `&${this.entity};`;
      return this.entity = "";
    });
  }
  // Parsing methods
  _back() {
    return this.head--;
  }
  _pushAttribute() {
    this.attributes[this.attributeName] = this.attributeValue;
    this.attributeName = "";
    return this.attributeValue = "";
  }
  _pushChar(c) {
    const character = new HTMLString.Character(c, this.tags);
    if (this._preserveWhitespace) {
      this.string.characters.push(character);
      return;
    }
    if (this.string.length() && !character.isTag() && !character.isEntity() && character.isWhitespace()) {
      const lastCharacter = this.string.characters[this.string.length() - 1];
      if (lastCharacter.isWhitespace() && !lastCharacter.isTag() && !lastCharacter.isEntity()) {
        return;
      }
    }
    return this.string.characters.push(character);
  }
  _pushTag() {
    const tag = new HTMLString.Tag(this.tagName, this.attributes);
    this.tags.push(tag);
    if (tag.selfClosing()) {
      this._pushChar("");
      this.tags.pop();
      if (!this.selfClosed && Array.from(HTMLString.Tag.SELF_CLOSING).includes(this.tagName)) {
        this.fsm.reset();
      }
    }
    this.tagName = "";
    this.selfClosed = false;
    return this.attributes = {};
  }
  _popTag() {
    while (true) {
      var tag = this.tags.pop();
      if (this.string.length()) {
        var character = this.string.characters[this.string.length() - 1];
        if (!character.isTag() && !character.isEntity() && character.isWhitespace()) {
          character.removeTags(tag);
        }
      }
      if (tag.name() === this.tagName.toLowerCase()) {
        break;
      }
    }
    return this.tagName = "";
  }
  // Methods
  parse(html, preserveWhitespace) {
    this._preserveWhitespace = preserveWhitespace;
    this.reset();
    html = this.preprocess(html);
    this.fsm.parser = this;
    while (this.head < html.length) {
      var character = html[this.head];
      try {
        this.fsm.process(character);
      } catch (error) {
        throw new Error(`Error at char ${this.head} >> ${error}`);
      }
      this.head++;
    }
    return this.string;
  }
  preprocess(html) {
    html = html.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    html = html.replace(/<!--[\s\S]*?-->/g, "");
    if (!this._preserveWhitespace) {
      html = html.replace(/\s+/g, " ");
    }
    return html;
  }
  reset() {
    this.fsm.reset();
    this.head = 0;
    this.string = new HTMLString.String();
    this.entity = "";
    this.tags = [];
    this.tagName = "";
    this.selfClosing = false;
    this.attributes = {};
    this.attributeName = "";
    return this.attributeValue = "";
  }
}
const Cls$tags = HTMLString.Tag = class Tag {
  static initClass() {
    this.SELF_CLOSING = {
      "area": true,
      "base": true,
      "br": true,
      "hr": true,
      "img": true,
      "input": true,
      "link meta": true,
      "wbr": true
    };
  }
  // A HTML tag
  constructor(name, attributes) {
    this._name = name.toLowerCase();
    this._selfClosing = HTMLString.Tag.SELF_CLOSING[this._name] === true;
    this._head = null;
    this._attributes = {};
    for (var k in attributes) {
      var v = attributes[k];
      this._attributes[k] = v;
    }
  }
  // Read only properties
  head() {
    if (!this._head) {
      const components = [];
      for (var k in this._attributes) {
        var v = this._attributes[k];
        if (v) {
          components.push(`${k}="${v}"`);
        } else {
          components.push(`${k}`);
        }
      }
      components.sort();
      components.unshift(this._name);
      this._head = `<${components.join(" ")}>`;
    }
    return this._head;
  }
  name() {
    return this._name;
  }
  selfClosing() {
    return this._selfClosing;
  }
  tail() {
    if (this._selfClosing) {
      return "";
    }
    return `</${this._name}>`;
  }
  // Methods
  attr(name, value) {
    if (value === void 0) {
      return this._attributes[name];
    }
    this._attributes[name] = value;
    return this._head = null;
  }
  removeAttr(name) {
    if (this._attributes[name] === void 0) {
      return;
    }
    delete this._attributes[name];
    return this._head = null;
  }
  copy() {
    return new HTMLString.Tag(this._name, this._attributes);
  }
};
Cls$tags.initClass();
HTMLString.Character = class Character {
  // A HTML character
  constructor(c, tags) {
    this._c = c;
    if (c.length > 1) {
      this._c = c.toLowerCase();
    }
    this._tags = [];
    this.addTags.apply(this, tags);
  }
  // Read-only properties
  c() {
    return this._c;
  }
  isEntity() {
    return this._c.length > 1;
  }
  isTag(tagName) {
    if (this._tags.length === 0 || !this._tags[0].selfClosing()) {
      return false;
    }
    if (tagName && this._tags[0].name() !== tagName) {
      return false;
    }
    return true;
  }
  isWhitespace() {
    return [" ", "\n", "&nbsp;"].includes(this._c) || this.isTag("br");
  }
  tags() {
    return Array.from(this._tags).map((t) => t.copy());
  }
  // Methods
  addTags(...tags) {
    return (() => {
      const result = [];
      for (var tag of Array.from(tags)) {
        if (Array.isArray(tag)) {
          continue;
        }
        if (tag.selfClosing()) {
          if (!this.isTag()) {
            this._tags.unshift(tag.copy());
          }
          continue;
        }
        result.push(this._tags.push(tag.copy()));
      }
      return result;
    })();
  }
  eq(c) {
    let tag;
    if (this.c() !== c.c()) {
      return false;
    }
    if (this._tags.length !== c._tags.length) {
      return false;
    }
    const tags = {};
    for (tag of Array.from(this._tags)) {
      tags[tag.head()] = true;
    }
    for (tag of Array.from(c._tags)) {
      if (!tags[tag.head()]) {
        return false;
      }
    }
    return true;
  }
  hasTags(...tags) {
    let tag;
    const tagNames = {};
    const tagHeads = {};
    for (tag of Array.from(this._tags)) {
      tagNames[tag.name()] = true;
      tagHeads[tag.head()] = true;
    }
    for (tag of Array.from(tags)) {
      if (typeof tag === "string") {
        if (tagNames[tag] === void 0) {
          return false;
        }
      } else {
        if (tagHeads[tag.head()] === void 0) {
          return false;
        }
      }
    }
    return true;
  }
  removeTags(...tags) {
    if (tags.length === 0) {
      this._tags = [];
      return;
    }
    const names = {};
    const heads = {};
    for (var tag of Array.from(tags)) {
      if (typeof tag === "string") {
        names[tag] = tag;
      } else {
        heads[tag.head()] = tag;
      }
    }
    return this._tags = this._tags.filter(function(tag2) {
      if (!heads[tag2.head()] && !names[tag2.name()]) {
        return tag2;
      }
    });
  }
  copy() {
    return new HTMLString.Character(this._c, Array.from(this._tags).map((t) => t.copy()));
  }
};
const ContentSelect = {};
ContentSelect.Range = class Range {
  // A range representing a content selection on the page
  constructor(from, to) {
    this.set(from, to);
  }
  // Read-only properties
  isCollapsed() {
    return this._from === this._to;
  }
  span() {
    return this._to - this._from;
  }
  // Methods
  collapse() {
    return this._to = this._from;
  }
  eq(range) {
    return this.get()[0] === range.get()[0] && this.get()[1] === range.get()[1];
  }
  get() {
    return [this._from, this._to];
  }
  select(element) {
    ContentSelect.Range.unselectAll();
    const docRange = rootContext().createRange();
    const [startNode, startOffset] = Array.from(_getChildNodeAndOffset(element, this._from));
    const [endNode, endOffset] = Array.from(_getChildNodeAndOffset(element, this._to));
    const startNodeLen = startNode.length || 0;
    const endNodeLen = endNode.length || 0;
    docRange.setStart(startNode, Math.min(startOffset, startNodeLen));
    docRange.setEnd(endNode, Math.min(endOffset, endNodeLen));
    return rootContext().selectRange(docRange);
  }
  set(from, to) {
    from = Math.max(0, from);
    to = Math.max(0, to);
    this._from = Math.min(from, to);
    return this._to = Math.max(from, to);
  }
  // Class methods
  static prepareElement(element) {
    const selfClosingNodes = element.querySelectorAll(
      SELF_CLOSING_NODE_NAMES.join(", ")
    );
    return (() => {
      const result = [];
      for (let i = 0; i < selfClosingNodes.length; i++) {
        var node = selfClosingNodes[i];
        node.parentNode.insertBefore(rootContext().createTextNode(""), node);
        if (i < selfClosingNodes.length - 1) {
          result.push(node.parentNode.insertBefore(
            rootContext().createTextNode(""),
            node.nextSibling
          ));
        } else {
          result.push(void 0);
        }
      }
      return result;
    })();
  }
  static query(element) {
    const range = new ContentSelect.Range(0, 0);
    const docRange = rootContext().getRange();
    if (!docRange) {
      return range;
    }
    if (element.firstChild === null && element.lastChild === null) {
      return range;
    }
    if (!_containedBy(docRange.startContainer, element)) {
      return range;
    }
    if (!_containedBy(docRange.endContainer, element)) {
      return range;
    }
    const [startNode, startOffset, endNode, endOffset] = Array.from(_getNodeRange(
      element,
      docRange
    ));
    range.set(
      _getOffsetOfChildNode(element, startNode) + startOffset,
      _getOffsetOfChildNode(element, endNode) + endOffset
    );
    return range;
  }
  static rect() {
    const docRange = rootContext().getRange();
    if (!docRange) {
      return null;
    }
    if (docRange.collapsed) {
      const marker = rootContext().createElement("span");
      docRange.insertNode(marker);
      const rect = marker.getBoundingClientRect();
      marker.parentNode.removeChild(marker);
      return rect;
    } else {
      return docRange.getBoundingClientRect();
    }
  }
  static unselectAll() {
    return rootContext().clearSelection();
  }
};
var SELF_CLOSING_NODE_NAMES = ["br", "img", "input"];
var _containedBy = function(nodeA, nodeB) {
  while (nodeA) {
    if (nodeA === nodeB) {
      return true;
    }
    nodeA = nodeA.parentNode;
  }
  return false;
};
var _getChildNodeAndOffset = function(parentNode, parentOffset) {
  let n;
  if (parentNode.childNodes.length === 0) {
    return [parentNode, parentOffset];
  }
  let childNode = null;
  let childOffset = parentOffset;
  const childStack = (() => {
    const result = [];
    for (n of Array.from(parentNode.childNodes)) {
      result.push(n);
    }
    return result;
  })();
  while (childStack.length > 0) {
    var needle;
    childNode = childStack.shift();
    switch (childNode.nodeType) {
      // Text nodes
      case Node.TEXT_NODE:
        if (childNode.textContent.length >= childOffset) {
          return [childNode, childOffset];
        }
        childOffset -= childNode.textContent.length;
        break;
      // Elements
      case Node.ELEMENT_NODE:
        if (needle = childNode.nodeName.toLowerCase(), Array.from(SELF_CLOSING_NODE_NAMES).includes(needle)) {
          if (childOffset === 0) {
            return [childNode, 0];
          } else {
            childOffset = Math.max(0, childOffset - 1);
          }
        } else {
          if (childNode.childNodes) {
            Array.prototype.unshift.apply(
              childStack,
              (() => {
                const result1 = [];
                for (n of Array.from(childNode.childNodes)) {
                  result1.push(n);
                }
                return result1;
              })()
            );
          }
        }
        break;
    }
  }
  return [childNode, childOffset];
};
var _getOffsetOfChildNode = function(parentNode, childNode) {
  let n;
  if (parentNode.childNodes.length === 0) {
    return 0;
  }
  let offset = 0;
  const childStack = (() => {
    const result = [];
    for (n of Array.from(parentNode.childNodes)) {
      result.push(n);
    }
    return result;
  })();
  while (childStack.length > 0) {
    var needle1;
    var otherChildNode = childStack.shift();
    if (otherChildNode === childNode) {
      var needle;
      if (needle = otherChildNode.nodeName.toLowerCase(), Array.from(SELF_CLOSING_NODE_NAMES).includes(needle)) {
        return offset + 1;
      }
      return offset;
    }
    switch (otherChildNode.nodeType) {
      // Text nodes
      case Node.TEXT_NODE:
        offset += otherChildNode.textContent.length;
        break;
      // Elements
      case Node.ELEMENT_NODE:
        if (needle1 = otherChildNode.nodeName.toLowerCase(), Array.from(SELF_CLOSING_NODE_NAMES).includes(needle1)) {
          offset += 1;
        } else {
          if (otherChildNode.childNodes) {
            Array.prototype.unshift.apply(
              childStack,
              (() => {
                const result1 = [];
                for (n of Array.from(otherChildNode.childNodes)) {
                  result1.push(n);
                }
                return result1;
              })()
            );
          }
        }
        break;
    }
  }
  return offset;
};
var _getNodeRange = function(element, docRange) {
  let childNode, i;
  const {
    childNodes
  } = element;
  const startRange = docRange.cloneRange();
  startRange.collapse(true);
  const endRange = docRange.cloneRange();
  endRange.collapse(false);
  let startNode = startRange.startContainer;
  let {
    startOffset
  } = startRange;
  let endNode = endRange.endContainer;
  let {
    endOffset
  } = endRange;
  if (!startRange.comparePoint) {
    return [startNode, startOffset, endNode, endOffset];
  }
  if (startNode === element) {
    startNode = childNodes[childNodes.length - 1];
    startOffset = startNode.textContent.length;
    for (i = 0; i < childNodes.length; i++) {
      childNode = childNodes[i];
      if (startRange.comparePoint(childNode, 0) !== 1) {
        continue;
      }
      if (i === 0) {
        startNode = childNode;
        startOffset = 0;
      } else {
        startNode = childNodes[i - 1];
        startOffset = childNode.textContent.length;
      }
      if (Array.from(SELF_CLOSING_NODE_NAMES).includes(startNode.nodeName.toLowerCase)) {
        startOffset = 1;
      }
      break;
    }
  }
  if (docRange.collapsed) {
    return [startNode, startOffset, startNode, startOffset];
  }
  if (endNode === element) {
    endNode = childNodes[childNodes.length - 1];
    endOffset = endNode.textContent.length;
    for (i = 0; i < childNodes.length; i++) {
      childNode = childNodes[i];
      if (endRange.comparePoint(childNode, 0) !== 1) {
        continue;
      }
      if (i === 0) {
        endNode = childNode;
      } else {
        endNode = childNodes[i - 1];
      }
      endOffset = childNode.textContent.length + 1;
    }
  }
  return [startNode, startOffset, endNode, endOffset];
};
const ContentEdit = {
  // Strictly increasing modification stamp. See Node.taint().
  _lastModifiedStamp: 0,
  _nextModifiedStamp() {
    const now = Date.now();
    ContentEdit._lastModifiedStamp = now > ContentEdit._lastModifiedStamp ? now : ContentEdit._lastModifiedStamp + 1;
    return ContentEdit._lastModifiedStamp;
  },
  // Global settings
  // The CSS class names used when an element is drag aligned to the left or
  // right of another element.
  ALIGNMENT_CLASS_NAMES: {
    "left": "align-left",
    "right": "align-right"
  },
  // The default min/max constraints (in pixels) for element that can be
  // resized (`ContentEdit.ResizableElement`). The default values are used when
  // a min/max width has not been set using the custom attributes
  // `data-ce-max-width` and `data-ce-min-width`.
  DEFAULT_MAX_ELEMENT_WIDTH: 800,
  DEFAULT_MIN_ELEMENT_WIDTH: 80,
  // Some elements such as images are dragged simply by clicking on them and
  // moving the mouse. Others like text handle click events differently (for
  // example focusing the element so text can be edited), these element support
  // dragging behaviour when a user clicks and holds (without moving the
  // mouse). The duration of the hold is determined in milliseconds.
  DRAG_HOLD_DURATION: 500,
  // The size (in pixels) of the edges used to switch horizontal placement
  // (e.g drop left/right) when dragging an element over another (for
  // example an image being dragged to the right edge of a text element).
  DROP_EDGE_SIZE: 50,
  // Set this to true to allow elements to be cloned when dragged them with
  // the alt key depressed.
  ENABLE_DRAG_CLONING: false,
  // The maximum number of characters to insert into a helper (for example the
  // helper tool that appears when dragging elements).
  HELPER_CHAR_LIMIT: 250,
  // String to use for a single indent. For example if you wanted html to
  // return HTML indented using tabs instead of spaces you could set this to
  // `\t`.
  INDENT: "    ",
  // The current language. Must be a a 2 digit ISO_639-1 code.
  LANGUAGE: "en",
  // String used for  line endings when formatting the HTML output of editable
  // elements.
  LINE_ENDINGS: "\n",
  // By default a new paragraph `<p>` is created when the enter/return key is
  // pressed, to insert a line-break `<br>` the shift key can be held down when
  // pressing enter. This behaviour can be reversed by setting the preference
  // to be for line-breaks.
  PREFER_LINE_BREAKS: false,
  // The size (in pixels) of the corner region used to detect a resize event
  // against an element. To resize an element (for example an image or video)
  // the user must click in a corner region of an element. The size is
  // automatically reduced for small elements where the corner size represents
  // more than a 1/4 of the total size.
  RESIZE_CORNER_SIZE: 15,
  // If true then whitespace will be stripped from the start and end of
  // editable elements with text content, if false then &nbsp; and <br> tags
  // will be preserved.
  TRIM_WHITESPACE: true,
  // Translation - the ContentEdit library provides basic translation support
  // which is used both by the library itself and the associated ContentTools
  // library.
  _translations: {},
  _(s) {
    const lang = ContentEdit.LANGUAGE;
    if (ContentEdit._translations[lang] && ContentEdit._translations[lang][s]) {
      return ContentEdit._translations[lang][s];
    }
    return s;
  },
  addTranslations(language, translations) {
    return ContentEdit._translations[language] = translations;
  },
  // Utility functions
  addCSSClass(domElement, className) {
    if (domElement.classList) {
      domElement.classList.add(className);
      return;
    }
    const classAttr = domElement.getAttribute("class");
    if (classAttr) {
      const classNames = Array.from(classAttr.split(" "));
      if (classNames.indexOf(className) === -1) {
        return domElement.setAttribute(
          "class",
          `${classAttr} ${className}`
        );
      }
    } else {
      return domElement.setAttribute("class", className);
    }
  },
  attributesToString(attributes) {
    let name;
    if (!attributes) {
      return "";
    }
    const names = (() => {
      const result = [];
      for (name in attributes) {
        result.push(name);
      }
      return result;
    })();
    names.sort();
    const attributeStrings = [];
    for (name of Array.from(names)) {
      var value = attributes[name];
      if (value === "") {
        attributeStrings.push(name);
      } else {
        value = HTMLString.String.encode(value);
        value = value.replace(/"/g, "&quot;");
        attributeStrings.push(`${name}="${value}"`);
      }
    }
    return attributeStrings.join(" ");
  },
  removeCSSClass(domElement, className) {
    if (domElement.classList) {
      domElement.classList.remove(className);
      if (domElement.classList.length === 0) {
        domElement.removeAttribute("class");
      }
      return;
    }
    const classAttr = domElement.getAttribute("class");
    if (classAttr) {
      const classNames = Array.from(classAttr.split(" "));
      const classNameIndex = classNames.indexOf(className);
      if (classNameIndex > -1) {
        classNames.splice(classNameIndex, 1);
        if (classNames.length) {
          return domElement.setAttribute(
            "class",
            classNames.join(" ")
          );
        } else {
          return domElement.removeAttribute("class");
        }
      }
    }
  }
};
class _TagNames {
  // The `_TagNames` class allows DOM element tag names to be associated with
  // `ContentEdit.Element` classes. When a region is initialized it uses this
  // association to determine how best to handle each DOM element child.
  //
  // DOM element tag names are associated with element classes through the
  // `register()` method. To handle cases where the same tag name is used for
  // more than one element class the `data-ce-tag` attribute can be used to
  // specify a tag name. This is also useful when you want to specify a tag
  // name that isn't valid in HTML (e.g <foo>...</foo> could be specified as
  // <p data-ce-tag="foo">...</p>).
  constructor() {
    this._tagNames = {};
  }
  register(cls, ...tagNames) {
    return Array.from(tagNames).map((tagName) => this._tagNames[tagName.toLowerCase()] = cls);
  }
  match(tagName) {
    tagName = tagName.toLowerCase();
    if (this._tagNames[tagName]) {
      return this._tagNames[tagName];
    }
    return ContentEdit.Static;
  }
}
(function() {
  let instance = void 0;
  const Cls$tag_names = ContentEdit.TagNames = class TagNames {
    static initClass() {
      instance = null;
    }
    static get() {
      return instance != null ? instance : instance = new _TagNames();
    }
  };
  Cls$tag_names.initClass();
  return Cls$tag_names;
})();
ContentEdit.Node = class Node2 {
  // Editable content is structured as a tree, each node in the tree is an
  // instance of a class that inherits from the base `Node` class.
  constructor() {
    this._bindings = {};
    this._parent = null;
    this._modified = null;
  }
  // Read-only properties
  lastModified() {
    return this._modified;
  }
  parent() {
    return this._parent;
  }
  parents() {
    const parents = [];
    let parent = this._parent;
    while (parent) {
      parents.push(parent);
      parent = parent._parent;
    }
    return parents;
  }
  type() {
    return "Node";
  }
  // Methods
  html(indent) {
    throw new Error("`html` not implemented");
  }
  // Event methods
  bind(eventName, callback) {
    if (this._bindings[eventName] === void 0) {
      this._bindings[eventName] = [];
    }
    this._bindings[eventName].push(callback);
    return callback;
  }
  trigger(eventName, ...args) {
    if (!this._bindings[eventName]) {
      return;
    }
    return (() => {
      const result = [];
      for (var callback of Array.from(this._bindings[eventName])) {
        if (!callback) {
          continue;
        }
        result.push(callback.call(this, ...Array.from(args)));
      }
      return result;
    })();
  }
  unbind(eventName, callback) {
    if (!eventName) {
      this._bindings = {};
      return;
    }
    if (!callback) {
      this._bindings[eventName] = void 0;
      return;
    }
    if (!this._bindings[eventName]) {
      return;
    }
    return (() => {
      const result = [];
      for (let i = 0; i < this._bindings[eventName].length; i++) {
        var suspect = this._bindings[eventName][i];
        if (suspect === callback) {
          result.push(this._bindings[eventName].splice(i, 1));
        } else {
          result.push(void 0);
        }
      }
      return result;
    })();
  }
  // Change tracking methods
  commit() {
    this._modified = null;
    return ContentEdit.Root.get().trigger("commit", this);
  }
  taint() {
    const now = ContentEdit._nextModifiedStamp();
    this._modified = now;
    for (var parent of Array.from(this.parents())) {
      parent._modified = now;
    }
    const root = ContentEdit.Root.get();
    root._modified = now;
    return root.trigger("taint", this);
  }
  // Navigation methods
  closest(testFunc) {
    let parent = this.parent();
    while (parent && !testFunc(parent)) {
      if (parent.parent) {
        parent = parent.parent();
      } else {
        parent = null;
      }
    }
    return parent;
  }
  // The next and previous methods provide a mechanism for navigating elements
  // in the editable content tree as a flat structure.
  next() {
    const self = this;
    if (self.children && self.children.length > 0) {
      return self.children[0];
    }
    for (var node of Array.from([this].concat(this.parents()))) {
      if (!node.parent()) {
        return null;
      }
      var {
        children
      } = node.parent();
      var index = children.indexOf(node);
      if (index < children.length - 1) {
        return children[index + 1];
      }
    }
  }
  nextContent() {
    return this.nextWithTest((node) => node.content !== void 0);
  }
  nextSibling() {
    const index = this.parent().children.indexOf(this);
    if (index === this.parent().children.length - 1) {
      return null;
    }
    return this.parent().children[index + 1];
  }
  nextWithTest(testFunc) {
    let node = this;
    while (node) {
      node = node.next();
      if (node && testFunc(node)) {
        return node;
      }
    }
  }
  previous() {
    if (!this.parent()) {
      return null;
    }
    const {
      children
    } = this.parent();
    if (children[0] === this) {
      return this.parent();
    }
    let node = children[children.indexOf(this) - 1];
    while (node.children && node.children.length) {
      node = node.children[node.children.length - 1];
    }
    return node;
  }
  previousContent() {
    return this.previousWithTest((node2) => node2.content !== void 0);
  }
  previousSibling() {
    const index = this.parent().children.indexOf(this);
    if (index === 0) {
      return null;
    }
    return this.parent().children[index - 1];
  }
  previousWithTest(testFunc) {
    let node = this;
    while (node) {
      node = node.previous();
      if (node && testFunc(node)) {
        return node;
      }
    }
  }
  // Class methods
  static extend(cls) {
    let key, value;
    const own = Object.prototype.hasOwnProperty;
    for (key of Object.getOwnPropertyNames(cls.prototype)) {
      value = cls.prototype[key];
      if (key === "constructor" || own.call(this.prototype, key)) {
        continue;
      }
      this.prototype[key] = value;
    }
    for (key of Object.getOwnPropertyNames(cls)) {
      value = cls[key];
      if (key === "length" || key === "name" || key === "prototype" || key === "initClass") {
        continue;
      }
      if (Array.from("__super__").includes(key)) {
        continue;
      }
      this.prototype[key] = value;
    }
    return this;
  }
  static fromDOMElement(domElement) {
    throw new Error("`fromDOMElement` not implemented");
  }
};
ContentEdit.NodeCollection = class NodeCollection extends ContentEdit.Node {
  // The `NodeCollection` class is used to implement nodes that parent a
  // collection of child nodes (for example the root or a region).
  constructor() {
    super();
    this.children = [];
  }
  // Read-only properties
  descendants() {
    const descendants = [];
    let nodeStack = this.children.slice();
    while (nodeStack.length > 0) {
      var node = nodeStack.shift();
      descendants.push(node);
      if (node.children && node.children.length > 0) {
        nodeStack = node.children.slice().concat(nodeStack);
      }
    }
    return descendants;
  }
  isMounted() {
    return false;
  }
  type() {
    return "NodeCollection";
  }
  // Methods
  attach(node, index) {
    if (node.parent()) {
      node.parent().detach(node);
    }
    node._parent = this;
    if (index !== void 0) {
      this.children.splice(index, 0, node);
    } else {
      this.children.push(node);
    }
    if (node.mount && this.isMounted()) {
      node.mount();
    }
    this.taint();
    return ContentEdit.Root.get().trigger("attach", this, node);
  }
  commit() {
    for (var descendant of Array.from(this.descendants())) {
      descendant._modified = null;
    }
    this._modified = null;
    return ContentEdit.Root.get().trigger("commit", this);
  }
  detach(node) {
    const nodeIndex = this.children.indexOf(node);
    if (nodeIndex === -1) {
      return;
    }
    if (node.unmount && this.isMounted() && node.isMounted()) {
      node.unmount();
    }
    this.children.splice(nodeIndex, 1);
    node._parent = null;
    this.taint();
    return ContentEdit.Root.get().trigger("detach", this, node);
  }
};
let Cls$bases = ContentEdit.Element = class Element extends ContentEdit.Node {
  static initClass() {
    this.droppers = {};
    this.mergers = {};
    this.placements = ["above", "below"];
  }
  // The `Element` class is used to implement nodes that appear as HTML
  // elements.
  constructor(tagName, attributes) {
    super();
    this._tagName = tagName.toLowerCase();
    this._attributes = attributes ? attributes : {};
    this._domElement = null;
    this._behaviours = {
      drag: true,
      // The element can be dragged
      drop: true,
      // The element can be dropped on to
      merge: true,
      // The element can be merged with another
      remove: true,
      // The element can be removed
      resize: true,
      // The element can be resized
      spawn: true
      // The element can spawn new elements
    };
  }
  // Read-only properties
  attributes() {
    const attributes = {};
    for (var name in this._attributes) {
      var value = this._attributes[name];
      attributes[name] = value;
    }
    return attributes;
  }
  cssTypeName() {
    return "element";
  }
  domElement() {
    return this._domElement;
  }
  isFixed() {
    return this.parent() && this.parent().type() === "Fixture";
  }
  isFocused() {
    return ContentEdit.Root.get().focused() === this;
  }
  isMounted() {
    return this._domElement !== null;
  }
  type() {
    return "Element";
  }
  typeName() {
    return "Element";
  }
  // Methods
  addCSSClass(className) {
    let modified = false;
    if (!this.hasCSSClass(className)) {
      modified = true;
      if (this.attr("class")) {
        this.attr("class", `${this.attr("class")} ${className}`);
      } else {
        this.attr("class", className);
      }
    }
    this._addCSSClass(className);
    if (modified) {
      return this.taint();
    }
  }
  attr(name, value) {
    name = name.toLowerCase();
    if (value === void 0) {
      return this._attributes[name];
    }
    this._attributes[name] = value;
    if (this.isMounted() && name.toLowerCase() !== "class") {
      this._domElement.setAttribute(name, value);
    }
    return this.taint();
  }
  blur() {
    const root = ContentEdit.Root.get();
    if (this.isFocused()) {
      this._removeCSSClass("ce-element--focused");
      root._focused = null;
      return root.trigger("blur", this);
    }
  }
  can(behaviour, allowed) {
    if (allowed === void 0) {
      return !this.isFixed() && this._behaviours[behaviour];
    }
    return this._behaviours[behaviour] = allowed;
  }
  clone() {
    const wrapper = rootContext().createElement("div");
    wrapper.innerHTML = this.html();
    return this.constructor.fromDOMElement(wrapper.children[0]);
  }
  createDraggingDOMElement() {
    if (!this.isMounted()) {
      return;
    }
    const helper = rootContext().createElement("div");
    helper.setAttribute(
      "class",
      `ce-drag-helper ce-drag-helper--type-${this.cssTypeName()}`
    );
    helper.setAttribute("data-ce-type", ContentEdit._(this.typeName()));
    return helper;
  }
  drag(x, y) {
    if (!this.isMounted() || !this.can("drag")) {
      return;
    }
    const root = ContentEdit.Root.get();
    root.startDragging(this, x, y);
    return root.trigger("drag", this);
  }
  drop(element, placement) {
    if (!this.can("drop")) {
      return;
    }
    const root = ContentEdit.Root.get();
    if (element) {
      element._removeCSSClass("ce-element--drop");
      element._removeCSSClass(`ce-element--drop-${placement[0]}`);
      element._removeCSSClass(`ce-element--drop-${placement[1]}`);
      if (this.constructor.droppers[element.type()]) {
        this.constructor.droppers[element.type()](
          this,
          element,
          placement
        );
        root.trigger("drop", this, element, placement);
        return;
      } else if (element.constructor.droppers[this.type()]) {
        element.constructor.droppers[this.type()](
          this,
          element,
          placement
        );
        root.trigger("drop", this, element, placement);
        return;
      }
    }
    return root.trigger("drop", this, null, null);
  }
  focus(supressDOMFocus) {
    const root = ContentEdit.Root.get();
    if (this.isFocused()) {
      return;
    }
    if (root.focused()) {
      root.focused().blur();
    }
    this._addCSSClass("ce-element--focused");
    root._focused = this;
    if (this.isMounted() && !supressDOMFocus) {
      this.domElement().focus();
    }
    return root.trigger("focus", this);
  }
  hasCSSClass(className) {
    if (this.attr("class")) {
      const classNames = Array.from(this.attr("class").split(" "));
      if (classNames.indexOf(className) > -1) {
        return true;
      }
    }
    return false;
  }
  merge(element) {
    if (!this.can("merge") || !this.can("remove")) {
      return false;
    }
    if (this.constructor.mergers[element.type()]) {
      return this.constructor.mergers[element.type()](element, this);
    } else if (element.constructor.mergers[this.type()]) {
      return element.constructor.mergers[this.type()](element, this);
    }
  }
  mount() {
    if (!this._domElement) {
      this._domElement = rootContext().createElement(this.tagName());
    }
    const sibling = this.nextSibling();
    if (sibling) {
      this.parent().domElement().insertBefore(
        this._domElement,
        sibling.domElement()
      );
    } else {
      if (this.isFixed()) {
        this.parent().domElement().parentNode.replaceChild(
          this._domElement,
          this.parent().domElement()
        );
        this.parent()._domElement = this._domElement;
      } else {
        this.parent().domElement().appendChild(this._domElement);
      }
    }
    this._addDOMEventListeners();
    this._addCSSClass("ce-element");
    this._addCSSClass(`ce-element--type-${this.cssTypeName()}`);
    if (this.isFocused()) {
      this._addCSSClass("ce-element--focused");
    }
    return ContentEdit.Root.get().trigger("mount", this);
  }
  removeAttr(name) {
    name = name.toLowerCase();
    if (!this._attributes[name]) {
      return;
    }
    delete this._attributes[name];
    if (this.isMounted() && name.toLowerCase() !== "class") {
      this._domElement.removeAttribute(name);
    }
    return this.taint();
  }
  removeCSSClass(className) {
    if (!this.hasCSSClass(className)) {
      return;
    }
    const classNames = Array.from(this.attr("class").split(" "));
    const classNameIndex = classNames.indexOf(className);
    if (classNameIndex > -1) {
      classNames.splice(classNameIndex, 1);
    }
    if (classNames.length) {
      this.attr("class", classNames.join(" "));
    } else {
      this.removeAttr("class");
    }
    this._removeCSSClass(className);
    return this.taint();
  }
  tagName(name) {
    if (name === void 0) {
      return this._tagName;
    }
    this._tagName = name.toLowerCase();
    if (this.isMounted()) {
      this.unmount();
      this.mount();
    }
    return this.taint();
  }
  unmount() {
    this._removeDOMEventListeners();
    if (this.isFixed()) {
      this._removeCSSClass("ce-element");
      this._removeCSSClass(`ce-element--type-${this.cssTypeName()}`);
      this._removeCSSClass("ce-element--focused");
      return;
    }
    if (this._domElement.parentNode) {
      this._domElement.parentNode.removeChild(this._domElement);
    }
    this._domElement = null;
    return ContentEdit.Root.get().trigger("unmount", this);
  }
  // Event handlers
  _addDOMEventListeners() {
    this._domEventHandlers = {
      // Drag events
      "dragstart": (ev) => {
        return ev.preventDefault();
      },
      // Focus events
      "focus": (ev) => {
        return ev.preventDefault();
      },
      // Keyboard events
      "keydown": (ev) => {
        return this._onKeyDown(ev);
      },
      "keyup": (ev) => {
        return this._onKeyUp(ev);
      },
      // Mouse events
      "mousedown": (ev) => {
        if (ev.button === 0) {
          return this._onMouseDown(ev);
        }
      },
      "mousemove": (ev) => {
        return this._onMouseMove(ev);
      },
      "mouseover": (ev) => {
        return this._onMouseOver(ev);
      },
      "mouseout": (ev) => {
        return this._onMouseOut(ev);
      },
      "mouseup": (ev) => {
        if (ev.button === 0) {
          return this._onMouseUp(ev);
        }
      },
      // Paste event
      "dragover": (ev) => {
        return ev.preventDefault();
      },
      "drop": (ev) => {
        return this._onNativeDrop(ev);
      },
      "paste": (ev) => {
        return this._onPaste(ev);
      }
    };
    return (() => {
      const result = [];
      for (var eventName in this._domEventHandlers) {
        var eventHandler = this._domEventHandlers[eventName];
        result.push(this._domElement.addEventListener(eventName, eventHandler));
      }
      return result;
    })();
  }
  _onKeyDown(ev) {
  }
  // No default behaviour
  _onKeyUp(ev) {
  }
  // No default behaviour
  _onMouseDown(ev) {
    if (this.focus) {
      return this.focus(true);
    }
  }
  _onMouseMove(ev) {
    return this._onOver(ev);
  }
  _onMouseOver(ev) {
    return this._onOver(ev);
  }
  _onMouseOut(ev) {
    this._removeCSSClass("ce-element--over");
    const root = ContentEdit.Root.get();
    const dragging = root.dragging();
    if (dragging) {
      this._removeCSSClass("ce-element--drop");
      this._removeCSSClass("ce-element--drop-above");
      this._removeCSSClass("ce-element--drop-below");
      this._removeCSSClass("ce-element--drop-center");
      this._removeCSSClass("ce-element--drop-left");
      this._removeCSSClass("ce-element--drop-right");
      return root._dropTarget = null;
    }
  }
  _onMouseUp(ev) {
    return this._ieMouseDownEchoed = false;
  }
  _onNativeDrop(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    return ContentEdit.Root.get().trigger("native-drop", this, ev);
  }
  _onPaste(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    return ContentEdit.Root.get().trigger("paste", this, ev);
  }
  _onOver(ev) {
    this._addCSSClass("ce-element--over");
    const root = ContentEdit.Root.get();
    const dragging = root.dragging();
    if (!dragging) {
      return;
    }
    if (dragging === this) {
      return;
    }
    if (root._dropTarget) {
      return;
    }
    if (!this.can("drop")) {
      return;
    }
    if (!this.constructor.droppers[dragging.type()] && !dragging.constructor.droppers[this.type()]) {
      return;
    }
    this._addCSSClass("ce-element--drop");
    return root._dropTarget = this;
  }
  _removeDOMEventListeners() {
    return (() => {
      const result = [];
      for (var eventName in this._domEventHandlers) {
        var eventHandler = this._domEventHandlers[eventName];
        result.push(this._domElement.removeEventListener(eventName, eventHandler));
      }
      return result;
    })();
  }
  // Private methods
  _addCSSClass(className) {
    if (!this.isMounted()) {
      return;
    }
    return ContentEdit.addCSSClass(this._domElement, className);
  }
  _attributesToString() {
    if (!(Object.getOwnPropertyNames(this._attributes).length > 0)) {
      return "";
    }
    return " " + ContentEdit.attributesToString(this._attributes);
  }
  _removeCSSClass(className) {
    if (!this.isMounted()) {
      return;
    }
    return ContentEdit.removeCSSClass(this._domElement, className);
  }
  // Class methods
  static getDOMElementAttributes(domElement) {
    if (!domElement.hasAttributes()) {
      return {};
    }
    const attributes = {};
    for (var attribute of Array.from(domElement.attributes)) {
      attributes[attribute.name.toLowerCase()] = attribute.value;
    }
    return attributes;
  }
  // Private class methods
  // The following private methods are useful when defining common drag/drop
  // behaviour for elements.
  static _dropVert(element, target, placement) {
    if (ContentEdit.ENABLE_DRAG_CLONING && rootContext().currentEvent().altKey) {
      element = element.clone();
    } else {
      element.parent().detach(element);
    }
    let insertIndex = target.parent().children.indexOf(target);
    if (placement[0] === "below") {
      insertIndex += 1;
    }
    return target.parent().attach(element, insertIndex);
  }
  static _dropBoth(element, target, placement) {
    if (ContentEdit.ENABLE_DRAG_CLONING && rootContext().currentEvent().altKey) {
      element = element.clone();
    } else {
      element.parent().detach(element);
    }
    let insertIndex = target.parent().children.indexOf(target);
    if (placement[0] === "below" && placement[1] === "center") {
      insertIndex += 1;
    }
    const alignLeft = ContentEdit.ALIGNMENT_CLASS_NAMES["left"];
    const alignRight = ContentEdit.ALIGNMENT_CLASS_NAMES["right"];
    if (element.a) {
      element._removeCSSClass(alignLeft);
      element._removeCSSClass(alignRight);
      if (element.a["class"]) {
        const aClassNames = [];
        for (var className of Array.from(element.a["class"].split(" "))) {
          if (className === alignLeft || className === alignRight) {
            continue;
          }
          aClassNames.push(className);
        }
        if (aClassNames.length) {
          element.a["class"] = aClassNames.join(" ");
        } else {
          delete element.a["class"];
        }
      }
    } else {
      element.removeCSSClass(alignLeft);
      element.removeCSSClass(alignRight);
    }
    if (placement[1] === "left") {
      if (element.a) {
        if (element.a["class"]) {
          element.a["class"] += " " + alignLeft;
        } else {
          element.a["class"] = alignLeft;
        }
        element._addCSSClass(alignLeft);
      } else {
        element.addCSSClass(alignLeft);
      }
    }
    if (placement[1] === "right") {
      if (element.a) {
        if (element.a["class"]) {
          element.a["class"] += " " + alignRight;
        } else {
          element.a["class"] = alignRight;
        }
        element._addCSSClass(alignRight);
      } else {
        element.addCSSClass(alignRight);
      }
    }
    return target.parent().attach(element, insertIndex);
  }
};
Cls$bases.initClass();
Cls$bases = ContentEdit.ElementCollection = class ElementCollection extends ContentEdit.Element {
  static initClass() {
    this.extend(ContentEdit.NodeCollection);
    this.prototype.blur = void 0;
    this.prototype.focus = void 0;
  }
  constructor(tagName, attributes) {
    super(tagName, attributes);
    this._bindings = {};
    this._parent = null;
    this._modified = null;
    this.children = [];
  }
  // Read-only properties
  cssTypeName() {
    return "element-collection";
  }
  isMounted() {
    return this._domElement !== null;
  }
  type() {
    return "ElementCollection";
  }
  // Methods
  createDraggingDOMElement() {
    if (!this.isMounted()) {
      return;
    }
    const helper = super.createDraggingDOMElement();
    let text = this._domElement.textContent;
    if (text.length > ContentEdit.HELPER_CHAR_LIMIT) {
      text = text.substr(0, ContentEdit.HELPER_CHAR_LIMIT);
    }
    helper.innerHTML = text;
    return helper;
  }
  detach(element) {
    ContentEdit.NodeCollection.prototype.detach.call(this, element);
    if (this.children.length === 0 && this.parent()) {
      return this.parent().detach(this);
    }
  }
  html(indent) {
    if (indent == null) {
      indent = "";
    }
    const children = Array.from(this.children).map((c) => c.html(indent + ContentEdit.INDENT));
    const le = ContentEdit.LINE_ENDINGS;
    if (this.isFixed()) {
      return children.join(le);
    } else {
      const attributes = this._attributesToString();
      return `${indent}<${this.tagName()}${attributes}>${le}${children.join(le)}${le}${indent}</${this.tagName()}>`;
    }
  }
  mount() {
    this._domElement = rootContext().createElement(this._tagName);
    for (var name in this._attributes) {
      var value = this._attributes[name];
      this._domElement.setAttribute(name, value);
    }
    super.mount();
    return Array.from(this.children).map((child) => child.mount());
  }
  unmount() {
    for (var child of Array.from(this.children)) {
      child.unmount();
    }
    return super.unmount();
  }
};
Cls$bases.initClass();
ContentEdit.ResizableElement = class ResizableElement extends ContentEdit.Element {
  // The `ResizableElement` class is used to implement elements that can be
  // resized (for example an image or video).
  constructor(tagName, attributes) {
    super(tagName, attributes);
    this._domSizeInfoElement = null;
    this._aspectRatio = 1;
  }
  // Read-only properties
  aspectRatio() {
    return this._aspectRatio;
  }
  maxSize() {
    let maxWidth = parseInt(this.attr("data-ce-max-width") || 0);
    if (!maxWidth) {
      maxWidth = ContentEdit.DEFAULT_MAX_ELEMENT_WIDTH;
    }
    maxWidth = Math.max(maxWidth, this.size()[0]);
    return [maxWidth, maxWidth * this.aspectRatio()];
  }
  minSize() {
    let minWidth = parseInt(this.attr("data-ce-min-width") || 0);
    if (!minWidth) {
      minWidth = ContentEdit.DEFAULT_MIN_ELEMENT_WIDTH;
    }
    minWidth = Math.min(minWidth, this.size()[0]);
    return [minWidth, minWidth * this.aspectRatio()];
  }
  type() {
    return "ResizableElement";
  }
  // Methods
  mount() {
    super.mount();
    return this._domElement.setAttribute("data-ce-size", this._getSizeInfo());
  }
  resize(corner, x, y) {
    if (!this.isMounted() || !this.can("resize")) {
      return;
    }
    return ContentEdit.Root.get().startResizing(this, corner, x, y, true);
  }
  size(newSize) {
    let height, width;
    if (!newSize) {
      width = parseInt(this.attr("width") || 1);
      height = parseInt(this.attr("height") || 1);
      return [width, height];
    }
    newSize[0] = parseInt(newSize[0]);
    newSize[1] = parseInt(newSize[1]);
    const minSize = this.minSize();
    newSize[0] = Math.max(newSize[0], minSize[0]);
    newSize[1] = Math.max(newSize[1], minSize[1]);
    const maxSize = this.maxSize();
    newSize[0] = Math.min(newSize[0], maxSize[0]);
    newSize[1] = Math.min(newSize[1], maxSize[1]);
    this.attr("width", parseInt(newSize[0]));
    this.attr("height", parseInt(newSize[1]));
    if (this.isMounted()) {
      this._domElement.style.width = `${newSize[0]}px`;
      this._domElement.style.height = `${newSize[1]}px`;
      return this._domElement.setAttribute("data-ce-size", this._getSizeInfo());
    }
  }
  // Event handlers
  _onMouseDown(ev) {
    super._onMouseDown(ev);
    const corner = this._getResizeCorner(ev.clientX, ev.clientY);
    if (corner) {
      return this.resize(corner, ev.clientX, ev.clientY);
    } else {
      clearTimeout(this._dragTimeout);
      return this._dragTimeout = setTimeout(
        () => {
          return this.drag(ev.pageX, ev.pageY);
        },
        150
      );
    }
  }
  _onMouseMove(ev) {
    super._onMouseMove();
    if (!this.can("resize")) {
      return;
    }
    this._removeCSSClass("ce-element--resize-top-left");
    this._removeCSSClass("ce-element--resize-top-right");
    this._removeCSSClass("ce-element--resize-bottom-left");
    this._removeCSSClass("ce-element--resize-bottom-right");
    const corner = this._getResizeCorner(ev.clientX, ev.clientY);
    if (corner) {
      return this._addCSSClass(`ce-element--resize-${corner[0]}-${corner[1]}`);
    }
  }
  _onMouseOut(ev) {
    super._onMouseOut();
    this._removeCSSClass("ce-element--resize-top-left");
    this._removeCSSClass("ce-element--resize-top-right");
    this._removeCSSClass("ce-element--resize-bottom-left");
    return this._removeCSSClass("ce-element--resize-bottom-right");
  }
  _onMouseUp(ev) {
    super._onMouseUp();
    if (this._dragTimeout) {
      return clearTimeout(this._dragTimeout);
    }
  }
  // Private methods
  _getResizeCorner(x, y) {
    const rect = this._domElement.getBoundingClientRect();
    [x, y] = Array.from([x - rect.left, y - rect.top]);
    const size = this.size();
    let cornerSize = ContentEdit.RESIZE_CORNER_SIZE;
    cornerSize = Math.min(cornerSize, Math.max(Math.trunc(size[0] / 4), 1));
    cornerSize = Math.min(cornerSize, Math.max(Math.trunc(size[1] / 4), 1));
    let corner = null;
    if (x < cornerSize) {
      if (y < cornerSize) {
        corner = ["top", "left"];
      } else if (y > rect.height - cornerSize) {
        corner = ["bottom", "left"];
      }
    } else if (x > rect.width - cornerSize) {
      if (y < cornerSize) {
        corner = ["top", "right"];
      } else if (y > rect.height - cornerSize) {
        corner = ["bottom", "right"];
      }
    }
    return corner;
  }
  _getSizeInfo() {
    const size = this.size();
    return `w ${size[0]} × h ${size[1]}`;
  }
};
ContentEdit.Region = class Region extends ContentEdit.NodeCollection {
  // Regions take a DOM element and convert the child DOM elements to other
  // editable elements. Regions acts as a root collection of the editable
  // elements.
  constructor(domElement) {
    super();
    this._domElement = domElement;
    this.setContent(domElement);
  }
  // Read-only properties
  domElement() {
    return this._domElement;
  }
  isMounted() {
    return true;
  }
  type() {
    return "Region";
  }
  // Methods
  html(indent) {
    if (indent == null) {
      indent = "";
    }
    const le = ContentEdit.LINE_ENDINGS;
    return Array.from(this.children).map((c) => c.html(indent)).join(le).trim();
  }
  setContent(domElementOrHTML) {
    let domElement = domElementOrHTML;
    if (domElementOrHTML.childNodes === void 0) {
      const wrapper = rootContext().createElement("div");
      wrapper.innerHTML = domElementOrHTML;
      domElement = wrapper;
    }
    for (var child of Array.from(this.children.slice())) {
      this.detach(child);
    }
    const tagNames = ContentEdit.TagNames.get();
    const childNodes = Array.from(domElement.childNodes);
    for (var childNode of Array.from(childNodes)) {
      var cls;
      if (childNode.nodeType !== 1) {
        continue;
      }
      if (childNode.getAttribute("data-ce-tag")) {
        cls = tagNames.match(childNode.getAttribute("data-ce-tag"));
      } else {
        cls = tagNames.match(childNode.tagName);
      }
      var element = cls.fromDOMElement(childNode);
      domElement.removeChild(childNode);
      if (element) {
        this.attach(element);
      }
    }
    return ContentEdit.Root.get().trigger("ready", this);
  }
};
ContentEdit.Fixture = class Fixture extends ContentEdit.NodeCollection {
  // Fixtures take a DOM element and convert it to a single editable element,
  // this allows the creation of field like regions within a page.
  constructor(domElement) {
    let cls;
    super();
    this._domElement = domElement;
    const tagNames = ContentEdit.TagNames.get();
    if (this._domElement.getAttribute("data-ce-tag")) {
      cls = tagNames.match(this._domElement.getAttribute("data-ce-tag"));
    } else {
      cls = tagNames.match(this._domElement.tagName);
    }
    const element = cls.fromDOMElement(this._domElement);
    this.children = [element];
    element._parent = this;
    element.mount();
    ContentEdit.Root.get().trigger("ready", this);
  }
  // Read-only properties
  domElement() {
    return this._domElement;
  }
  isMounted() {
    return true;
  }
  type() {
    return "Fixture";
  }
  // Methods
  html(indent) {
    if (indent == null) {
      indent = "";
    }
    const le = ContentEdit.LINE_ENDINGS;
    return Array.from(this.children).map((c) => c.html(indent)).join(le).trim();
  }
};
class _Root extends ContentEdit.Node {
  // The root node manages state and listens for events for all nodes. However
  // it is not the root of the tree, individual editable regions within the
  // HTML each have their own tree structure that is rooted to a
  // `ContentEdit.Region` instance.
  //
  // The root node actually has no specific knowledge of any other node and in
  // this respect it is perhaps more useful to visualise it as a floating node
  // that all other nodes talk to (and through).
  constructor() {
    super();
    this._onDrag = this._onDrag.bind(this);
    this._onStopDragging = this._onStopDragging.bind(this);
    this._onResize = this._onResize.bind(this);
    this._onStopResizing = this._onStopResizing.bind(this);
    this._focused = null;
    this._dragging = null;
    this._dropTarget = null;
    this._draggingDOMElement = null;
    this._resizing = null;
    this._resizingInit = null;
  }
  // Read-only properties
  dragging() {
    return this._dragging;
  }
  dropTarget() {
    return this._dropTarget;
  }
  focused() {
    return this._focused;
  }
  resizing() {
    return this._resizing;
  }
  type() {
    return "Root";
  }
  // Dragging methods
  cancelDragging() {
    if (!this._dragging) {
      return;
    }
    rootContext().overlayPoint().removeChild(this._draggingDOMElement);
    rootContext().off("document", "mousemove", this._onDrag);
    rootContext().off("document", "mouseup", this._onStopDragging);
    this._dragging._removeCSSClass("ce-element--dragging");
    this._dragging = null;
    this._dropTarget = null;
    return rootContext().setGlobalState("dragging", false);
  }
  startDragging(element, x, y) {
    if (this._dragging) {
      return;
    }
    this._dragging = element;
    this._dragging._addCSSClass("ce-element--dragging");
    this._draggingDOMElement = this._dragging.createDraggingDOMElement();
    rootContext().overlayPoint().appendChild(this._draggingDOMElement);
    this._draggingDOMElement.style.left = `${x}px`;
    this._draggingDOMElement.style.top = `${y}px`;
    rootContext().on("document", "mousemove", this._onDrag);
    rootContext().on("document", "mouseup", this._onStopDragging);
    return rootContext().setGlobalState("dragging", true);
  }
  _getDropPlacement(x, y) {
    if (!this._dropTarget) {
      return null;
    }
    const rect = this._dropTarget.domElement().getBoundingClientRect();
    [x, y] = Array.from([x - rect.left, y - rect.top]);
    let horz = "center";
    if (x < ContentEdit.DROP_EDGE_SIZE) {
      horz = "left";
    } else if (x > rect.width - ContentEdit.DROP_EDGE_SIZE) {
      horz = "right";
    }
    let vert = "above";
    if (y > rect.height / 2) {
      vert = "below";
    }
    return [vert, horz];
  }
  _onDrag(ev) {
    ContentSelect.Range.unselectAll();
    this._draggingDOMElement.style.left = `${ev.pageX}px`;
    this._draggingDOMElement.style.top = `${ev.pageY}px`;
    if (this._dropTarget) {
      const placement = this._getDropPlacement(ev.clientX, ev.clientY);
      this._dropTarget._removeCSSClass("ce-element--drop-above");
      this._dropTarget._removeCSSClass("ce-element--drop-below");
      this._dropTarget._removeCSSClass("ce-element--drop-center");
      this._dropTarget._removeCSSClass("ce-element--drop-left");
      this._dropTarget._removeCSSClass("ce-element--drop-right");
      if (Array.from(this._dragging.constructor.placements).includes(placement[0])) {
        this._dropTarget._addCSSClass(`ce-element--drop-${placement[0]}`);
      }
      if (Array.from(this._dragging.constructor.placements).includes(placement[1])) {
        return this._dropTarget._addCSSClass(`ce-element--drop-${placement[1]}`);
      }
    }
  }
  _onStopDragging(ev) {
    const placement = this._getDropPlacement(ev.clientX, ev.clientY);
    this._dragging.drop(this._dropTarget, placement);
    return this.cancelDragging();
  }
  // Resizing methods
  startResizing(element, corner, x, y, fixed) {
    if (this._resizing) {
      return;
    }
    this._resizing = element;
    this._resizingInit = {
      corner,
      fixed,
      origin: [x, y],
      size: element.size()
    };
    this._resizing._addCSSClass("ce-element--resizing");
    const parentDom = this._resizing.parent().domElement();
    const measureDom = rootContext().createElement("div");
    measureDom.setAttribute("class", "ce-measure");
    parentDom.appendChild(measureDom);
    this._resizingParentWidth = measureDom.getBoundingClientRect().width;
    parentDom.removeChild(measureDom);
    rootContext().on("document", "mousemove", this._onResize);
    rootContext().on("document", "mouseup", this._onStopResizing);
    return rootContext().setGlobalState("resizing", true);
  }
  _onResize(ev) {
    let height;
    ContentSelect.Range.unselectAll();
    let x = this._resizingInit.origin[0] - ev.clientX;
    if (this._resizingInit.corner[1] === "right") {
      x = -x;
    }
    let width = this._resizingInit.size[0] + x;
    width = Math.min(width, this._resizingParentWidth);
    if (this._resizingInit.fixed) {
      height = width * this._resizing.aspectRatio();
    } else {
      let y = this._resizingInit.origin[1] - ev.clientY;
      if (this._resizingInit.corner[0] === "bottom") {
        y = -y;
      }
      height = this._resizingInit.size[1] + y;
    }
    return this._resizing.size([width, height]);
  }
  cancelResizing() {
    if (!this._resizing) {
      return;
    }
    rootContext().off("document", "mousemove", this._onResize);
    rootContext().off("document", "mouseup", this._onStopResizing);
    this._resizing._removeCSSClass("ce-element--resizing");
    this._resizing = null;
    this._resizingInit = null;
    this._resizingParentWidth = null;
    return rootContext().setGlobalState("resizing", false);
  }
  _onStopResizing() {
    return this.cancelResizing();
  }
}
(function() {
  let instance = void 0;
  const Cls$root = ContentEdit.Root = class Root {
    static initClass() {
      instance = null;
    }
    static get() {
      return instance != null ? instance : instance = new _Root();
    }
  };
  Cls$root.initClass();
  return Cls$root;
})();
const Cls$static = ContentEdit.Static = class Static extends ContentEdit.Element {
  static initClass() {
    this.prototype.blur = void 0;
    this.prototype.focus = void 0;
    this.droppers = { "Static": ContentEdit.Element._dropVert };
  }
  // A non-editable (static) HTML element.
  // REVIEW: The primary purpose of static elements is to provide a fallback
  // for when a DOM element in an editable region has not been mapped to an
  // editable `ContentEdit.Element` class.
  //
  // To keep the code small we don't preventively override all the various
  // `ContentEdit.Element` methods, but they can't safely be called and as it
  // stands `ContentEdit.Static` elements should not be interacted with.
  //
  // The only interaction currently supported is dropping other elements on to
  // a static element, without support for this interaction static elements
  // could make it impossible to move a static element from the start or end of
  // a region.
  //
  // A known problem with the content of static elements is that we rely on the
  // browser's interpretation of the content (because we use innerHTML), this
  // can lead to differences is the output as well as inconsistencies between
  // browsers.
  constructor(tagName, attributes, content) {
    super(tagName, attributes);
    this._content = content;
  }
  // Read-only properties
  cssTypeName() {
    return "static";
  }
  type() {
    return "Static";
  }
  typeName() {
    return "Static";
  }
  // Methods
  createDraggingDOMElement() {
    if (!this.isMounted()) {
      return;
    }
    const helper = super.createDraggingDOMElement();
    let text = this._domElement.textContent;
    if (text.length > ContentEdit.HELPER_CHAR_LIMIT) {
      text = text.substr(0, ContentEdit.HELPER_CHAR_LIMIT);
    }
    helper.innerHTML = text;
    return helper;
  }
  html(indent) {
    if (indent == null) {
      indent = "";
    }
    if (HTMLString.Tag.SELF_CLOSING[this._tagName]) {
      return `${indent}<${this._tagName}${this._attributesToString()}>`;
    }
    return `${indent}<${this._tagName}${this._attributesToString()}>${this._content}${indent}</${this._tagName}>`;
  }
  mount() {
    this._domElement = rootContext().createElement(this._tagName);
    for (var name in this._attributes) {
      var value = this._attributes[name];
      this._domElement.setAttribute(name, value);
    }
    this._domElement.innerHTML = this._content;
    return super.mount();
  }
  // Event handlers
  _onMouseDown(ev) {
    super._onMouseDown(ev);
    if (this.attr("data-ce-moveable") !== void 0) {
      clearTimeout(this._dragTimeout);
      return this._dragTimeout = setTimeout(
        () => {
          return this.drag(ev.pageX, ev.pageY);
        },
        150
      );
    }
  }
  _onMouseOver(ev) {
    super._onMouseOver(ev);
    return this._removeCSSClass("ce-element--over");
  }
  _onMouseUp(ev) {
    super._onMouseUp(ev);
    if (this._dragTimeout) {
      return clearTimeout(this._dragTimeout);
    }
  }
  // Class methods
  static fromDOMElement(domElement) {
    return new this(
      domElement.tagName,
      this.getDOMElementAttributes(domElement),
      domElement.innerHTML
    );
  }
};
Cls$static.initClass();
ContentEdit.TagNames.get().register(ContentEdit.Static, "static");
let Cls$text = ContentEdit.Text = class Text extends ContentEdit.Element {
  static initClass() {
    this.droppers = {
      "Static": ContentEdit.Element._dropVert,
      "Text": ContentEdit.Element._dropVert
    };
    this.mergers = {
      "Text"(element, target) {
        const offset = target.content.length();
        if (element.content.length()) {
          target.content = target.content.concat(element.content);
        }
        if (target.isMounted()) {
          target.updateInnerHTML();
        }
        target.focus();
        new ContentSelect.Range(offset, offset).select(target._domElement);
        if (element.parent()) {
          element.parent().detach(element);
        }
        return target.taint();
      }
    };
  }
  // An editable body of text (e.g <address>, <blockquote>, <h1-h6>, <p>).
  constructor(tagName, attributes, content) {
    super(tagName, attributes);
    if (content instanceof HTMLString.String) {
      this.content = content;
    } else {
      if (ContentEdit.TRIM_WHITESPACE) {
        this.content = new HTMLString.String(content).trim();
      } else {
        this.content = new HTMLString.String(content, true);
      }
    }
  }
  // Read-only properties
  cssTypeName() {
    return "text";
  }
  type() {
    return "Text";
  }
  typeName() {
    return "Text";
  }
  // Methods
  blur() {
    if (this.isMounted()) {
      this._syncContent();
    }
    if (this.content.isWhitespace() && this.can("remove")) {
      if (this.parent()) {
        this.parent().detach(this);
      }
    } else if (this.isMounted()) {
      if (!rootContext().isLegacyIE() && !/Edge/.test(navigator.userAgent)) {
        this._domElement.blur();
      }
      this._domElement.removeAttribute("contenteditable");
    }
    return super.blur();
  }
  createDraggingDOMElement() {
    if (!this.isMounted()) {
      return;
    }
    const helper = super.createDraggingDOMElement();
    let text = HTMLString.String.encode(this._domElement.textContent);
    if (text.length > ContentEdit.HELPER_CHAR_LIMIT) {
      text = text.substr(0, ContentEdit.HELPER_CHAR_LIMIT);
    }
    helper.innerHTML = text;
    return helper;
  }
  drag(x, y) {
    this.storeState();
    this._domElement.removeAttribute("contenteditable");
    return super.drag(x, y);
  }
  drop(element, placement) {
    super.drop(element, placement);
    return this.restoreState();
  }
  focus(supressDOMFocus) {
    if (this.isMounted()) {
      this._domElement.setAttribute("contenteditable", "");
    }
    return super.focus(supressDOMFocus);
  }
  html(indent) {
    if (indent == null) {
      indent = "";
    }
    if (!this._lastCached || this._lastCached <= this._modified) {
      let content;
      if (ContentEdit.TRIM_WHITESPACE) {
        content = this.content.copy().trim();
      } else {
        content = this.content.copy();
      }
      content.optimize();
      this._lastCached = Date.now();
      this._cached = content.html();
    }
    const le = ContentEdit.LINE_ENDINGS;
    const attributes = this._attributesToString();
    return `${indent}<${this._tagName}${attributes}>${le}${indent}${ContentEdit.INDENT}${this._cached}${le}${indent}</${this._tagName}>`;
  }
  mount() {
    this._domElement = rootContext().createElement(this._tagName);
    for (var name in this._attributes) {
      var value = this._attributes[name];
      this._domElement.setAttribute(name, value);
    }
    this.updateInnerHTML();
    return super.mount();
  }
  restoreState() {
    if (!this._savedSelection) {
      return;
    }
    if (!this.isMounted() || !this.isFocused()) {
      this._savedSelection = void 0;
      return;
    }
    this._domElement.setAttribute("contenteditable", "");
    this._addCSSClass("ce-element--focused");
    if (rootContext().getActiveElement() !== this.domElement()) {
      this.domElement().focus();
    }
    this._savedSelection.select(this._domElement);
    return this._savedSelection = void 0;
  }
  selection(selection) {
    if (selection === void 0) {
      if (this.isMounted()) {
        return ContentSelect.Range.query(this._domElement);
      } else {
        return new ContentSelect.Range(0, 0);
      }
    }
    return selection.select(this._domElement);
  }
  storeState() {
    if (!this.isMounted() || !this.isFocused()) {
      return;
    }
    return this._savedSelection = ContentSelect.Range.query(this._domElement);
  }
  unmount() {
    this._domElement.removeAttribute("contenteditable");
    return super.unmount();
  }
  updateInnerHTML() {
    this._domElement.innerHTML = this.content.html();
    ContentSelect.Range.prepareElement(this._domElement);
    return this._flagIfEmpty();
  }
  // Event handlers
  _onKeyDown(ev) {
    switch (ev.keyCode) {
      // Navigation
      case 40:
        return this._keyDown(ev);
      case 37:
        return this._keyLeft(ev);
      case 39:
        return this._keyRight(ev);
      case 38:
        return this._keyUp(ev);
      case 9:
        return this._keyTab(ev);
      // Merging
      case 8:
        return this._keyBack(ev);
      case 46:
        return this._keyDelete(ev);
      // Splitting
      case 13:
        return this._keyReturn(ev);
    }
  }
  _onKeyUp(ev) {
    super._onKeyUp(ev);
    return this._syncContent();
  }
  _onMouseDown(ev) {
    super._onMouseDown(ev);
    clearTimeout(this._dragTimeout);
    this._dragTimeout = setTimeout(
      () => {
        return this.drag(ev.pageX, ev.pageY);
      },
      ContentEdit.DRAG_HOLD_DURATION
    );
    if (this.content.length() === 0 && ContentEdit.Root.get().focused() === this) {
      ev.preventDefault();
      if (rootContext().getActiveElement() !== this._domElement) {
        this._domElement.focus();
      }
      return new ContentSelect.Range(0, 0).select(this._domElement);
    }
  }
  _onMouseMove(ev) {
    if (this._dragTimeout) {
      clearTimeout(this._dragTimeout);
    }
    return super._onMouseMove(ev);
  }
  _onMouseOut(ev) {
    if (this._dragTimeout) {
      clearTimeout(this._dragTimeout);
    }
    return super._onMouseOut(ev);
  }
  _onMouseUp(ev) {
    if (this._dragTimeout) {
      clearTimeout(this._dragTimeout);
    }
    return super._onMouseUp(ev);
  }
  // Key handlers
  _keyBack(ev) {
    const selection = ContentSelect.Range.query(this._domElement);
    if (selection.get()[0] !== 0 || !selection.isCollapsed()) {
      return;
    }
    ev.preventDefault();
    const previous = this.previousContent();
    this._syncContent();
    if (previous) {
      return previous.merge(this);
    }
  }
  _keyDelete(ev) {
    const selection = ContentSelect.Range.query(this._domElement);
    if (!this._atEnd(selection) || !selection.isCollapsed()) {
      return;
    }
    ev.preventDefault();
    const next = this.nextContent();
    if (next) {
      return this.merge(next);
    }
  }
  _keyDown(ev) {
    return this._keyRight(ev);
  }
  _keyLeft(ev) {
    let selection = ContentSelect.Range.query(this._domElement);
    if (selection.get()[0] !== 0 || !selection.isCollapsed()) {
      return;
    }
    ev.preventDefault();
    const previous = this.previousContent();
    if (previous) {
      previous.focus();
      selection = new ContentSelect.Range(
        previous.content.length(),
        previous.content.length()
      );
      return selection.select(previous.domElement());
    } else {
      return ContentEdit.Root.get().trigger(
        "previous-region",
        this.closest((node) => node.type() === "Fixture" || node.type() === "Region")
      );
    }
  }
  _keyReturn(ev) {
    ev.preventDefault();
    if (this.content.isWhitespace() && Number(!ev.shiftKey) ^ Number(ContentEdit.PREFER_LINE_BREAKS)) {
      return;
    }
    let selection = ContentSelect.Range.query(this._domElement);
    const tip = this.content.substring(0, selection.get()[0]);
    const tail = this.content.substring(selection.get()[1]);
    if (Number(ev.shiftKey) ^ Number(ContentEdit.PREFER_LINE_BREAKS)) {
      let insertAt = selection.get()[0];
      let lineBreakStr = "<br>";
      if (this.content.length() === insertAt) {
        if (this.content.length() === 0 || !this.content.characters[insertAt - 1].isTag("br")) {
          lineBreakStr = "<br><br>";
        }
      }
      this.content = this.content.insert(
        insertAt,
        new HTMLString.String(lineBreakStr, true),
        true
      );
      this.updateInnerHTML();
      insertAt += 1;
      selection = new ContentSelect.Range(insertAt, insertAt);
      selection.select(this.domElement());
      this.taint();
      return;
    }
    if (!this.can("spawn")) {
      return;
    }
    this.content = tip.trim();
    this.updateInnerHTML();
    const element = new this.constructor("p", {}, tail.trim());
    this.parent().attach(element, this.parent().children.indexOf(this) + 1);
    if (tip.length()) {
      element.focus();
      selection = new ContentSelect.Range(0, 0);
      selection.select(element.domElement());
    } else {
      selection = new ContentSelect.Range(0, tip.length());
      selection.select(this._domElement);
    }
    return this.taint();
  }
  _keyRight(ev) {
    let selection = ContentSelect.Range.query(this._domElement);
    if (!this._atEnd(selection) || !selection.isCollapsed()) {
      return;
    }
    ev.preventDefault();
    const next = this.nextContent();
    if (next) {
      next.focus();
      selection = new ContentSelect.Range(0, 0);
      return selection.select(next.domElement());
    } else {
      return ContentEdit.Root.get().trigger(
        "next-region",
        this.closest((node) => node.type() === "Fixture" || node.type() === "Region")
      );
    }
  }
  _keyTab(ev) {
    ev.preventDefault();
    if (this.isFixed()) {
      if (ev.shiftKey) {
        return ContentEdit.Root.get().trigger(
          "previous-region",
          this.closest((node) => node.type() === "Fixture" || node.type() === "Region")
        );
      } else {
        return ContentEdit.Root.get().trigger(
          "next-region",
          this.closest((node) => node.type() === "Fixture" || node.type() === "Region")
        );
      }
    }
  }
  _keyUp(ev) {
    return this._keyLeft(ev);
  }
  // Private methods
  _atEnd(selection) {
    return selection.get()[0] >= this.content.length();
  }
  _flagIfEmpty() {
    if (this.content.length() === 0) {
      return this._addCSSClass("ce-element--empty");
    } else {
      return this._removeCSSClass("ce-element--empty");
    }
  }
  _syncContent(ev) {
    const snapshot = this.content.html();
    this.content = new HTMLString.String(
      this._domElement.innerHTML,
      this.content.preserveWhitespace()
    );
    const newSnapshot = this.content.html();
    if (snapshot !== newSnapshot) {
      this.taint();
    }
    return this._flagIfEmpty();
  }
  // Class methods
  static fromDOMElement(domElement) {
    return new this(
      domElement.tagName,
      this.getDOMElementAttributes(domElement),
      domElement.innerHTML.replace(/^\s+|\s+$/g, "")
    );
  }
};
Cls$text.initClass();
ContentEdit.TagNames.get().register(
  ContentEdit.Text,
  "address",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p"
);
Cls$text = ContentEdit.PreText = class PreText extends ContentEdit.Text {
  static initClass() {
    this.TAB_INDENT = "    ";
    this.droppers = {
      "PreText": ContentEdit.Element._dropVert,
      "Static": ContentEdit.Element._dropVert,
      "Text": ContentEdit.Element._dropVert
    };
    this.mergers = {};
  }
  constructor(tagName, attributes, content) {
    super(tagName, attributes, content);
    if (content instanceof HTMLString.String) {
      this.content = content;
    } else {
      this.content = new HTMLString.String(content, true);
    }
  }
  // Read-only properties
  cssTypeName() {
    return "pre-text";
  }
  type() {
    return "PreText";
  }
  typeName() {
    return "Preformatted";
  }
  // Methods
  blur() {
    if (this.isMounted()) {
      this._domElement.innerHTML = this.content.html();
    }
    return super.blur();
  }
  html(indent) {
    if (indent == null) {
      indent = "";
    }
    if (!this._lastCached || this._lastCached <= this._modified) {
      const content = this.content.copy();
      content.optimize();
      this._lastCached = Date.now();
      this._cached = content.html();
    }
    return `${indent}<${this._tagName}${this._attributesToString()}>${this._cached}</${this._tagName}>`;
  }
  updateInnerHTML() {
    const html = this.content.html();
    this._domElement.innerHTML = html;
    this._ensureEndZWS();
    ContentSelect.Range.prepareElement(this._domElement);
    return this._flagIfEmpty();
  }
  // Event handlers
  _keyBack(ev) {
    const selection = ContentSelect.Range.query(this._domElement);
    if (selection.get()[0] <= this.content.length()) {
      return super._keyBack(ev);
    }
    selection.set(this.content.length(), this.content.length());
    return selection.select(this._domElement);
  }
  // Key events
  _keyReturn(ev) {
    ev.preventDefault();
    const selection = ContentSelect.Range.query(this._domElement);
    let cursor = selection.get()[0] + 1;
    if (selection.get()[0] === 0 && selection.isCollapsed()) {
      this.content = new HTMLString.String("\n", true).concat(this.content);
    } else if (this._atEnd(selection) && selection.isCollapsed()) {
      this.content = this.content.concat(new HTMLString.String("\n", true));
    } else if (selection.get()[0] === 0 && selection.get()[1] === this.content.length()) {
      this.content = new HTMLString.String("\n", true);
      cursor = 0;
    } else {
      const tip = this.content.substring(0, selection.get()[0]);
      const tail = this.content.substring(selection.get()[1]);
      this.content = tip.concat(new HTMLString.String("\n", true), tail);
    }
    this.updateInnerHTML();
    selection.set(cursor, cursor);
    selection.select(this._domElement);
    return this.taint();
  }
  _keyTab(ev) {
    let i, indentHTML, selectionOffset;
    ev.preventDefault();
    const blockLength = this.content.length();
    const indentText = ContentEdit.PreText.TAB_INDENT;
    let indentLength = indentText.length;
    const lines = this.content.split("\n");
    const selection = this.selection().get();
    selection[0] = Math.min(selection[0], blockLength);
    selection[1] = Math.min(selection[1], blockLength);
    let charIndex = 0;
    let startLine = -1;
    let endLine = -1;
    for (i = 0; i < lines.length; i++) {
      var line = lines[i];
      var lineLength = line.length() + 1;
      if (selection[0] < charIndex + lineLength) {
        if (startLine === -1) {
          startLine = i;
        }
      }
      if (selection[1] < charIndex + lineLength) {
        if (endLine === -1) {
          endLine = i;
        }
      }
      if (startLine > -1 && endLine > -1) {
        break;
      }
      charIndex += lineLength;
    }
    if (startLine === endLine) {
      indentLength -= (selection[0] - charIndex) % indentLength;
      indentHTML = new HTMLString.String(
        Array(indentLength + 1).join(" "),
        true
      );
      const tip = lines[startLine].substring(0, selection[0] - charIndex);
      const tail = lines[startLine].substring(selection[1] - charIndex);
      lines[startLine] = tip.concat(indentHTML, tail);
      selectionOffset = indentLength;
    } else {
      if (ev.shiftKey) {
        let asc, end;
        let firstLineShift = 0;
        for (i = startLine, end = endLine, asc = startLine <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
          var j;
          var iterable = lines[i].characters.slice();
          for (j = 0; j < iterable.length; j++) {
            var c = iterable[j];
            if (j > indentLength - 1) {
              break;
            }
            if (!c.isWhitespace()) {
              break;
            }
            lines[i].characters.shift();
          }
          if (i === startLine) {
            firstLineShift = j;
          }
        }
        selectionOffset = Math.max(-indentLength, -firstLineShift);
      } else {
        let asc1, end1;
        indentHTML = new HTMLString.String(indentText, true);
        for (i = startLine, end1 = endLine, asc1 = startLine <= end1; asc1 ? i <= end1 : i >= end1; asc1 ? i++ : i--) {
          lines[i] = indentHTML.concat(lines[i]);
        }
        selectionOffset = indentLength;
      }
    }
    this.content = HTMLString.String.join(
      new HTMLString.String("\n", true),
      lines
    );
    this.updateInnerHTML();
    const selectionLength = this.content.length() - blockLength;
    return new ContentSelect.Range(
      selection[0] + selectionOffset,
      selection[1] + selectionLength
    ).select(this._domElement);
  }
  // Private methods
  _syncContent(ev) {
    this._ensureEndZWS();
    const snapshot = this.content.html();
    this.content = new HTMLString.String(
      this._domElement.innerHTML.replace(/\u200B$/g, ""),
      this.content.preserveWhitespace()
    );
    const newSnapshot = this.content.html();
    if (snapshot !== newSnapshot) {
      this.taint();
    }
    return this._flagIfEmpty();
  }
  _ensureEndZWS() {
    if (!this._domElement.lastChild) {
      return;
    }
    const html = this._domElement.innerHTML;
    if (html[html.length - 1] === "​") {
      if (html.indexOf("​") < html.length - 1) {
        return;
      }
    }
    const _addZWS = () => {
      if (html.indexOf("​") > -1) {
        this._domElement.innerHTML = html.replace(/\u200B/g, "");
      }
      return this._domElement.lastChild.textContent += "​";
    };
    if (this._savedSelection) {
      return _addZWS();
    } else {
      this.storeState();
      _addZWS();
      return this.restoreState();
    }
  }
  // Class methods
  static fromDOMElement(domElement) {
    return new this(
      domElement.tagName,
      this.getDOMElementAttributes(domElement),
      domElement.innerHTML
    );
  }
};
Cls$text.initClass();
ContentEdit.TagNames.get().register(ContentEdit.PreText, "pre");
let Cls$images = ContentEdit.Image = class Image extends ContentEdit.ResizableElement {
  static initClass() {
    this.droppers = {
      "Image": ContentEdit.Element._dropBoth,
      "PreText": ContentEdit.Element._dropBoth,
      "Static": ContentEdit.Element._dropBoth,
      "Text": ContentEdit.Element._dropBoth
    };
    this.placements = ["above", "below", "left", "right", "center"];
  }
  // An editable image (e.g <image src="..." alt="foo" width="5" height="5">).
  // The `Image` element supports 2 special tags to allow the the size of the
  // image to be constrained (data-ce-min-width, data-ce--max-width).
  constructor(attributes, a) {
    super("img", attributes);
    this.a = a ? a : null;
    const size = this.size();
    this._aspectRatio = size[1] / size[0];
  }
  // Read-only properties
  cssTypeName() {
    return "image";
  }
  type() {
    return "Image";
  }
  typeName() {
    return "Image";
  }
  // Methods
  createDraggingDOMElement() {
    if (!this.isMounted()) {
      return;
    }
    const helper = super.createDraggingDOMElement();
    helper.style.backgroundImage = `url('${this._attributes["src"]}')`;
    return helper;
  }
  html(indent) {
    if (indent == null) {
      indent = "";
    }
    const img = `${indent}<img${this._attributesToString()}>`;
    if (this.a) {
      const le = ContentEdit.LINE_ENDINGS;
      let attributes = ContentEdit.attributesToString(this.a);
      attributes = `${attributes} data-ce-tag="img"`;
      return `${indent}<a ${attributes}>${le}${ContentEdit.INDENT}${img}${le}${indent}</a>`;
    } else {
      return img;
    }
  }
  mount() {
    this._domElement = rootContext().createElement("div");
    let classes = "";
    if (this.a && this.a["class"]) {
      classes += " " + this.a["class"];
    }
    if (this._attributes["class"]) {
      classes += " " + this._attributes["class"];
    }
    this._domElement.setAttribute("class", classes);
    let style = this._attributes["style"] ? this._attributes["style"] : "";
    style += `background-image:url('${this._attributes["src"]}');`;
    if (this._attributes["width"]) {
      style += `width:${this._attributes["width"]}px;`;
    }
    if (this._attributes["height"]) {
      style += `height:${this._attributes["height"]}px;`;
    }
    this._domElement.setAttribute("style", style);
    return super.mount();
  }
  unmount() {
    if (this.isFixed()) {
      const wrapper = rootContext().createElement("div");
      wrapper.innerHTML = this.html();
      const domElement = wrapper.querySelector("a, img");
      this._domElement.parentNode.replaceChild(domElement, this._domElement);
      this._domElement = domElement;
    }
    return super.unmount();
  }
  // Class methods
  static fromDOMElement(domElement) {
    let a = null;
    if (domElement.tagName.toLowerCase() === "a") {
      a = this.getDOMElementAttributes(domElement);
      const childNodes = Array.from(domElement.childNodes);
      for (var childNode of Array.from(childNodes)) {
        if (childNode.nodeType === 1 && childNode.tagName.toLowerCase() === "img") {
          domElement = childNode;
          break;
        }
      }
      if (domElement.tagName.toLowerCase() === "a") {
        domElement = rootContext().createElement("img");
      }
    }
    const attributes = this.getDOMElementAttributes(domElement);
    let width = attributes["width"];
    let height = attributes["height"];
    if (attributes["width"] === void 0) {
      if (attributes["height"] === void 0) {
        width = domElement.naturalWidth;
      } else {
        width = domElement.clientWidth;
      }
    }
    if (attributes["height"] === void 0) {
      if (attributes["width"] === void 0) {
        height = domElement.naturalHeight;
      } else {
        height = domElement.clientHeight;
      }
    }
    attributes["width"] = width;
    attributes["height"] = height;
    return new this(attributes, a);
  }
};
Cls$images.initClass();
ContentEdit.TagNames.get().register(ContentEdit.Image, "img");
Cls$images = ContentEdit.ImageFixture = class ImageFixture extends ContentEdit.Element {
  static initClass() {
    this.droppers = {
      "ImageFixture": ContentEdit.Element._dropVert,
      "Image": ContentEdit.Element._dropVert,
      "PreText": ContentEdit.Element._dropVert,
      "Text": ContentEdit.Element._dropVert
    };
  }
  // Image fixtures provide a mechanism for adding images as fixtures.
  //
  // The structure of an image fixture is slightly different than you might
  // at first expect, rather than using an image element alone image fixtures
  // use a image element within a (typically) block level element, for
  // example:
  //
  // <div
  //    data-ce-tag="img-fixed"
  //    style="background-url: url('some-image.jpg');"
  //    >
  //    <img src="some-image.jpg" alt="Some image">
  // </div>
  //
  // This structure provides makes it easy to use CSS to set how the image
  // covers the fixture (typically the inner image element is hidden).
  constructor(tagName, attributes, src) {
    super(tagName, attributes);
    this._src = src;
  }
  // Read-only properties
  cssTypeName() {
    return "image-fixture";
  }
  type() {
    return "ImageFixture";
  }
  typeName() {
    return "ImageFixture";
  }
  // Methods
  html(indent) {
    if (indent == null) {
      indent = "";
    }
    const le = ContentEdit.LINE_ENDINGS;
    const attributes = this._attributesToString();
    let alt = "";
    if (this._attributes["alt"] !== void 0) {
      alt = `alt="${this._attributes["alt"]}"`;
    }
    const img = `${indent}<img src="${this.src()}"${alt}>`;
    return `${indent}<${this.tagName()} ${attributes}>${le}${ContentEdit.INDENT}${img}${le}${indent}</${this.tagName()}>`;
  }
  mount() {
    this._domElement = rootContext().createElement(this.tagName());
    for (var name in this._attributes) {
      var value = this._attributes[name];
      if (name === "alt" || name === "style") {
        continue;
      }
      this._domElement.setAttribute(name, value);
    }
    let classes = "";
    if (this.a && this.a["class"]) {
      classes += " " + this.a["class"];
    }
    if (this._attributes["class"]) {
      classes += " " + this._attributes["class"];
    }
    this._domElement.setAttribute("class", classes);
    let style = this._attributes["style"] ? this._attributes["style"] : "";
    const styleElm = rootContext().createElement("div");
    styleElm.setAttribute("style", style.trim());
    styleElm.style.backgroundImage = null;
    style = styleElm.getAttribute("style");
    style = [style.trim(), `background-image:url('${this.src()}');`].join(" ");
    this._domElement.setAttribute("style", style.trim());
    return super.mount();
  }
  src(src) {
    if (src === void 0) {
      return this._src;
    }
    this._src = src;
    if (this.isMounted()) {
      this.unmount();
      this.mount();
    }
    return this.taint();
  }
  unmount() {
    if (this.isFixed()) {
      const wrapper = rootContext().createElement("div");
      wrapper.innerHTML = this.html();
      const domElement = wrapper.firstElementChild;
      this._domElement.parentNode.replaceChild(domElement, this._domElement);
      this._domElement = domElement;
      return this.parent()._domElement = this._domElement;
    } else {
      return super.unmount();
    }
  }
  // Private methods
  _attributesToString() {
    if (this._attributes["style"]) {
      let style = this._attributes["style"] ? this._attributes["style"] : "";
      const styleElm = rootContext().createElement("div");
      styleElm.setAttribute("style", style.trim());
      styleElm.style.backgroundImage = null;
      style = styleElm.getAttribute("style");
      style = [
        style.trim(),
        `background-image:url('${this.src()}');`
      ].join(" ");
      this._attributes["style"] = style.trim();
    } else {
      this._attributes["style"] = `background-image:url('${this.src()}');`;
    }
    const attributes = {};
    for (var k in this._attributes) {
      var v = this._attributes[k];
      if (k === "alt") {
        continue;
      }
      attributes[k] = v;
    }
    return " " + ContentEdit.attributesToString(attributes);
  }
  // Class methods
  static fromDOMElement(domElement) {
    const {
      tagName
    } = domElement;
    let attributes = this.getDOMElementAttributes(domElement);
    let src = "";
    let alt = "";
    const childNodes = Array.from(domElement.childNodes);
    for (var childNode of Array.from(childNodes)) {
      if (childNode.nodeType === 1 && childNode.tagName.toLowerCase() === "img") {
        src = childNode.getAttribute("src") || "";
        alt = childNode.getAttribute("alt") || "";
        break;
      }
    }
    attributes = this.getDOMElementAttributes(domElement);
    attributes["alt"] = alt;
    return new this(domElement.tagName, attributes, src);
  }
};
Cls$images.initClass();
ContentEdit.TagNames.get().register(ContentEdit.ImageFixture, "img-fixture");
const Cls$videos = ContentEdit.Video = class Video extends ContentEdit.ResizableElement {
  static initClass() {
    this.droppers = {
      "Image": ContentEdit.Element._dropBoth,
      "PreText": ContentEdit.Element._dropBoth,
      "Static": ContentEdit.Element._dropBoth,
      "Text": ContentEdit.Element._dropBoth,
      "Video": ContentEdit.Element._dropBoth
    };
    this.placements = ["above", "below", "left", "right", "center"];
  }
  // An editable video (e.g <video><source src="..." type="..."></video>).
  // The `Video` element supports 2 special tags to allow the the size of the
  // image to be constrained (data-ce-min-width, data-ce-max-width).
  //
  // NOTE: YouTube and Vimeo provide support for embedding videos using the
  // <iframe> tag. For this reason we support both video and iframe tags.
  //
  // `sources` should be specified or set against the element as a list of
  // dictionaries containing `src` and `type` key values.
  constructor(tagName, attributes, sources) {
    if (sources == null) {
      sources = [];
    }
    super(tagName, attributes);
    this.sources = sources;
    const size = this.size();
    this._aspectRatio = size[1] / size[0];
  }
  // Read-only properties
  cssTypeName() {
    return "video";
  }
  type() {
    return "Video";
  }
  typeName() {
    return "Video";
  }
  _title() {
    let src = "";
    if (this.attr("src")) {
      src = this.attr("src");
    } else {
      if (this.sources.length) {
        src = this.sources[0]["src"];
      }
    }
    if (!src) {
      src = "No video source set";
    }
    if (src.length > 80) {
      src = src.substr(0, 80) + "...";
    }
    return src;
  }
  // Methods
  createDraggingDOMElement() {
    if (!this.isMounted()) {
      return;
    }
    const helper = super.createDraggingDOMElement();
    helper.innerHTML = this._title();
    return helper;
  }
  html(indent) {
    if (indent == null) {
      indent = "";
    }
    const le = ContentEdit.LINE_ENDINGS;
    if (this.tagName() === "video") {
      const sourceStrings = [];
      for (var source of Array.from(this.sources)) {
        var attributes = ContentEdit.attributesToString(source);
        sourceStrings.push(
          `${indent}${ContentEdit.INDENT}<source ${attributes}>`
        );
      }
      return `${indent}<video${this._attributesToString()}>${le}` + sourceStrings.join(le) + `${le}${indent}</video>`;
    } else {
      return `${indent}<${this._tagName}${this._attributesToString()}></${this._tagName}>`;
    }
  }
  mount() {
    this._domElement = rootContext().createElement("div");
    if (this.a && this.a["class"]) {
      this._domElement.setAttribute("class", this.a["class"]);
    } else if (this._attributes["class"]) {
      this._domElement.setAttribute("class", this._attributes["class"]);
    }
    let style = this._attributes["style"] ? this._attributes["style"] : "";
    if (this._attributes["width"]) {
      style += `width:${this._attributes["width"]}px;`;
    }
    if (this._attributes["height"]) {
      style += `height:${this._attributes["height"]}px;`;
    }
    this._domElement.setAttribute("style", style);
    this._domElement.setAttribute("data-ce-title", this._title());
    return super.mount();
  }
  unmount() {
    if (this.isFixed()) {
      const wrapper = rootContext().createElement("div");
      wrapper.innerHTML = this.html();
      const domElement = wrapper.querySelector("iframe");
      this._domElement.parentNode.replaceChild(domElement, this._domElement);
      this._domElement = domElement;
    }
    return super.unmount();
  }
  // Class methods
  static fromDOMElement(domElement) {
    const childNodes = Array.from(domElement.childNodes);
    const sources = [];
    for (var childNode of Array.from(childNodes)) {
      if (childNode.nodeType === 1 && childNode.tagName.toLowerCase() === "source") {
        sources.push(this.getDOMElementAttributes(childNode));
      }
    }
    return new this(
      domElement.tagName,
      this.getDOMElementAttributes(domElement),
      sources
    );
  }
};
Cls$videos.initClass();
ContentEdit.TagNames.get().register(ContentEdit.Video, "iframe", "video");
let Cls$lists = ContentEdit.List = class List extends ContentEdit.ElementCollection {
  static initClass() {
    this.droppers = {
      "Image": ContentEdit.Element._dropBoth,
      "ImageFixture": ContentEdit.Element._dropVert,
      "List": ContentEdit.Element._dropVert,
      "PreText": ContentEdit.Element._dropVert,
      "Static": ContentEdit.Element._dropVert,
      "Text": ContentEdit.Element._dropVert,
      "Video": ContentEdit.Element._dropBoth
    };
  }
  // An editable list (e.g <ol>, <ul>).
  constructor(tagName, attributes) {
    super(tagName, attributes);
  }
  // Read-only properties
  cssTypeName() {
    return "list";
  }
  type() {
    return "List";
  }
  typeName() {
    return "List";
  }
  // Event handlers
  _onMouseOver(ev) {
    if (this.parent().type() === "ListItem") {
      return;
    }
    super._onMouseOver(ev);
    return this._removeCSSClass("ce-element--over");
  }
  // Class methods
  static fromDOMElement(domElement) {
    const list = new this(
      domElement.tagName,
      this.getDOMElementAttributes(domElement)
    );
    const childNodes = Array.from(domElement.childNodes);
    for (var childNode of Array.from(childNodes)) {
      if (childNode.nodeType !== 1) {
        continue;
      }
      if (childNode.tagName.toLowerCase() !== "li") {
        continue;
      }
      list.attach(ContentEdit.ListItem.fromDOMElement(childNode));
    }
    if (list.children.length === 0) {
      return null;
    }
    return list;
  }
};
Cls$lists.initClass();
ContentEdit.TagNames.get().register(ContentEdit.List, "ol", "ul");
ContentEdit.ListItem = class ListItem extends ContentEdit.ElementCollection {
  // An editable list item (e.g <li>).
  //
  // NOTE: The list item element is a collection of at most 2 elements, an
  // `ContentEdit.ListItemText` and optionally a `ContentEdit.List` item.
  constructor(attributes) {
    super("li", attributes);
    this._behaviours["indent"] = true;
  }
  // Read-only properties
  cssTypeName() {
    return "list-item";
  }
  list() {
    if (this.children.length === 2) {
      return this.children[1];
    }
    return null;
  }
  listItemText() {
    if (this.children.length > 0) {
      return this.children[0];
    }
    return null;
  }
  type() {
    return "ListItem";
  }
  // Methods
  html(indent) {
    if (indent == null) {
      indent = "";
    }
    const lines = [
      `${indent}<li${this._attributesToString()}>`
    ];
    if (this.listItemText()) {
      lines.push(this.listItemText().html(indent + ContentEdit.INDENT));
    }
    if (this.list()) {
      lines.push(this.list().html(indent + ContentEdit.INDENT));
    }
    lines.push(`${indent}</li>`);
    return lines.join(ContentEdit.LINE_ENDINGS);
  }
  indent() {
    if (!this.can("indent")) {
      return;
    }
    if (this.parent().children.indexOf(this) === 0) {
      return;
    }
    const sibling = this.previousSibling();
    if (!sibling.list()) {
      sibling.attach(new ContentEdit.List(sibling.parent().tagName()));
    }
    this.listItemText().storeState();
    this.parent().detach(this);
    sibling.list().attach(this);
    return this.listItemText().restoreState();
  }
  remove() {
    if (!this.parent()) {
      return;
    }
    const index = this.parent().children.indexOf(this);
    if (this.list()) {
      const iterable = this.list().children.slice();
      for (let i = 0; i < iterable.length; i++) {
        var child = iterable[i];
        child.parent().detach(child);
        this.parent().attach(child, i + index);
      }
    }
    return this.parent().detach(this);
  }
  unindent() {
    let sibling;
    if (!this.can("indent")) {
      return;
    }
    const parent = this.parent();
    const grandParent = parent.parent();
    const siblings = parent.children.slice(
      parent.children.indexOf(this) + 1,
      parent.children.length
    );
    if (grandParent.type() === "ListItem") {
      this.listItemText().storeState();
      parent.detach(this);
      grandParent.parent().attach(
        this,
        grandParent.parent().children.indexOf(grandParent) + 1
      );
      if (siblings.length && !this.list()) {
        this.attach(new ContentEdit.List(parent.tagName()));
      }
      for (sibling of Array.from(siblings)) {
        sibling.parent().detach(sibling);
        this.list().attach(sibling);
      }
      return this.listItemText().restoreState();
    } else {
      let child, list;
      const text = new ContentEdit.Text(
        "p",
        this.attr("class") ? { "class": this.attr("class") } : {},
        this.listItemText().content
      );
      let selection = null;
      if (this.listItemText().isFocused()) {
        selection = ContentSelect.Range.query(
          this.listItemText().domElement()
        );
      }
      const parentIndex = grandParent.children.indexOf(parent);
      const itemIndex = parent.children.indexOf(this);
      if (itemIndex === 0) {
        list = null;
        if (parent.children.length === 1) {
          if (this.list()) {
            list = new ContentEdit.List(parent.tagName());
          }
          grandParent.detach(parent);
        } else {
          parent.detach(this);
        }
        grandParent.attach(text, parentIndex);
        if (list) {
          grandParent.attach(list, parentIndex + 1);
        }
        if (this.list()) {
          const iterable = this.list().children.slice();
          for (let i = 0; i < iterable.length; i++) {
            child = iterable[i];
            child.parent().detach(child);
            if (list) {
              list.attach(child);
            } else {
              parent.attach(child, i);
            }
          }
        }
      } else if (itemIndex === parent.children.length - 1) {
        parent.detach(this);
        grandParent.attach(text, parentIndex + 1);
        if (this.list()) {
          grandParent.attach(this.list(), parentIndex + 2);
        }
      } else {
        parent.detach(this);
        grandParent.attach(text, parentIndex + 1);
        list = new ContentEdit.List(parent.tagName());
        grandParent.attach(list, parentIndex + 2);
        if (this.list()) {
          for (child of Array.from(this.list().children.slice())) {
            child.parent().detach(child);
            list.attach(child);
          }
        }
        for (sibling of Array.from(siblings)) {
          sibling.parent().detach(sibling);
          list.attach(sibling);
        }
      }
      if (selection) {
        text.focus();
        return selection.select(text.domElement());
      }
    }
  }
  // Event handlers
  _onMouseOver(ev) {
    super._onMouseOver(ev);
    return this._removeCSSClass("ce-element--over");
  }
  // Disabled methods
  _addDOMEventListeners() {
  }
  _removeDOMEventListners() {
  }
  // Class methods
  static fromDOMElement(domElement) {
    const listItem = new this(this.getDOMElementAttributes(domElement));
    let content = "";
    let listDOMElement = null;
    for (var childNode of Array.from(domElement.childNodes)) {
      if (childNode.nodeType === 1) {
        var needle;
        if (needle = childNode.tagName.toLowerCase(), ["ul", "ol", "li"].includes(needle)) {
          if (!listDOMElement) {
            listDOMElement = childNode;
          }
        } else {
          content += childNode.outerHTML;
        }
      } else {
        content += HTMLString.String.encode(childNode.textContent);
      }
    }
    content = content.replace(/^\s+|\s+$/g, "");
    const listItemText = new ContentEdit.ListItemText(content);
    listItem.attach(listItemText);
    if (listDOMElement) {
      const listElement = ContentEdit.List.fromDOMElement(listDOMElement);
      listItem.attach(listElement);
    }
    return listItem;
  }
};
Cls$lists = ContentEdit.ListItemText = class ListItemText extends ContentEdit.Text {
  static initClass() {
    this.droppers = {
      "ListItemText"(element, target, placement) {
        const elementParent = element.parent();
        const targetParent = target.parent();
        elementParent.remove();
        elementParent.detach(element);
        const listItem = new ContentEdit.ListItem(elementParent._attributes);
        listItem.attach(element);
        if (targetParent.list() && placement[0] === "below") {
          targetParent.list().attach(listItem, 0);
          return;
        }
        let insertIndex = targetParent.parent().children.indexOf(targetParent);
        if (placement[0] === "below") {
          insertIndex += 1;
        }
        return targetParent.parent().attach(listItem, insertIndex);
      },
      "Text"(element, target, placement) {
        let cssClass, insertIndex;
        if (element.type() === "Text") {
          const targetParent = target.parent();
          element.parent().detach(element);
          cssClass = element.attr("class");
          const listItem = new ContentEdit.ListItem(
            cssClass ? { "class": cssClass } : {}
          );
          listItem.attach(new ContentEdit.ListItemText(element.content));
          if (targetParent.list() && placement[0] === "below") {
            targetParent.list().attach(listItem, 0);
            return;
          }
          insertIndex = targetParent.parent().children.indexOf(
            targetParent
          );
          if (placement[0] === "below") {
            insertIndex += 1;
          }
          targetParent.parent().attach(listItem, insertIndex);
          listItem.listItemText().focus();
          if (element._savedSelection) {
            return element._savedSelection.select(
              listItem.listItemText().domElement()
            );
          }
        } else {
          cssClass = element.attr("class");
          const text = new ContentEdit.Text(
            "p",
            cssClass ? { "class": cssClass } : {},
            element.content
          );
          element.parent().remove();
          insertIndex = target.parent().children.indexOf(target);
          if (placement[0] === "below") {
            insertIndex += 1;
          }
          target.parent().attach(text, insertIndex);
          text.focus();
          if (element._savedSelection) {
            return element._savedSelection.select(text.domElement());
          }
        }
      }
    };
    this.mergers = {
      // ListItemText + Text
      "ListItemText"(element, target) {
        const offset = target.content.length();
        if (element.content.length()) {
          target.content = target.content.concat(element.content);
        }
        if (target.isMounted()) {
          target._domElement.innerHTML = target.content.html();
        }
        target.focus();
        new ContentSelect.Range(offset, offset).select(target._domElement);
        if (element.type() === "Text") {
          if (element.parent()) {
            element.parent().detach(element);
          }
        } else {
          element.parent().remove();
        }
        return target.taint();
      }
    };
  }
  // The text component of an editable list item (e.g <li> -> TEXT_NODE).
  constructor(content) {
    super("div", {}, content);
  }
  // Read-only properties
  cssTypeName() {
    return "list-item-text";
  }
  type() {
    return "ListItemText";
  }
  typeName() {
    return "List item";
  }
  // Methods
  blur() {
    if (this.content.isWhitespace() && this.can("remove")) {
      this.parent().remove();
    } else if (this.isMounted()) {
      this._domElement.blur();
      this._domElement.removeAttribute("contenteditable");
    }
    return ContentEdit.Element.prototype.blur.call(this);
  }
  can(behaviour, allowed) {
    if (allowed) {
      throw new Error("Cannot set behaviour for ListItemText");
    }
    return this.parent().can(behaviour);
  }
  html(indent) {
    if (indent == null) {
      indent = "";
    }
    if (!this._lastCached || this._lastCached <= this._modified) {
      let content;
      if (ContentEdit.TRIM_WHITESPACE) {
        content = this.content.copy().trim();
      } else {
        content = this.content.copy();
      }
      content.optimize();
      this._lastCached = Date.now();
      this._cached = content.html();
    }
    return `${indent}${this._cached}`;
  }
  // Event handlers
  _onMouseDown(ev) {
    ContentEdit.Element.prototype._onMouseDown.call(this, ev);
    var initDrag = () => {
      if (ContentEdit.Root.get().dragging() === this) {
        ContentEdit.Root.get().cancelDragging();
        const listRoot = this.closest((node) => node.parent().type() === "Region");
        return listRoot.drag(ev.pageX, ev.pageY);
      } else {
        this.drag(ev.pageX, ev.pageY);
        return this._dragTimeout = setTimeout(
          initDrag,
          ContentEdit.DRAG_HOLD_DURATION * 2
        );
      }
    };
    clearTimeout(this._dragTimeout);
    return this._dragTimeout = setTimeout(initDrag, ContentEdit.DRAG_HOLD_DURATION);
  }
  _onMouseMove(ev) {
    if (this._dragTimeout) {
      clearTimeout(this._dragTimeout);
    }
    return ContentEdit.Element.prototype._onMouseMove.call(this, ev);
  }
  _onMouseUp(ev) {
    if (this._dragTimeout) {
      clearTimeout(this._dragTimeout);
    }
    return ContentEdit.Element.prototype._onMouseUp.call(this, ev);
  }
  // Key handlers
  _keyTab(ev) {
    ev.preventDefault();
    if (ev.shiftKey) {
      return this.parent().unindent();
    } else {
      return this.parent().indent();
    }
  }
  _keyReturn(ev) {
    ev.preventDefault();
    if (this.content.isWhitespace()) {
      this.parent().unindent();
      return;
    }
    if (!this.can("spawn")) {
      return;
    }
    ContentSelect.Range.query(this._domElement);
    let selection = ContentSelect.Range.query(this._domElement);
    const tip = this.content.substring(0, selection.get()[0]);
    const tail = this.content.substring(selection.get()[1]);
    if (tip.length() + tail.length() === 0) {
      this.parent().unindent();
      return;
    }
    this.content = tip.trim();
    this.updateInnerHTML();
    const grandParent = this.parent().parent();
    const listItem = new ContentEdit.ListItem(
      this.attr("class") ? { "class": this.attr("class") } : {}
    );
    grandParent.attach(
      listItem,
      grandParent.children.indexOf(this.parent()) + 1
    );
    listItem.attach(new ContentEdit.ListItemText(tail.trim()));
    const list = this.parent().list();
    if (list) {
      this.parent().detach(list);
      listItem.attach(list);
    }
    if (tip.length()) {
      listItem.listItemText().focus();
      selection = new ContentSelect.Range(0, 0);
      selection.select(listItem.listItemText().domElement());
    } else {
      selection = new ContentSelect.Range(0, tip.length());
      selection.select(this._domElement);
    }
    return this.taint();
  }
};
Cls$lists.initClass();
const _mergers = ContentEdit.ListItemText.mergers;
_mergers["Text"] = _mergers["ListItemText"];
let Cls$tables = ContentEdit.Table = class Table extends ContentEdit.ElementCollection {
  static initClass() {
    this.droppers = {
      "Image": ContentEdit.Element._dropBoth,
      "ImageFixture": ContentEdit.Element._dropVert,
      "List": ContentEdit.Element._dropVert,
      "PreText": ContentEdit.Element._dropVert,
      "Static": ContentEdit.Element._dropVert,
      "Table": ContentEdit.Element._dropVert,
      "Text": ContentEdit.Element._dropVert,
      "Video": ContentEdit.Element._dropBoth
    };
  }
  // An editable table (e.g <table>)
  constructor(attributes) {
    super("table", attributes);
  }
  // Read-only properties
  cssTypeName() {
    return "table";
  }
  typeName() {
    return "Table";
  }
  type() {
    return "Table";
  }
  firstSection() {
    let section;
    if (section = this.thead()) {
      return section;
    } else if (section = this.tbody()) {
      return section;
    } else if (section = this.tfoot()) {
      return section;
    }
    return null;
  }
  lastSection() {
    let section;
    if (section = this.tfoot()) {
      return section;
    } else if (section = this.tbody()) {
      return section;
    } else if (section = this.thead()) {
      return section;
    }
    return null;
  }
  tbody() {
    return this._getChild("tbody");
  }
  tfoot() {
    return this._getChild("tfoot");
  }
  thead() {
    return this._getChild("thead");
  }
  // Event handlers
  _onMouseOver(ev) {
    super._onMouseOver(ev);
    return this._removeCSSClass("ce-element--over");
  }
  // Private methods
  _getChild(tagName) {
    for (var child of Array.from(this.children)) {
      if (child.tagName() === tagName) {
        return child;
      }
    }
    return null;
  }
  // Class methods
  static fromDOMElement(domElement) {
    const table = new this(this.getDOMElementAttributes(domElement));
    const childNodes = Array.from(domElement.childNodes);
    const orphanRows = [];
    for (var childNode of Array.from(childNodes)) {
      if (childNode.nodeType !== 1) {
        continue;
      }
      var tagName = childNode.tagName.toLowerCase();
      if (table._getChild(tagName)) {
        continue;
      }
      switch (tagName) {
        case "tbody":
        case "tfoot":
        case "thead":
          var section = ContentEdit.TableSection.fromDOMElement(childNode);
          table.attach(section);
          break;
        case "tr":
          orphanRows.push(
            ContentEdit.TableRow.fromDOMElement(childNode)
          );
          break;
      }
    }
    if (orphanRows.length > 0) {
      if (!table._getChild("tbody")) {
        table.attach(new ContentEdit.TableSection("tbody"));
      }
      for (var row of Array.from(orphanRows)) {
        table.tbody().attach(row);
      }
    }
    if (table.children.length === 0) {
      return null;
    }
    return table;
  }
};
Cls$tables.initClass();
ContentEdit.TagNames.get().register(ContentEdit.Table, "table");
ContentEdit.TableSection = class TableSection extends ContentEdit.ElementCollection {
  // An editable section of a table (e.g <thead>, <tbody>, <tfoot>)
  constructor(tagName, attributes) {
    super(tagName, attributes);
  }
  // Read-only properties
  cssTypeName() {
    return "table-section";
  }
  type() {
    return "TableSection";
  }
  // Event handlers
  _onMouseOver(ev) {
    super._onMouseOver(ev);
    return this._removeCSSClass("ce-element--over");
  }
  // Class methods
  static fromDOMElement(domElement) {
    const section = new this(
      domElement.tagName,
      this.getDOMElementAttributes(domElement)
    );
    const childNodes = Array.from(domElement.childNodes);
    for (var childNode of Array.from(childNodes)) {
      if (childNode.nodeType !== 1) {
        continue;
      }
      if (childNode.tagName.toLowerCase() !== "tr") {
        continue;
      }
      section.attach(ContentEdit.TableRow.fromDOMElement(childNode));
    }
    return section;
  }
};
Cls$tables = ContentEdit.TableRow = class TableRow extends ContentEdit.ElementCollection {
  static initClass() {
    this.droppers = { "TableRow": ContentEdit.Element._dropVert };
  }
  // An editable table row (e.g <tr>)
  constructor(attributes) {
    super("tr", attributes);
  }
  // Read-only properties
  cssTypeName() {
    return "table-row";
  }
  isEmpty() {
    for (var cell of Array.from(this.children)) {
      var text = cell.tableCellText();
      if (text && text.content.length() > 0) {
        return false;
      }
    }
    return true;
  }
  type() {
    return "TableRow";
  }
  typeName() {
    return "Table row";
  }
  // Event handlers
  _onMouseOver(ev) {
    super._onMouseOver(ev);
    return this._removeCSSClass("ce-element--over");
  }
  // Class methods
  static fromDOMElement(domElement) {
    const row = new this(this.getDOMElementAttributes(domElement));
    const childNodes = Array.from(domElement.childNodes);
    for (var childNode of Array.from(childNodes)) {
      if (childNode.nodeType !== 1) {
        continue;
      }
      var tagName = childNode.tagName.toLowerCase();
      if (tagName !== "td" && tagName !== "th") {
        continue;
      }
      row.attach(ContentEdit.TableCell.fromDOMElement(childNode));
    }
    return row;
  }
};
Cls$tables.initClass();
ContentEdit.TableCell = class TableCell extends ContentEdit.ElementCollection {
  // An editable table cell (e.g <td>, <th>).
  constructor(tagName, attributes) {
    super(tagName, attributes);
  }
  // Read-only properties
  cssTypeName() {
    return "table-cell";
  }
  tableCellText() {
    if (this.children.length > 0) {
      return this.children[0];
    }
    return null;
  }
  type() {
    return "TableCell";
  }
  // Methods
  html(indent) {
    if (indent == null) {
      indent = "";
    }
    const lines = [
      `${indent}<${this.tagName()}${this._attributesToString()}>`
    ];
    if (this.tableCellText()) {
      lines.push(this.tableCellText().html(indent + ContentEdit.INDENT));
    }
    lines.push(`${indent}</${this.tagName()}>`);
    return lines.join(ContentEdit.LINE_ENDINGS);
  }
  // Event handlers
  _onMouseOver(ev) {
    super._onMouseOver(ev);
    return this._removeCSSClass("ce-element--over");
  }
  // Disabled methods
  _addDOMEventListeners() {
  }
  _removeDOMEventListners() {
  }
  // Class methods
  static fromDOMElement(domElement) {
    const tableCell = new this(
      domElement.tagName,
      this.getDOMElementAttributes(domElement)
    );
    const tableCellText = new ContentEdit.TableCellText(
      domElement.innerHTML.replace(/^\s+|\s+$/g, "")
    );
    tableCell.attach(tableCellText);
    return tableCell;
  }
};
Cls$tables = ContentEdit.TableCellText = class TableCellText extends ContentEdit.Text {
  static initClass() {
    this.droppers = {};
    this.mergers = {};
  }
  // An editable table cell (e.g <td>, <th> -> TEXT_NODE).
  constructor(content) {
    super("div", {}, content);
  }
  // Read-only properties
  cssTypeName() {
    return "table-cell-text";
  }
  type() {
    return "TableCellText";
  }
  _isInFirstRow() {
    const cell = this.parent();
    const row = cell.parent();
    const section = row.parent();
    const table = section.parent();
    if (section !== table.firstSection()) {
      return false;
    }
    return row === section.children[0];
  }
  _isInLastRow() {
    const cell = this.parent();
    const row = cell.parent();
    const section = row.parent();
    const table = section.parent();
    if (section !== table.lastSection()) {
      return false;
    }
    return row === section.children[section.children.length - 1];
  }
  _isLastInSection() {
    const cell = this.parent();
    const row = cell.parent();
    const section = row.parent();
    if (row !== section.children[section.children.length - 1]) {
      return false;
    }
    return cell === row.children[row.children.length - 1];
  }
  // Methods
  blur() {
    if (this.isMounted()) {
      this._domElement.blur();
      this._domElement.removeAttribute("contenteditable");
    }
    return ContentEdit.Element.prototype.blur.call(this);
  }
  can(behaviour, allowed) {
    if (allowed) {
      throw new Error("Cannot set behaviour for ListItemText");
    }
    return this.parent().can(behaviour);
  }
  html(indent) {
    if (indent == null) {
      indent = "";
    }
    if (!this._lastCached || this._lastCached <= this._modified) {
      let content;
      if (ContentEdit.TRIM_WHITESPACE) {
        content = this.content.copy().trim();
      } else {
        content = this.content.copy();
      }
      content.optimize();
      this._lastCached = Date.now();
      this._cached = content.html();
    }
    return `${indent}${this._cached}`;
  }
  // Event handlers
  _onMouseDown(ev) {
    ContentEdit.Element.prototype._onMouseDown.call(this, ev);
    var initDrag = () => {
      const cell = this.parent();
      if (ContentEdit.Root.get().dragging() === cell.parent()) {
        ContentEdit.Root.get().cancelDragging();
        const table = cell.parent().parent().parent();
        return table.drag(ev.pageX, ev.pageY);
      } else {
        cell.parent().drag(ev.pageX, ev.pageY);
        return this._dragTimeout = setTimeout(
          initDrag,
          ContentEdit.DRAG_HOLD_DURATION * 2
        );
      }
    };
    clearTimeout(this._dragTimeout);
    return this._dragTimeout = setTimeout(initDrag, ContentEdit.DRAG_HOLD_DURATION);
  }
  // Key handlers
  _keyBack(ev) {
    let selection = ContentSelect.Range.query(this._domElement);
    if (selection.get()[0] !== 0 || !selection.isCollapsed()) {
      return;
    }
    ev.preventDefault();
    const cell = this.parent();
    const row = cell.parent();
    if (!(row.isEmpty() && row.can("remove"))) {
      return;
    }
    if (this.content.length() === 0 && row.children.indexOf(cell) === 0) {
      const previous = this.previousContent();
      if (previous) {
        previous.focus();
        selection = new ContentSelect.Range(
          previous.content.length(),
          previous.content.length()
        );
        selection.select(previous.domElement());
      }
      return row.parent().detach(row);
    }
  }
  _keyDelete(ev) {
    const row = this.parent().parent();
    if (!(row.isEmpty() && row.can("remove"))) {
      return;
    }
    ev.preventDefault();
    const lastChild = row.children[row.children.length - 1];
    const nextElement = lastChild.tableCellText().nextContent();
    if (nextElement) {
      nextElement.focus();
      const selection = new ContentSelect.Range(0, 0);
      selection.select(nextElement.domElement());
    }
    return row.parent().detach(row);
  }
  _keyDown(ev) {
    const selection = ContentSelect.Range.query(this._domElement);
    if (!this._atEnd(selection) || !selection.isCollapsed()) {
      return;
    }
    ev.preventDefault();
    const cell = this.parent();
    if (this._isInLastRow()) {
      const row = cell.parent();
      const lastCell = row.children[row.children.length - 1].tableCellText();
      const next = lastCell.nextContent();
      if (next) {
        return next.focus();
      } else {
        return ContentEdit.Root.get().trigger(
          "next-region",
          this.closest((node) => node.type() === "Fixture" || node.type() === "Region")
        );
      }
    } else {
      const nextRow = cell.parent().nextWithTest((node) => node.type() === "TableRow");
      let cellIndex = cell.parent().children.indexOf(cell);
      cellIndex = Math.min(cellIndex, nextRow.children.length);
      return nextRow.children[cellIndex].tableCellText().focus();
    }
  }
  _keyReturn(ev) {
    ev.preventDefault();
    return this._keyTab({ "shiftKey": false, "preventDefault"() {
    } });
  }
  _keyTab(ev) {
    ev.preventDefault();
    const cell = this.parent();
    if (ev.shiftKey) {
      if (this._isInFirstRow() && cell.parent().children[0] === cell) {
        return;
      }
      return this.previousContent().focus();
    } else {
      if (!this.can("spawn")) {
        return;
      }
      const grandParent = cell.parent().parent();
      if (grandParent.tagName() === "tbody" && this._isLastInSection()) {
        const row = new ContentEdit.TableRow();
        for (var child of Array.from(cell.parent().children)) {
          var newCell = new ContentEdit.TableCell(
            child.tagName(),
            child._attributes
          );
          var newCellText = new ContentEdit.TableCellText("");
          newCell.attach(newCellText);
          row.attach(newCell);
        }
        const section = this.closest((node) => node.type() === "TableSection");
        section.attach(row);
        return row.children[0].tableCellText().focus();
      } else {
        return this.nextContent().focus();
      }
    }
  }
  _keyUp(ev) {
    const selection = ContentSelect.Range.query(this._domElement);
    if (selection.get()[0] !== 0 || !selection.isCollapsed()) {
      return;
    }
    ev.preventDefault();
    const cell = this.parent();
    if (this._isInFirstRow()) {
      const row = cell.parent();
      const previous = row.children[0].previousContent();
      if (previous) {
        return previous.focus();
      } else {
        return ContentEdit.Root.get().trigger(
          "previous-region",
          this.closest((node) => node.type() === "Fixture" || node.type() === "Region")
        );
      }
    } else {
      const previousRow = cell.parent().previousWithTest((node) => node.type() === "TableRow");
      let cellIndex = cell.parent().children.indexOf(cell);
      cellIndex = Math.min(cellIndex, previousRow.children.length);
      return previousRow.children[cellIndex].tableCellText().focus();
    }
  }
};
Cls$tables.initClass();
const ContentTools = {
  // Secondary namespace to store a common set of tools
  Tools: {},
  // Global settings
  // The message displayed to user's when we want them to confirm there changes
  // are cancelled.
  CANCEL_MESSAGE: `Your changes have not been saved, do you really want to lose them?`.trim(),
  // The default tool configuration for the editor
  DEFAULT_TOOLS: [
    [
      "bold",
      "italic",
      "link",
      "align-left",
      "align-center",
      "align-right"
    ],
    [
      "heading",
      "subheading",
      "paragraph",
      "unordered-list",
      "ordered-list",
      "table",
      "indent",
      "unindent",
      "line-break"
    ],
    [
      "image",
      "video",
      "preformatted"
    ],
    [
      "undo",
      "redo",
      "remove"
    ]
  ],
  // Default sizes for new videos when inserted into a region
  DEFAULT_VIDEO_HEIGHT: 300,
  DEFAULT_VIDEO_WIDTH: 400,
  // If the user holds down the shift key for an extended period of time the
  // editor app will highlight the editable regions on the page (if there are
  // any). This setting determines how long the user must hold down the shift
  // key to activate highlighting.
  HIGHLIGHT_HOLD_DURATION: 2e3,
  // If specified this should be a function that accepts an
  // `ContentTools.ImageDialog` instance, typically the function then binds a
  // set of handlers to specific dialog events to implement support for
  // uploading images asynchronously.
  IMAGE_UPLOADER: null,
  // When a user pastes HTML content into the page if that content consists
  // of purely inline tags then we attempt to insert as a line in the
  // existing content and not as a list of additional paragraphs. The
  // following is a list of tags considered inline.
  INLINE_TAGS: [
    "a",
    "address",
    "b",
    "code",
    "del",
    "em",
    "i",
    "ins",
    "span",
    "strong",
    "sup",
    "u"
  ],
  // A list of element class names ignored by the inspector, typically because
  // attributes cannot be safely set against them.
  INSPECTOR_IGNORED_ELEMENTS: [
    "Fixture",
    "ListItemText",
    "Region",
    "TableCellText"
  ],
  // The minimum region that can be selected when cropping an image (in pixels)
  MIN_CROP: 10,
  // A map of restricted attributes (attributes which can't be viewed or
  // modified in the properties dialog) in the form:
  //
  // `{tagName: [attributeNames], ...}`
  //
  // Attribute and tag names must be specified in lower case.
  //
  // '*' is a special case tag name any attributes defined against it will be
  // restricted for all tags.
  //
  RESTRICTED_ATTRIBUTES: {
    "*": ["style"],
    "img": [
      "height",
      "src",
      "width",
      "data-ce-max-width",
      "data-ce-min-width"
    ],
    "iframe": ["height", "width"]
  },
  // Utility functions
  getEmbedVideoURL(url) {
    let id, m;
    let k, v;
    const domains = {
      "www.youtube.com": "youtube",
      "youtu.be": "youtube",
      "vimeo.com": "vimeo",
      "player.vimeo.com": "vimeo"
    };
    const parser = rootContext().createElement("a");
    parser.href = url;
    const netloc = parser.hostname.toLowerCase();
    let path = parser.pathname;
    if (path !== null && path.substr(0, 1) !== "/") {
      path = "/" + path;
    }
    const params = {};
    const paramsStr = parser.search.slice(1);
    for (var kv of Array.from(paramsStr.split("&"))) {
      kv = kv.split("=");
      if (kv[0]) {
        params[kv[0]] = kv[1];
      }
    }
    switch (domains[netloc]) {
      case "youtube":
        if (path.toLowerCase() === "/watch") {
          if (!params["v"]) {
            return null;
          }
          id = params["v"];
          delete params["v"];
        } else {
          m = path.match(/\/([A-Za-z0-9_-]+)$/i);
          if (!m) {
            return null;
          }
          id = m[1];
        }
        url = `https://www.youtube.com/embed/${id}`;
        var paramStr = (() => {
          const result = [];
          for (k in params) {
            v = params[k];
            result.push(`${k}=${v}`);
          }
          return result;
        })().join("&");
        if (paramStr) {
          url += `?${paramStr}`;
        }
        return url;
      case "vimeo":
        m = path.match(/\/(\w+\/\w+\/){0,1}(\d+)/i);
        if (!m) {
          return null;
        }
        url = `https://player.vimeo.com/video/${m[2]}`;
        paramStr = (() => {
          const result1 = [];
          for (k in params) {
            v = params[k];
            result1.push(`${k}=${v}`);
          }
          return result1;
        })().join("&");
        if (paramStr) {
          url += `?${paramStr}`;
        }
        return url;
    }
    return null;
  },
  getHTMLCleaner() {
    return new ContentTools.HTMLCleaner();
  },
  getRestrictedAtributes(tagName) {
    let restricted = [];
    if (ContentTools.RESTRICTED_ATTRIBUTES[tagName]) {
      restricted = restricted.concat(
        ContentTools.RESTRICTED_ATTRIBUTES[tagName]
      );
    }
    if (ContentTools.RESTRICTED_ATTRIBUTES["*"]) {
      restricted = restricted.concat(
        ContentTools.RESTRICTED_ATTRIBUTES["*"]
      );
    }
    return restricted;
  },
  getScrollPosition() {
    return rootContext().scrollPosition();
  }
};
const HTML_PROFILE = Object.freeze({
  name: "html",
  tools: null,
  tags: null,
  voidTags: null,
  attributes: null,
  styles: true,
  coding: true,
  resize: true,
  tableSections: true,
  moveStatics: true
});
const MARKDOWN_TAGS = Object.freeze([
  "#text",
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "del",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul"
]);
const MARKDOWN_ATTRIBUTES = Object.freeze({
  "a": Object.freeze(["href", "title"]),
  "img": Object.freeze(["src", "alt", "title"]),
  "td": Object.freeze(["align"]),
  "th": Object.freeze(["align"])
});
const MARKDOWN_TOOLS = Object.freeze(/* @__PURE__ */ new Set([
  "bold",
  "heading",
  "image",
  "indent",
  "italic",
  "line-break",
  "link",
  "ordered-list",
  "paragraph",
  "preformatted",
  "redo",
  "remove",
  "subheading",
  "table",
  "undo",
  "unindent",
  "unordered-list"
]));
const MARKDOWN_PROFILE = Object.freeze({
  name: "markdown",
  tools: MARKDOWN_TOOLS,
  tags: MARKDOWN_TAGS,
  voidTags: Object.freeze(["br", "hr", "img"]),
  attributes: MARKDOWN_ATTRIBUTES,
  styles: false,
  coding: false,
  resize: false,
  tableSections: false,
  moveStatics: false
});
const PROFILES = Object.freeze({
  html: HTML_PROFILE,
  markdown: MARKDOWN_PROFILE
});
function filterToolGroups(profile, groups) {
  const allowed = profile.tools;
  if (!allowed) {
    return groups;
  }
  const filtered = [];
  for (const group of groups) {
    const kept = group.filter((name) => allowed.has(name));
    if (kept.length) {
      filtered.push(kept);
    }
  }
  return filtered;
}
function restrictedAttributes(profile, tagName, present, alreadyRestricted) {
  if (!profile.attributes) {
    return alreadyRestricted.slice();
  }
  const permitted = profile.attributes[tagName.toLowerCase()] || [];
  const denied = alreadyRestricted.slice();
  for (const name of present) {
    const lower = name.toLowerCase();
    if (permitted.indexOf(lower) === -1 && denied.indexOf(lower) === -1) {
      denied.push(lower);
    }
  }
  return denied;
}
ContentTools.ComponentUI = class ComponentUI {
  // All UI compontents inherit from the CompontentUI class which provides base
  // functionality and a common API.
  constructor() {
    this._bindings = {};
    this._parent = null;
    this._children = [];
    this._domElement = null;
  }
  // Read-only methods
  children() {
    return this._children.slice();
  }
  domElement() {
    return this._domElement;
  }
  isMounted() {
    return this._domElement !== null;
  }
  parent() {
    return this._parent;
  }
  _profile() {
    let component = this._parent;
    while (component) {
      if (component.profile) {
        return component.profile();
      }
      component = component.parent();
    }
    return HTML_PROFILE;
  }
  // Methods
  attach(component, index) {
    if (component.parent()) {
      component.parent().detach(component);
    }
    component._parent = this;
    if (index !== void 0) {
      return this._children.splice(index, 0, component);
    } else {
      return this._children.push(component);
    }
  }
  addCSSClass(className) {
    if (!this.isMounted()) {
      return;
    }
    return ContentEdit.addCSSClass(this._domElement, className);
  }
  detach(component) {
    const componentIndex = this._children.indexOf(component);
    if (componentIndex === -1) {
      return;
    }
    return this._children.splice(componentIndex, 1);
  }
  mount() {
  }
  // Mount the component to the DOM
  removeCSSClass(className) {
    if (!this.isMounted()) {
      return;
    }
    return ContentEdit.removeCSSClass(this._domElement, className);
  }
  unmount() {
    if (!this.isMounted()) {
      return;
    }
    this._removeDOMEventListeners();
    if (this._domElement.parentNode) {
      this._domElement.parentNode.removeChild(this._domElement);
    }
    return this._domElement = null;
  }
  // Event methods
  addEventListener(eventName, callback) {
    if (this._bindings[eventName] === void 0) {
      this._bindings[eventName] = [];
    }
    this._bindings[eventName].push(callback);
  }
  createEvent(eventName, detail) {
    return new ContentTools.Event(eventName, detail);
  }
  dispatchEvent(ev) {
    if (!this._bindings[ev.name()]) {
      return !ev.defaultPrevented();
    }
    for (var callback of Array.from(this._bindings[ev.name()])) {
      if (ev.propagationStopped()) {
        break;
      }
      if (!callback) {
        continue;
      }
      callback.call(this, ev);
    }
    return !ev.defaultPrevented();
  }
  removeEventListener(eventName, callback) {
    if (!eventName) {
      this._bindings = {};
      return;
    }
    if (!callback) {
      this._bindings[eventName] = void 0;
      return;
    }
    if (!this._bindings[eventName]) {
      return;
    }
    return (() => {
      const result = [];
      for (let i = 0; i < this._bindings[eventName].length; i++) {
        var suspect = this._bindings[eventName][i];
        if (suspect === callback) {
          result.push(this._bindings[eventName].splice(i, 1));
        } else {
          result.push(void 0);
        }
      }
      return result;
    })();
  }
  // Private methods
  _addDOMEventListeners() {
  }
  // Add all event bindings for the DOM element in this method
  _removeDOMEventListeners() {
  }
  // Remove all event bindings for the DOM element in this method
  static createDiv(classNames, attributes, content) {
    const domElement = rootContext().createElement("div");
    if (classNames && classNames.length > 0) {
      domElement.setAttribute("class", classNames.join(" "));
    }
    if (attributes) {
      for (var name in attributes) {
        var value = attributes[name];
        domElement.setAttribute(name, value);
      }
    }
    if (content) {
      domElement.innerHTML = content;
    }
    return domElement;
  }
};
ContentTools.WidgetUI = class WidgetUI extends ContentTools.ComponentUI {
  // The widget class provides a base class for components that render at the
  // root of the application.
  attach(component, index) {
    super.attach(component, index);
    if (!this.isMounted()) {
      return component.mount();
    }
  }
  detach(component) {
    super.detach(component);
    if (this.isMounted()) {
      return component.unmount();
    }
  }
  detatch(component) {
    console.log(
      "Please call detach, detatch will be removed in release 1.4.x"
    );
    return this.detach(component);
  }
  show() {
    if (this._hideTimeout) {
      clearTimeout(this._hideTimeout);
      this._hideTimeout = null;
      this.unmount();
    }
    if (!this.isMounted()) {
      this.mount();
    }
    const fadeIn = () => {
      this.addCSSClass("ct-widget--active");
      return this._showTimeout = null;
    };
    return this._showTimeout = setTimeout(fadeIn, 100);
  }
  hide() {
    if (this._showTimeout) {
      clearTimeout(this._showTimeout);
      this._showTimeout = null;
    }
    this.removeCSSClass("ct-widget--active");
    var monitorForHidden = () => {
      this._hideTimeout = null;
      if (!this.isMounted()) {
        return;
      }
      if (!rootContext().supportsComputedStyle()) {
        this.unmount();
        return;
      }
      if (parseFloat(rootContext().getComputedStyle(this._domElement).opacity) < 0.01) {
        return this.unmount();
      } else {
        return this._hideTimeout = setTimeout(monitorForHidden, 250);
      }
    };
    if (this.isMounted()) {
      return this._hideTimeout = setTimeout(monitorForHidden, 250);
    }
  }
};
ContentTools.AnchoredComponentUI = class AnchoredComponentUI extends ContentTools.ComponentUI {
  // Anchored components are mounted against a specified DOM element at a
  // specified anchor. Remounting an anchored component requires that the
  // parent perform the re-mount.
  //
  // The benefit of anchored components is they are light weight and can be
  // rendered into different a specific DOM element by the parent, for example
  // tools within the toolbox are anchored components.
  mount(domParent, before = null) {
    domParent.insertBefore(this._domElement, before);
    return this._addDOMEventListeners();
  }
};
ContentTools.Event = class Event {
  // The `Event` class provides information about events dispatched by
  // `UIComponents`.
  constructor(name, detail) {
    this._name = name;
    this._detail = detail;
    this._timeStamp = Date.now();
    this._defaultPrevented = false;
    this._propagationStopped = false;
  }
  // Read-only properties
  defaultPrevented() {
    return this._defaultPrevented;
  }
  detail() {
    return this._detail;
  }
  name() {
    return this._name;
  }
  propagationStopped() {
    return this._propagationStopped;
  }
  timeStamp() {
    return this._timeStamp;
  }
  // Methods
  preventDefault() {
    return this._defaultPrevented = true;
  }
  stopImmediatePropagation() {
    return this._propagationStopped = true;
  }
};
ContentTools.FlashUI = class FlashUI extends ContentTools.AnchoredComponentUI {
  // A flash is a visual indicator displayed typically once a task has been
  // completed, for example it might show that a save has been successful (or
  // failed).
  //
  // Flashes are short lived instances, they display as soon as mounted and are
  // unmount as soon as they're animation has finished. As such references to
  // flash instances should not be stored, e.g:
  //
  // new ContentTools.FlashUI('ok')
  constructor(modifier) {
    super();
    this.mount(modifier);
  }
  // Methods
  mount(modifier) {
    this._domElement = this.constructor.createDiv([
      "ct-flash",
      "ct-flash--active",
      `ct-flash--${modifier}`,
      "ct-widget",
      "ct-widget--active"
    ]);
    super.mount(ContentTools.EditorApp.get().domElement());
    var monitorForHidden = () => {
      if (!rootContext().supportsComputedStyle()) {
        this.unmount();
        return;
      }
      if (!this._domElement.isConnected) {
        this.unmount();
        return;
      }
      if (parseFloat(rootContext().getComputedStyle(this._domElement).opacity) < 0.01) {
        return this.unmount();
      } else {
        return this._monitorTimeout = setTimeout(monitorForHidden, 250);
      }
    };
    return this._monitorTimeout = setTimeout(monitorForHidden, 250);
  }
  unmount() {
    if (this._monitorTimeout) {
      clearTimeout(this._monitorTimeout);
      this._monitorTimeout = null;
    }
    return super.unmount();
  }
};
ContentTools.IgnitionUI = class IgnitionUI extends ContentTools.WidgetUI {
  // To control editing of content (starting/stopping) a ignition switch is
  // provided, the switch has 3 states:
  //
  // - ready    - Displays an edit option
  // - editing  - Displays confirm and cancel options
  // - busy     - Displays a busy status animation
  constructor() {
    super();
    this._revertToState = "ready";
    this._state = "ready";
  }
  // Methods
  busy(busy) {
    if (this.dispatchEvent(this.createEvent("busy", { busy }))) {
      if (busy === (this._state === "busy")) {
        return;
      }
      if (busy) {
        this._revertToState = this._state;
        return this.state("busy");
      } else {
        return this.state(this._revertToState);
      }
    }
  }
  cancel() {
    if (this.dispatchEvent(this.createEvent("cancel"))) {
      return this.state("ready");
    }
  }
  confirm() {
    if (this.dispatchEvent(this.createEvent("confirm"))) {
      return this.state("ready");
    }
  }
  edit() {
    if (this.dispatchEvent(this.createEvent("edit"))) {
      return this.state("editing");
    }
  }
  mount() {
    super.mount();
    this._domElement = this.constructor.createDiv([
      "ct-widget",
      "ct-ignition",
      "ct-ignition--ready"
    ]);
    this.parent().domElement().appendChild(this._domElement);
    this._domEdit = this.constructor.createDiv([
      "ct-ignition__button",
      "ct-ignition__button--edit"
    ]);
    this._domElement.appendChild(this._domEdit);
    this._domConfirm = this.constructor.createDiv([
      "ct-ignition__button",
      "ct-ignition__button--confirm"
    ]);
    this._domElement.appendChild(this._domConfirm);
    this._domCancel = this.constructor.createDiv([
      "ct-ignition__button",
      "ct-ignition__button--cancel"
    ]);
    this._domElement.appendChild(this._domCancel);
    this._domBusy = this.constructor.createDiv([
      "ct-ignition__button",
      "ct-ignition__button--busy"
    ]);
    this._domElement.appendChild(this._domBusy);
    return this._addDOMEventListeners();
  }
  state(state) {
    if (state === void 0) {
      return this._state;
    }
    if (this._state === state) {
      return;
    }
    if (!this.dispatchEvent(this.createEvent("statechange", { state }))) {
      return;
    }
    this._state = state;
    this.removeCSSClass("ct-ignition--busy");
    this.removeCSSClass("ct-ignition--editing");
    this.removeCSSClass("ct-ignition--ready");
    if (this._state === "busy") {
      return this.addCSSClass("ct-ignition--busy");
    } else if (this._state === "editing") {
      return this.addCSSClass("ct-ignition--editing");
    } else if (this._state === "ready") {
      return this.addCSSClass("ct-ignition--ready");
    }
  }
  unmount() {
    super.unmount();
    this._domEdit = null;
    this._domConfirm = null;
    return this._domCancel = null;
  }
  // Private methods
  _addDOMEventListeners() {
    this._domEdit.addEventListener("click", (ev) => {
      ev.preventDefault();
      return this.edit();
    });
    this._domConfirm.addEventListener("click", (ev) => {
      ev.preventDefault();
      return this.confirm();
    });
    return this._domCancel.addEventListener("click", (ev) => {
      ev.preventDefault();
      return this.cancel();
    });
  }
};
ContentTools.InspectorUI = class InspectorUI extends ContentTools.WidgetUI {
  // The inspector provides a breadcrumb style navigation tool for the
  // currently selected element in the document and it's chain of parent
  // elements.
  constructor() {
    super();
    this._tagUIs = [];
  }
  mount() {
    this._domElement = this.constructor.createDiv(["ct-widget", "ct-inspector"]);
    this.parent().domElement().appendChild(this._domElement);
    this._domTags = this.constructor.createDiv([
      "ct-inspector__tags",
      "ct-tags"
    ]);
    this._domElement.appendChild(this._domTags);
    this._domCounter = this.constructor.createDiv(["ct-inspector__counter"]);
    this._domElement.appendChild(this._domCounter);
    this.updateCounter();
    this._addDOMEventListeners();
    this._handleFocusChange = () => {
      return this.updateTags();
    };
    ContentEdit.Root.get().bind("blur", this._handleFocusChange);
    ContentEdit.Root.get().bind("focus", this._handleFocusChange);
    return ContentEdit.Root.get().bind("mount", this._handleFocusChange);
  }
  unmount() {
    super.unmount();
    this._domTags = null;
    ContentEdit.Root.get().unbind("blur", this._handleFocusChange);
    ContentEdit.Root.get().unbind("focus", this._handleFocusChange);
    return ContentEdit.Root.get().unbind("mount", this._handleFocusChange);
  }
  updateCounter() {
    if (!this.isMounted()) {
      return;
    }
    let completeText = "";
    for (var region of Array.from(ContentTools.EditorApp.get().orderedRegions())) {
      if (!region) {
        continue;
      }
      completeText += region.domElement().textContent;
    }
    completeText = completeText.trim();
    completeText = completeText.replace(/<\/?[a-z][^>]*>/gi, "");
    completeText = completeText.replace(/[\u200B]+/, "");
    completeText = completeText.replace(/['";:,.?¿\-!¡]+/g, "");
    let word_count = (completeText.match(/\S+/g) || []).length;
    word_count = word_count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const element = ContentEdit.Root.get().focused();
    if (!element || element.type() !== "PreText" || !element.selection().isCollapsed()) {
      this._domCounter.textContent = word_count;
      return;
    }
    let line = 0;
    let column = 1;
    const sub = element.content.substring(0, element.selection().get()[0]);
    const lines = sub.text().split("\n");
    line = lines.length;
    column = lines[lines.length - 1].length + 1;
    line = line.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    column = column.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return this._domCounter.textContent = `${word_count} / ${line}:${column}`;
  }
  updateTags() {
    let tag;
    let element = ContentEdit.Root.get().focused();
    for (tag of Array.from(this._tagUIs)) {
      tag.unmount();
    }
    this._tagUIs = [];
    if (!element) {
      return;
    }
    const elements = element.parents();
    elements.reverse();
    elements.push(element);
    return (() => {
      const result = [];
      for (element of Array.from(elements)) {
        if (ContentTools.INSPECTOR_IGNORED_ELEMENTS.indexOf(
          element.type()
        ) !== -1) {
          continue;
        }
        tag = new ContentTools.TagUI(element);
        this._tagUIs.push(tag);
        result.push(tag.mount(this._domTags));
      }
      return result;
    })();
  }
  _addDOMEventListeners() {
    return this._updateCounterInterval = setInterval(
      () => this.updateCounter(),
      250
    );
  }
  _removeDOMEventListeners() {
    return clearInterval(this._updateCounterInterval);
  }
};
ContentTools.TagUI = class TagUI extends ContentTools.AnchoredComponentUI {
  // A tag displayed in the inspector representing the selected element or one
  // of it's parents.
  constructor(element) {
    super();
    this._onMouseDown = this._onMouseDown.bind(this);
    this.element = element;
  }
  // Methods
  mount(domParent, before = null) {
    this._domElement = this.constructor.createDiv(["ct-tag"]);
    this._domElement.textContent = this.element.tagName();
    return super.mount(domParent, before);
  }
  // Private methods
  _addDOMEventListeners() {
    return this._domElement.addEventListener("mousedown", this._onMouseDown);
  }
  _onMouseDown(ev) {
    ev.preventDefault();
    if (this.element.storeState) {
      this.element.storeState();
    }
    const app = ContentTools.EditorApp.get();
    const modal = new ContentTools.ModalUI();
    const dialog = new ContentTools.PropertiesDialog(this.element);
    dialog.addEventListener("cancel", () => {
      modal.hide();
      dialog.hide();
      if (this.element.restoreState) {
        return this.element.restoreState();
      }
    });
    dialog.addEventListener("save", (ev2) => {
      let element;
      const detail = ev2.detail();
      const attributes = detail.changedAttributes;
      const styles = detail.changedStyles;
      const {
        innerHTML
      } = detail;
      for (var name in attributes) {
        var value = attributes[name];
        if (name === "class") {
          var className;
          if (value === null) {
            value = "";
          }
          var classNames = {};
          for (className of Array.from(value.split(" "))) {
            className = className.trim();
            if (!className) {
              continue;
            }
            classNames[className] = true;
            if (!this.element.hasCSSClass(className)) {
              this.element.addCSSClass(className);
            }
          }
          for (className of Array.from(this.element.attr("class").split(" "))) {
            className = className.trim();
            if (classNames[className] === void 0) {
              this.element.removeCSSClass(className);
            }
          }
        } else {
          if (value === null) {
            this.element.removeAttr(name);
          } else {
            this.element.attr(name, value);
          }
        }
      }
      for (var cssClass in styles) {
        var applied = styles[cssClass];
        if (applied) {
          this.element.addCSSClass(cssClass);
        } else {
          this.element.removeCSSClass(cssClass);
        }
      }
      if (innerHTML !== null) {
        if (innerHTML !== dialog.getElementInnerHTML()) {
          ({
            element
          } = this);
          if (!element.content) {
            element = element.children[0];
          }
          element.content = new HTMLString.String(
            innerHTML,
            element.content.preserveWhitespace()
          );
          element.updateInnerHTML();
          element.taint();
          element.selection(new ContentSelect.Range(0, 0));
          element.storeState();
        }
      }
      modal.hide();
      dialog.hide();
      if (this.element.restoreState) {
        return this.element.restoreState();
      }
    });
    app.attach(modal);
    app.attach(dialog);
    modal.show();
    return dialog.show();
  }
};
ContentTools.ModalUI = class ModalUI extends ContentTools.WidgetUI {
  // The modal UI component provides an element over the page. The modal layer
  // prevents the user from interacting with the page whilst allowing them to
  // interact with UI components above the layer, for example a dialog.
  constructor(transparent, allowScrolling) {
    super();
    this._transparent = transparent;
    this._allowScrolling = allowScrolling;
  }
  // Methods
  mount() {
    this._domElement = this.constructor.createDiv([
      "ct-widget",
      "ct-modal"
    ]);
    this.parent().domElement().appendChild(this._domElement);
    if (this._transparent) {
      this.addCSSClass("ct-modal--transparent");
    }
    if (!this._allowScrolling) {
      rootContext().setGlobalState("no-scroll", true);
    }
    return this._addDOMEventListeners();
  }
  unmount() {
    if (!this._allowScrolling) {
      rootContext().setGlobalState("no-scroll", false);
    }
    return super.unmount();
  }
  // Private methods
  _addDOMEventListeners() {
    return this._domElement.addEventListener("click", (ev) => {
      return this.dispatchEvent(this.createEvent("click"));
    });
  }
};
ContentTools.ToolboxUI = class ToolboxUI extends ContentTools.WidgetUI {
  // The toolbox window provides a set of content editing tools to the user
  // (e.g make the selected text bold, insert an image, etc.) The toolbox is
  // also draggable so that the user can position as required whilst editing.
  constructor(tools) {
    super();
    this._onDrag = this._onDrag.bind(this);
    this._onStartDragging = this._onStartDragging.bind(this);
    this._onStopDragging = this._onStopDragging.bind(this);
    this._tools = tools;
    this._dragging = false;
    this._draggingOffset = null;
    this._domGrip = null;
    this._toolUIs = {};
  }
  // Read-only properties
  isDragging() {
    return this._dragging;
  }
  // Methods
  hide() {
    this._removeDOMEventListeners();
    return super.hide();
  }
  mount() {
    this._domElement = this.constructor.createDiv([
      "ct-widget",
      "ct-toolbox"
    ]);
    this.parent().domElement().appendChild(this._domElement);
    this._domGrip = this.constructor.createDiv([
      "ct-toolbox__grip",
      "ct-grip"
    ]);
    this._domElement.appendChild(this._domGrip);
    this._domGrip.appendChild(this.constructor.createDiv(["ct-grip__bump"]));
    this._domGrip.appendChild(this.constructor.createDiv(["ct-grip__bump"]));
    this._domGrip.appendChild(this.constructor.createDiv(["ct-grip__bump"]));
    this._domToolGroups = this.constructor.createDiv(["ct-tool-groups"]);
    this._domElement.appendChild(this._domToolGroups);
    this.tools(this._tools);
    const restore = rootContext().storage().getItem("ct-toolbox-position");
    if (restore && /^\d+,\d+$/.test(restore)) {
      const position = Array.from(restore.split(",")).map((coord) => parseInt(coord));
      this._domElement.style.left = `${position[0]}px`;
      this._moveTop(`${position[1]}px`);
      this._contain();
    }
    return this._addDOMEventListeners();
  }
  tools(tools) {
    let toolName;
    if (tools === void 0) {
      return this._tools;
    }
    this._tools = tools;
    if (!this.isMounted()) {
      return;
    }
    for (toolName in this._toolUIs) {
      var toolUI = this._toolUIs[toolName];
      toolUI.unmount();
    }
    this._toolUIs = {};
    while (this._domToolGroups.lastChild) {
      this._domToolGroups.removeChild(this._domToolGroups.lastChild);
    }
    return (() => {
      const result = [];
      for (let i = 0; i < this._tools.length; i++) {
        var toolGroup = this._tools[i];
        var domToolGroup = this.constructor.createDiv(["ct-tool-group"]);
        this._domToolGroups.appendChild(domToolGroup);
        result.push((() => {
          const result1 = [];
          for (toolName of Array.from(toolGroup)) {
            var tool = ContentTools.ToolShelf.fetch(toolName);
            this._toolUIs[toolName] = new ContentTools.ToolUI(tool);
            this._toolUIs[toolName].mount(domToolGroup);
            this._toolUIs[toolName].disabled(true);
            result1.push(this._toolUIs[toolName].addEventListener("applied", () => {
              return this.updateTools();
            }));
          }
          return result1;
        })());
      }
      return result;
    })();
  }
  updateTools() {
    const element = ContentEdit.Root.get().focused();
    let selection = null;
    if (element && element.selection) {
      selection = element.selection();
    }
    return (() => {
      const result = [];
      for (var name in this._toolUIs) {
        var toolUI = this._toolUIs[name];
        result.push(toolUI.update(element, selection));
      }
      return result;
    })();
  }
  unmount() {
    super.unmount();
    return this._domGrip = null;
  }
  // Private methods
  _addDOMEventListeners() {
    this._domGrip.addEventListener("mousedown", this._onStartDragging);
    this._handleResize = (ev) => {
      if (this._resizeTimeout) {
        clearTimeout(this._resizeTimeout);
      }
      const containResize = () => {
        return this._contain();
      };
      return this._resizeTimeout = setTimeout(containResize, 250);
    };
    rootContext().on("window", "resize", this._handleResize);
    this._updateTools = () => {
      const app = ContentTools.EditorApp.get();
      let update = false;
      const element = ContentEdit.Root.get().focused();
      let selection = null;
      if (element === this._lastUpdateElement) {
        if (element && element.selection) {
          selection = element.selection();
          if (this._lastUpdateSelection) {
            if (!selection.eq(this._lastUpdateSelection)) {
              update = true;
            }
          } else {
            update = true;
          }
        }
      } else {
        update = true;
      }
      if (app.history) {
        if (this._lastUpdateHistoryLength !== app.history.length()) {
          update = true;
        }
        this._lastUpdateHistoryLength = app.history.length();
        if (this._lastUpdateHistoryIndex !== app.history.index()) {
          update = true;
        }
        this._lastUpdateHistoryIndex = app.history.index();
      }
      this._lastUpdateElement = element;
      this._lastUpdateSelection = selection;
      if (update) {
        return (() => {
          const result = [];
          for (var name in this._toolUIs) {
            var toolUI = this._toolUIs[name];
            result.push(toolUI.update(element, selection));
          }
          return result;
        })();
      }
    };
    this._updateToolsInterval = setInterval(this._updateTools, 100);
    this._handleKeyDown = (ev) => {
      const element = ContentEdit.Root.get().focused();
      if (element && !element.content) {
        if (ev.keyCode === 46) {
          ev.preventDefault();
          return ContentTools.Tools.Remove.apply(element, null, function() {
          });
        }
        if (ev.keyCode === 13) {
          ev.preventDefault();
          const {
            Paragraph: Paragraph2
          } = ContentTools.Tools;
          return Paragraph2.apply(element, null, function() {
          });
        }
      }
      const version = navigator.appVersion;
      let os = "linux";
      if (version.indexOf("Mac") !== -1) {
        os = "mac";
      } else if (version.indexOf("Win") !== -1) {
        os = "windows";
      }
      let redo = false;
      let undo = false;
      switch (os) {
        case "linux":
          if (!ev.altKey) {
            if (ev.keyCode === 90 && ev.ctrlKey) {
              redo = ev.shiftKey;
              undo = !redo;
            }
          }
          break;
        case "mac":
          if (!(ev.altKey || ev.ctrlKey)) {
            if (ev.keyCode === 90 && ev.metaKey) {
              redo = ev.shiftKey;
              undo = !redo;
            }
          }
          break;
        case "windows":
          if (!ev.altKey || ev.shiftKey) {
            if (ev.keyCode === 89 && ev.ctrlKey) {
              redo = true;
            }
            if (ev.keyCode === 90 && ev.ctrlKey) {
              undo = true;
            }
          }
          break;
      }
      if (undo && ContentTools.Tools.Undo.canApply(null, null)) {
        ContentTools.Tools.Undo.apply(null, null, function() {
        });
      }
      if (redo && ContentTools.Tools.Redo.canApply(null, null)) {
        return ContentTools.Tools.Redo.apply(null, null, function() {
        });
      }
    };
    return rootContext().on("window", "keydown", this._handleKeyDown);
  }
  _moveTop(px) {
    this._domElement.style.bottom = "auto";
    this._domElement.style.top = px;
  }
  _contain() {
    if (!this.isMounted()) {
      return;
    }
    let rect = this._domElement.getBoundingClientRect();
    if (rect.left + rect.width > rootContext().viewportSize()[0]) {
      this._domElement.style.left = `${rootContext().viewportSize()[0] - rect.width}px`;
    }
    if (rect.top + rect.height > rootContext().viewportSize()[1]) {
      this._moveTop(`${rootContext().viewportSize()[1] - rect.height}px`);
    }
    if (rect.left < 0) {
      this._domElement.style.left = "0px";
    }
    if (rect.top < 0) {
      this._moveTop("0px");
    }
    rect = this._domElement.getBoundingClientRect();
    return rootContext().storage().setItem(
      "ct-toolbox-position",
      `${rect.left},${rect.top}`
    );
  }
  _removeDOMEventListeners() {
    if (this.isMounted()) {
      this._domGrip.removeEventListener("mousedown", this._onStartDragging);
    }
    rootContext().off("window", "keydown", this._handleKeyDown);
    rootContext().off("window", "resize", this._handleResize);
    return clearInterval(this._updateToolsInterval);
  }
  // Dragging methods
  _onDrag(ev) {
    ContentSelect.Range.unselectAll();
    this._domElement.style.left = `${ev.clientX - this._draggingOffset.x}px`;
    return this._moveTop(`${ev.clientY - this._draggingOffset.y}px`);
  }
  _onStartDragging(ev) {
    ev.preventDefault();
    if (this.isDragging()) {
      return;
    }
    this._dragging = true;
    this.addCSSClass("ct-toolbox--dragging");
    const rect = this._domElement.getBoundingClientRect();
    this._draggingOffset = {
      x: ev.clientX - rect.left,
      y: ev.clientY - rect.top
    };
    rootContext().on("document", "mousemove", this._onDrag);
    rootContext().on("document", "mouseup", this._onStopDragging);
    return rootContext().setGlobalState("dragging", true);
  }
  _onStopDragging(ev) {
    if (!this.isDragging()) {
      return;
    }
    this._contain();
    rootContext().off("document", "mousemove", this._onDrag);
    rootContext().off("document", "mouseup", this._onStopDragging);
    this._draggingOffset = null;
    this._dragging = false;
    this.removeCSSClass("ct-toolbox--dragging");
    return rootContext().setGlobalState("dragging", false);
  }
};
ContentTools.ToolUI = class ToolUI extends ContentTools.AnchoredComponentUI {
  // A tool that can be selected in the toolbox.
  constructor(tool) {
    super();
    this._addDOMEventListeners = this._addDOMEventListeners.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseLeave = this._onMouseLeave.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this.tool = tool;
    this._mouseDown = false;
    this._disabled = false;
  }
  // Methods
  apply(element, selection) {
    if (!this.tool.canApply(element, selection)) {
      return;
    }
    const detail = {
      "element": element,
      "selection": selection
    };
    const callback = (applied) => {
      if (applied) {
        return this.dispatchEvent(this.createEvent("applied", detail));
      }
    };
    if (this.dispatchEvent(this.createEvent("apply", detail))) {
      return this.tool.apply(element, selection, callback);
    }
  }
  disabled(disabledState) {
    if (disabledState === void 0) {
      return this._disabled;
    }
    if (this._disabled === disabledState) {
      return;
    }
    this._disabled = disabledState;
    if (disabledState) {
      this._mouseDown = false;
      this.addCSSClass("ct-tool--disabled");
      return this.removeCSSClass("ct-tool--applied");
    } else {
      return this.removeCSSClass("ct-tool--disabled");
    }
  }
  mount(domParent, before = null) {
    this._domElement = this.constructor.createDiv([
      "ct-tool",
      `ct-tool--${this.tool.icon}`
    ]);
    this._domElement.setAttribute("data-ct-tooltip", ContentEdit._(this.tool.label));
    return super.mount(domParent, before);
  }
  update(element, selection) {
    if (this.tool.requiresElement) {
      if (!(element && element.isMounted())) {
        this.disabled(true);
        return;
      }
    }
    if (this.tool.canApply(element, selection)) {
      this.disabled(false);
    } else {
      this.disabled(true);
      return;
    }
    if (this.tool.isApplied(element, selection)) {
      return this.addCSSClass("ct-tool--applied");
    } else {
      return this.removeCSSClass("ct-tool--applied");
    }
  }
  // Private methods
  _addDOMEventListeners() {
    this._domElement.addEventListener("mousedown", this._onMouseDown);
    this._domElement.addEventListener("mouseleave", this._onMouseLeave);
    return this._domElement.addEventListener("mouseup", this._onMouseUp);
  }
  // It's important to note that the click event for tools is managed in order
  // to prevent focus being lost from an element because of a tool being
  // clicked. Native 'mousedown' events triggered have their defaults
  // prevented.
  _onMouseDown(ev) {
    ev.preventDefault();
    if (this.disabled()) {
      return;
    }
    this._mouseDown = true;
    return this.addCSSClass("ct-tool--down");
  }
  _onMouseLeave(ev) {
    this._mouseDown = false;
    return this.removeCSSClass("ct-tool--down");
  }
  _onMouseUp(ev) {
    if (this._mouseDown) {
      const element = ContentEdit.Root.get().focused();
      if (this.tool.requiresElement) {
        if (!element || !element.isMounted()) {
          return;
        }
      }
      let selection = null;
      if (element && element.selection) {
        selection = element.selection();
      }
      this.apply(element, selection);
    }
    this._mouseDown = false;
    return this.removeCSSClass("ct-tool--down");
  }
};
ContentTools.AnchoredDialogUI = class AnchoredDialogUI extends ContentTools.WidgetUI {
  // Base class for creating anchored dialogs. An anchored dialog appears above
  // the page but is anchored to a set position within, they are typically used
  // for in page edits, such as setting a link within the page.
  constructor() {
    super();
    this._position = [0, 0];
  }
  // Public methods
  mount() {
    this._domElement = this.constructor.createDiv([
      "ct-widget",
      "ct-anchored-dialog"
    ]);
    this.parent().domElement().appendChild(this._domElement);
    this._contain();
    this._domElement.style.top = `${this._position[1]}px`;
    return this._domElement.style.left = `${this._position[0]}px`;
  }
  position(newPosition) {
    if (newPosition === void 0) {
      return this._position.slice();
    }
    this._position = newPosition.slice();
    if (this.isMounted()) {
      this._contain();
      this._domElement.style.top = `${this._position[1]}px`;
      return this._domElement.style.left = `${this._position[0]}px`;
    }
  }
  // Private methods
  _contain() {
    if (!this.isMounted()) {
      return;
    }
    const rect = this._domElement.getBoundingClientRect();
    const halfWidth = rect.width / 2 + 5;
    const pageWidth = rootContext().pageWidth();
    if (this._position[0] + halfWidth > pageWidth) {
      this._position[0] = pageWidth - halfWidth;
    }
    if (this._position[0] < halfWidth) {
      this._position[0] = halfWidth;
    }
    if (this._position[1] + rect.top < 5) {
      return this._position[1] = Math.abs(rect.top) + 5;
    }
  }
};
ContentTools.DialogUI = class DialogUI extends ContentTools.WidgetUI {
  // Base class for creating standard dialogs.
  constructor(caption) {
    if (caption == null) {
      caption = "";
    }
    super();
    this._busy = false;
    this._caption = caption;
  }
  // Methods
  busy(busy) {
    if (busy === void 0) {
      return this._busy;
    }
    if (this._busy === busy) {
      return;
    }
    this._busy = busy;
    if (!this.isMounted()) {
      return;
    }
    if (this._busy) {
      return ContentEdit.addCSSClass(this._domElement, "ct-dialog--busy");
    } else {
      return ContentEdit.removeCSSClass(this._domElement, "ct-dialog--busy");
    }
  }
  caption(caption) {
    if (caption === void 0) {
      return this._caption;
    }
    this._caption = caption;
    return this._domCaption.textContent = ContentEdit._(caption);
  }
  mount() {
    if (rootContext().getActiveElement()) {
      rootContext().getActiveElement().blur();
      rootContext().clearSelection();
    }
    const dialogCSSClasses = [
      "ct-widget",
      "ct-dialog"
    ];
    if (this._busy) {
      dialogCSSClasses.push("ct-dialog--busy");
    }
    this._domElement = this.constructor.createDiv(dialogCSSClasses);
    this.parent().domElement().appendChild(this._domElement);
    const domHeader = this.constructor.createDiv(["ct-dialog__header"]);
    this._domElement.appendChild(domHeader);
    this._domCaption = this.constructor.createDiv(["ct-dialog__caption"]);
    domHeader.appendChild(this._domCaption);
    this.caption(this._caption);
    this._domClose = this.constructor.createDiv(["ct-dialog__close"]);
    domHeader.appendChild(this._domClose);
    const domBody = this.constructor.createDiv(["ct-dialog__body"]);
    this._domElement.appendChild(domBody);
    this._domView = this.constructor.createDiv(["ct-dialog__view"]);
    domBody.appendChild(this._domView);
    this._domControls = this.constructor.createDiv(["ct-dialog__controls"]);
    domBody.appendChild(this._domControls);
    this._domBusy = this.constructor.createDiv(["ct-dialog__busy"]);
    return this._domElement.appendChild(this._domBusy);
  }
  unmount() {
    super.unmount();
    this._domBusy = null;
    this._domCaption = null;
    this._domClose = null;
    this._domControls = null;
    return this._domView = null;
  }
  // Private methods
  _addDOMEventListeners() {
    this._handleEscape = (ev) => {
      if (this._busy) {
        return;
      }
      if (ev.keyCode === 27) {
        return this.dispatchEvent(this.createEvent("cancel"));
      }
    };
    rootContext().on("document", "keyup", this._handleEscape);
    return this._domClose.addEventListener("click", (ev) => {
      ev.preventDefault();
      if (this._busy) {
        return;
      }
      return this.dispatchEvent(this.createEvent("cancel"));
    });
  }
  _removeDOMEventListeners() {
    return rootContext().off("document", "keyup", this._handleEscape);
  }
};
ContentTools.ImageDialog = class ImageDialog extends ContentTools.DialogUI {
  // A dialog to support inserting an image
  // Note: The image dialog doesn't handle the uploading of images it expects
  // this process to be handled by an external library. The external library
  // should be defined as an object against the ContentTools namespace like so:
  //
  // ContentTools.IMAGE_UPLOADER = externalImageUploader
  //
  // The external library should provide an `init(dialog)` method. This method
  // recieves the dialog widget and can then set up all required event bindings
  // to support image uploads.
  constructor() {
    super("Insert image");
    this._cropMarks = null;
    this._imageURL = null;
    this._imageSize = null;
    this._progress = 0;
    this._state = "empty";
    if (ContentTools.IMAGE_UPLOADER) {
      ContentTools.IMAGE_UPLOADER(this);
    }
  }
  // Read-only properties
  cropRegion() {
    if (this._cropMarks) {
      return this._cropMarks.region();
    }
    return [0, 0, 1, 1];
  }
  // Methods
  addCropMarks() {
    if (this._cropMarks) {
      return;
    }
    this._cropMarks = new CropMarksUI(this._imageSize);
    this._cropMarks.mount(this._domView);
    return ContentEdit.addCSSClass(this._domCrop, "ct-control--active");
  }
  clear() {
    if (this._domImage) {
      this._domImage.parentNode.removeChild(this._domImage);
      this._domImage = null;
    }
    this._imageURL = null;
    this._imageSize = null;
    return this.state("empty");
  }
  mount() {
    super.mount();
    ContentEdit.addCSSClass(this._domElement, "ct-image-dialog");
    ContentEdit.addCSSClass(this._domElement, "ct-image-dialog--empty");
    ContentEdit.addCSSClass(this._domView, "ct-image-dialog__view");
    const domTools = this.constructor.createDiv(
      ["ct-control-group", "ct-control-group--left"]
    );
    this._domControls.appendChild(domTools);
    this._domRotateCCW = this.constructor.createDiv([
      "ct-control",
      "ct-control--icon",
      "ct-control--rotate-ccw"
    ]);
    this._domRotateCCW.setAttribute(
      "data-ct-tooltip",
      ContentEdit._("Rotate") + " -90°"
    );
    domTools.appendChild(this._domRotateCCW);
    this._domRotateCW = this.constructor.createDiv([
      "ct-control",
      "ct-control--icon",
      "ct-control--rotate-cw"
    ]);
    this._domRotateCW.setAttribute(
      "data-ct-tooltip",
      ContentEdit._("Rotate") + " 90°"
    );
    domTools.appendChild(this._domRotateCW);
    this._domCrop = this.constructor.createDiv([
      "ct-control",
      "ct-control--icon",
      "ct-control--crop"
    ]);
    this._domCrop.setAttribute("data-ct-tooltip", ContentEdit._("Crop marks"));
    domTools.appendChild(this._domCrop);
    const domProgressBar = this.constructor.createDiv(["ct-progress-bar"]);
    domTools.appendChild(domProgressBar);
    this._domProgress = this.constructor.createDiv(["ct-progress-bar__progress"]);
    domProgressBar.appendChild(this._domProgress);
    const domActions = this.constructor.createDiv(
      ["ct-control-group", "ct-control-group--right"]
    );
    this._domControls.appendChild(domActions);
    this._domUpload = this.constructor.createDiv([
      "ct-control",
      "ct-control--text",
      "ct-control--upload"
    ]);
    this._domUpload.textContent = ContentEdit._("Upload");
    domActions.appendChild(this._domUpload);
    this._domInput = rootContext().createElement("input");
    this._domInput.setAttribute("class", "ct-image-dialog__file-upload");
    this._domInput.setAttribute("name", "file");
    this._domInput.setAttribute("type", "file");
    this._domInput.setAttribute("accept", "image/*");
    this._domUpload.appendChild(this._domInput);
    this._domInsert = this.constructor.createDiv([
      "ct-control",
      "ct-control--text",
      "ct-control--insert"
    ]);
    this._domInsert.textContent = ContentEdit._("Insert");
    domActions.appendChild(this._domInsert);
    this._domCancelUpload = this.constructor.createDiv([
      "ct-control",
      "ct-control--text",
      "ct-control--cancel"
    ]);
    this._domCancelUpload.textContent = ContentEdit._("Cancel");
    domActions.appendChild(this._domCancelUpload);
    this._domClear = this.constructor.createDiv([
      "ct-control",
      "ct-control--text",
      "ct-control--clear"
    ]);
    this._domClear.textContent = ContentEdit._("Clear");
    domActions.appendChild(this._domClear);
    this._addDOMEventListeners();
    return this.dispatchEvent(this.createEvent("imageuploader.mount"));
  }
  populate(imageURL, imageSize) {
    this._imageURL = imageURL;
    this._imageSize = imageSize;
    if (!this._domImage) {
      this._domImage = this.constructor.createDiv(["ct-image-dialog__image"]);
      this._domView.appendChild(this._domImage);
    }
    this._domImage.style["background-image"] = `url(${imageURL})`;
    return this.state("populated");
  }
  progress(progress) {
    if (progress === void 0) {
      return this._progress;
    }
    this._progress = progress;
    if (!this.isMounted()) {
      return;
    }
    return this._domProgress.style.width = `${this._progress}%`;
  }
  removeCropMarks() {
    if (!this._cropMarks) {
      return;
    }
    this._cropMarks.unmount();
    this._cropMarks = null;
    return ContentEdit.removeCSSClass(this._domCrop, "ct-control--active");
  }
  save(imageURL, imageSize, imageAttrs) {
    return this.dispatchEvent(
      this.createEvent(
        "save",
        {
          "imageURL": imageURL,
          "imageSize": imageSize,
          "imageAttrs": imageAttrs
        }
      )
    );
  }
  state(state) {
    if (state === void 0) {
      return this._state;
    }
    if (this._state === state) {
      return;
    }
    const prevState = this._state;
    this._state = state;
    if (!this.isMounted()) {
      return;
    }
    ContentEdit.addCSSClass(this._domElement, `ct-image-dialog--${this._state}`);
    return ContentEdit.removeCSSClass(
      this._domElement,
      `ct-image-dialog--${prevState}`
    );
  }
  unmount() {
    super.unmount();
    this._domCancelUpload = null;
    this._domClear = null;
    this._domCrop = null;
    this._domInput = null;
    this._domInsert = null;
    this._domProgress = null;
    this._domRotateCCW = null;
    this._domRotateCW = null;
    this._domUpload = null;
    return this.dispatchEvent(this.createEvent("imageuploader.unmount"));
  }
  // Private methods
  _addDOMEventListeners() {
    super._addDOMEventListeners();
    this._domInput.addEventListener("change", (ev) => {
      const file = ev.target.files[0];
      if (!file) {
        return;
      }
      ev.target.value = "";
      if (ev.target.value) {
        ev.target.type = "text";
        ev.target.type = "file";
      }
      return this.dispatchEvent(
        this.createEvent("imageuploader.fileready", { file })
      );
    });
    this._domCancelUpload.addEventListener("click", (ev) => {
      return this.dispatchEvent(this.createEvent("imageuploader.cancelupload"));
    });
    this._domClear.addEventListener("click", (ev) => {
      this.removeCropMarks();
      return this.dispatchEvent(this.createEvent("imageuploader.clear"));
    });
    this._domRotateCCW.addEventListener("click", (ev) => {
      this.removeCropMarks();
      return this.dispatchEvent(this.createEvent("imageuploader.rotateccw"));
    });
    this._domRotateCW.addEventListener("click", (ev) => {
      this.removeCropMarks();
      return this.dispatchEvent(this.createEvent("imageuploader.rotatecw"));
    });
    this._domCrop.addEventListener("click", (ev) => {
      if (this._cropMarks) {
        return this.removeCropMarks();
      } else {
        return this.addCropMarks();
      }
    });
    return this._domInsert.addEventListener("click", (ev) => {
      return this.dispatchEvent(this.createEvent("imageuploader.save"));
    });
  }
};
class CropMarksUI extends ContentTools.AnchoredComponentUI {
  // Crop marks widget. Allows a crop region to be defined for images in the
  // image dialog.
  constructor(imageSize) {
    super();
    this._bounds = null;
    this._dragging = null;
    this._draggingOrigin = null;
    this._imageSize = imageSize;
  }
  // Methods
  mount(domParent, before = null) {
    this._domElement = this.constructor.createDiv(["ct-crop-marks"]);
    this._domClipper = this.constructor.createDiv(["ct-crop-marks__clipper"]);
    this._domElement.appendChild(this._domClipper);
    this._domRulers = [
      this.constructor.createDiv([
        "ct-crop-marks__ruler",
        "ct-crop-marks__ruler--top-left"
      ]),
      this.constructor.createDiv([
        "ct-crop-marks__ruler",
        "ct-crop-marks__ruler--bottom-right"
      ])
    ];
    this._domClipper.appendChild(this._domRulers[0]);
    this._domClipper.appendChild(this._domRulers[1]);
    this._domHandles = [
      this.constructor.createDiv([
        "ct-crop-marks__handle",
        "ct-crop-marks__handle--top-left"
      ]),
      this.constructor.createDiv([
        "ct-crop-marks__handle",
        "ct-crop-marks__handle--bottom-right"
      ])
    ];
    this._domElement.appendChild(this._domHandles[0]);
    this._domElement.appendChild(this._domHandles[1]);
    super.mount(domParent, before);
    return this._fit(domParent);
  }
  region() {
    return [
      parseFloat(this._domHandles[0].style.top) / this._bounds[1],
      parseFloat(this._domHandles[0].style.left) / this._bounds[0],
      parseFloat(this._domHandles[1].style.top) / this._bounds[1],
      parseFloat(this._domHandles[1].style.left) / this._bounds[0]
    ];
  }
  unmount() {
    super.unmount();
    this._domClipper = null;
    this._domHandles = null;
    return this._domRulers = null;
  }
  // Private methods
  _addDOMEventListeners() {
    super._addDOMEventListeners();
    this._domHandles[0].addEventListener("mousedown", (ev) => {
      if (ev.button === 0) {
        return this._startDrag(0, ev.clientY, ev.clientX);
      }
    });
    return this._domHandles[1].addEventListener("mousedown", (ev) => {
      if (ev.button === 0) {
        return this._startDrag(1, ev.clientY, ev.clientX);
      }
    });
  }
  _drag(top, left) {
    if (this._dragging === null) {
      return;
    }
    ContentSelect.Range.unselectAll();
    let offsetTop = top - this._draggingOrigin[1];
    let offsetLeft = left - this._draggingOrigin[0];
    let height = this._bounds[1];
    left = 0;
    top = 0;
    let width = this._bounds[0];
    const minCrop = Math.min(Math.min(ContentTools.MIN_CROP, height), width);
    if (this._dragging === 0) {
      height = parseInt(this._domHandles[1].style.top) - minCrop;
      width = parseInt(this._domHandles[1].style.left) - minCrop;
    } else {
      left = parseInt(this._domHandles[0].style.left) + minCrop;
      top = parseInt(this._domHandles[0].style.top) + minCrop;
    }
    offsetTop = Math.min(Math.max(top, offsetTop), height);
    offsetLeft = Math.min(Math.max(left, offsetLeft), width);
    this._domHandles[this._dragging].style.top = `${offsetTop}px`;
    this._domHandles[this._dragging].style.left = `${offsetLeft}px`;
    this._domRulers[this._dragging].style.top = `${offsetTop}px`;
    return this._domRulers[this._dragging].style.left = `${offsetLeft}px`;
  }
  _fit(domParent) {
    const rect = domParent.getBoundingClientRect();
    const widthScale = rect.width / this._imageSize[0];
    const heightScale = rect.height / this._imageSize[1];
    const ratio = Math.min(widthScale, heightScale);
    const width = ratio * this._imageSize[0];
    const height = ratio * this._imageSize[1];
    const left = (rect.width - width) / 2;
    const top = (rect.height - height) / 2;
    this._domElement.style.width = `${width}px`;
    this._domElement.style.height = `${height}px`;
    this._domElement.style.top = `${top}px`;
    this._domElement.style.left = `${left}px`;
    this._domHandles[0].style.top = "0px";
    this._domHandles[0].style.left = "0px";
    this._domHandles[1].style.top = `${height}px`;
    this._domHandles[1].style.left = `${width}px`;
    this._domRulers[0].style.top = "0px";
    this._domRulers[0].style.left = "0px";
    this._domRulers[1].style.top = `${height}px`;
    this._domRulers[1].style.left = `${width}px`;
    return this._bounds = [width, height];
  }
  _startDrag(handleIndex, top, left) {
    const domHandle = this._domHandles[handleIndex];
    this._dragging = handleIndex;
    this._draggingOrigin = [
      left - parseInt(domHandle.style.left),
      top - parseInt(domHandle.style.top)
    ];
    this._onMouseMove = (ev) => {
      return this._drag(ev.clientY, ev.clientX);
    };
    rootContext().on("document", "mousemove", this._onMouseMove);
    this._onMouseUp = (ev) => {
      return this._stopDrag();
    };
    return rootContext().on("document", "mouseup", this._onMouseUp);
  }
  _stopDrag() {
    rootContext().off("document", "mousemove", this._onMouseMove);
    rootContext().off("document", "mouseup", this._onMouseUp);
    this._dragging = null;
    return this._draggingOrigin = null;
  }
}
(function() {
  let NEW_WINDOW_TARGET = void 0;
  const Cls$ui_dialogs_link = ContentTools.LinkDialog = class LinkDialog extends ContentTools.AnchoredDialogUI {
    static initClass() {
      NEW_WINDOW_TARGET = "_blank";
    }
    constructor(href, target) {
      if (href == null) {
        href = "";
      }
      if (target == null) {
        target = "";
      }
      super();
      this._href = href;
      this._target = target;
    }
    mount() {
      super.mount();
      this._domInput = rootContext().createElement("input");
      this._domInput.setAttribute("class", "ct-anchored-dialog__input");
      this._domInput.setAttribute("name", "href");
      this._domInput.setAttribute(
        "placeholder",
        ContentEdit._("Enter a link") + "..."
      );
      this._domInput.setAttribute("type", "text");
      this._domInput.setAttribute("value", this._href);
      this._domElement.appendChild(this._domInput);
      this._domTargetButton = this.constructor.createDiv([
        "ct-anchored-dialog__target-button"
      ]);
      this._domElement.appendChild(this._domTargetButton);
      if (this._target === NEW_WINDOW_TARGET) {
        ContentEdit.addCSSClass(
          this._domTargetButton,
          "ct-anchored-dialog__target-button--active"
        );
      }
      this._domButton = this.constructor.createDiv(["ct-anchored-dialog__button"]);
      this._domElement.appendChild(this._domButton);
      return this._addDOMEventListeners();
    }
    save() {
      if (!this.isMounted()) {
        this.dispatchEvent(this.createEvent("save"));
        return;
      }
      const detail = { href: this._domInput.value.trim() };
      if (this._target) {
        detail.target = this._target;
      }
      return this.dispatchEvent(this.createEvent("save", detail));
    }
    show() {
      super.show();
      this._domInput.focus();
      if (this._href) {
        return this._domInput.select();
      }
    }
    unmount() {
      if (this.isMounted()) {
        this._domInput.blur();
      }
      super.unmount();
      this._domButton = null;
      return this._domInput = null;
    }
    // Private methods
    _addDOMEventListeners() {
      this._domInput.addEventListener("keypress", (ev) => {
        if (ev.keyCode === 13) {
          return this.save();
        }
      });
      this._domTargetButton.addEventListener("click", (ev) => {
        ev.preventDefault();
        if (this._target === NEW_WINDOW_TARGET) {
          this._target = "";
          return ContentEdit.removeCSSClass(
            this._domTargetButton,
            "ct-anchored-dialog__target-button--active"
          );
        } else {
          this._target = NEW_WINDOW_TARGET;
          return ContentEdit.addCSSClass(
            this._domTargetButton,
            "ct-anchored-dialog__target-button--active"
          );
        }
      });
      return this._domButton.addEventListener("click", (ev) => {
        ev.preventDefault();
        return this.save();
      });
    }
  };
  Cls$ui_dialogs_link.initClass();
  return Cls$ui_dialogs_link;
})();
ContentTools.PropertiesDialog = class PropertiesDialog extends ContentTools.DialogUI {
  // A dialog to support editing an elements properties
  constructor(element) {
    super("Properties");
    let needle;
    this.element = element;
    this._attributeUIs = [];
    this._focusedAttributeUI = null;
    this._styleUIs = [];
    this._supportsCoding = this.element.content;
    if (needle = this.element.type(), ["ListItem", "TableCell"].includes(needle)) {
      this._supportsCoding = true;
    }
    this._supportsStyles = true;
  }
  // Methods
  caption(caption) {
    if (caption === void 0) {
      return this._caption;
    }
    this._caption = caption;
    return this._domCaption.textContent = ContentEdit._(caption) + `: ${this.element.tagName()}`;
  }
  changedAttributes() {
    let name, value;
    const attributes = {};
    const changedAttributes = {};
    for (var attributeUI of Array.from(this._attributeUIs)) {
      name = attributeUI.name();
      value = attributeUI.value();
      if (name === "") {
        continue;
      }
      attributes[name.toLowerCase()] = true;
      if (this.element.attr(name) !== value) {
        changedAttributes[name] = value;
      }
    }
    const object = this.element.attributes();
    const restricted = restrictedAttributes(
      this._profile(),
      this.element.tagName(),
      Object.keys(object),
      ContentTools.getRestrictedAtributes(this.element.tagName())
    );
    for (name in object) {
      value = object[name];
      if (restricted && restricted.indexOf(name.toLowerCase()) !== -1) {
        continue;
      }
      if (attributes[name] === void 0) {
        changedAttributes[name] = null;
      }
    }
    return changedAttributes;
  }
  changedStyles() {
    const styles = {};
    for (var styleUI of Array.from(this._styleUIs)) {
      var cssClass = styleUI.style.cssClass();
      if (this.element.hasCSSClass(cssClass) !== styleUI.applied()) {
        styles[cssClass] = styleUI.applied();
      }
    }
    return styles;
  }
  getElementInnerHTML() {
    if (!this._supportsCoding) {
      return null;
    }
    if (this.element.content) {
      return this.element.content.html();
    }
    return this.element.children[0].content.html();
  }
  mount() {
    let name, value;
    super.mount();
    const profile = this._profile();
    this._supportsStyles = profile.styles;
    if (!profile.coding) {
      this._supportsCoding = false;
    }
    ContentEdit.addCSSClass(this._domElement, "ct-properties-dialog");
    ContentEdit.addCSSClass(this._domView, "ct-properties-dialog__view");
    this._domStyles = this.constructor.createDiv(["ct-properties-dialog__styles"]);
    this._domStyles.setAttribute(
      "data-ct-empty",
      ContentEdit._("No styles available for this tag")
    );
    this._domView.appendChild(this._domStyles);
    const paletteStyles = this._supportsStyles ? ContentTools.StylePalette.styles(this.element) : [];
    for (var style of Array.from(paletteStyles)) {
      var styleUI = new StyleUI(
        style,
        this.element.hasCSSClass(style.cssClass())
      );
      this._styleUIs.push(styleUI);
      styleUI.mount(this._domStyles);
    }
    this._domAttributes = this.constructor.createDiv(
      ["ct-properties-dialog__attributes"]
    );
    this._domView.appendChild(this._domAttributes);
    const attributes = this.element.attributes();
    const restricted = restrictedAttributes(
      profile,
      this.element.tagName(),
      Object.keys(attributes),
      ContentTools.getRestrictedAtributes(this.element.tagName())
    );
    const attributeNames = [];
    for (name in attributes) {
      value = attributes[name];
      if (restricted && restricted.indexOf(name.toLowerCase()) !== -1) {
        continue;
      }
      attributeNames.push(name);
    }
    attributeNames.sort();
    for (name of Array.from(attributeNames)) {
      value = attributes[name];
      this._addAttributeUI(name, value);
    }
    this._addAttributeUI("", "");
    this._domCode = this.constructor.createDiv(["ct-properties-dialog__code"]);
    this._domView.appendChild(this._domCode);
    this._domInnerHTML = rootContext().createElement("textarea");
    this._domInnerHTML.setAttribute("class", "ct-properties-dialog__inner-html");
    this._domInnerHTML.setAttribute("name", "code");
    this._domInnerHTML.value = this.getElementInnerHTML();
    this._domCode.appendChild(this._domInnerHTML);
    const domTabs = this.constructor.createDiv(
      ["ct-control-group", "ct-control-group--left"]
    );
    this._domControls.appendChild(domTabs);
    this._domStylesTab = this.constructor.createDiv([
      "ct-control",
      "ct-control--icon",
      "ct-control--styles"
    ]);
    this._domStylesTab.setAttribute("data-ct-tooltip", ContentEdit._("Styles"));
    domTabs.appendChild(this._domStylesTab);
    if (!this._supportsStyles) {
      ContentEdit.addCSSClass(this._domStylesTab, "ct-control--muted");
    }
    this._domAttributesTab = this.constructor.createDiv([
      "ct-control",
      "ct-control--icon",
      "ct-control--attributes"
    ]);
    this._domAttributesTab.setAttribute(
      "data-ct-tooltip",
      ContentEdit._("Attributes")
    );
    domTabs.appendChild(this._domAttributesTab);
    this._domCodeTab = this.constructor.createDiv([
      "ct-control",
      "ct-control--icon",
      "ct-control--code"
    ]);
    this._domCodeTab.setAttribute("data-ct-tooltip", ContentEdit._("Code"));
    domTabs.appendChild(this._domCodeTab);
    if (!this._supportsCoding) {
      ContentEdit.addCSSClass(this._domCodeTab, "ct-control--muted");
    }
    this._domRemoveAttribute = this.constructor.createDiv([
      "ct-control",
      "ct-control--icon",
      "ct-control--remove",
      "ct-control--muted"
    ]);
    this._domRemoveAttribute.setAttribute(
      "data-ct-tooltip",
      ContentEdit._("Remove")
    );
    domTabs.appendChild(this._domRemoveAttribute);
    const domActions = this.constructor.createDiv(
      ["ct-control-group", "ct-control-group--right"]
    );
    this._domControls.appendChild(domActions);
    this._domApply = this.constructor.createDiv([
      "ct-control",
      "ct-control--text",
      "ct-control--apply"
    ]);
    this._domApply.textContent = ContentEdit._("Apply");
    domActions.appendChild(this._domApply);
    const lastTab = rootContext().storage().getItem("ct-properties-dialog-tab");
    if (lastTab === "attributes" || !this._supportsStyles) {
      ContentEdit.addCSSClass(
        this._domElement,
        "ct-properties-dialog--attributes"
      );
      ContentEdit.addCSSClass(this._domAttributesTab, "ct-control--active");
    } else if (lastTab === "code" && this._supportsCoding) {
      ContentEdit.addCSSClass(
        this._domElement,
        "ct-properties-dialog--code"
      );
      ContentEdit.addCSSClass(this._domCodeTab, "ct-control--active");
    } else {
      ContentEdit.addCSSClass(
        this._domElement,
        "ct-properties-dialog--styles"
      );
      ContentEdit.addCSSClass(this._domStylesTab, "ct-control--active");
    }
    return this._addDOMEventListeners();
  }
  save() {
    let innerHTML = null;
    if (this._supportsCoding) {
      innerHTML = this._domInnerHTML.value;
    }
    const detail = {
      changedAttributes: this.changedAttributes(),
      changedStyles: this.changedStyles(),
      innerHTML
    };
    return this.dispatchEvent(this.createEvent("save", detail));
  }
  // Private methods
  _addAttributeUI(name, value) {
    const dialog = this;
    const attributeUI = new AttributeUI(name, value);
    this._attributeUIs.push(attributeUI);
    attributeUI.addEventListener("blur", function(ev) {
      dialog._focusedAttributeUI = null;
      ContentEdit.addCSSClass(
        dialog._domRemoveAttribute,
        "ct-control--muted"
      );
      const index = dialog._attributeUIs.indexOf(this);
      const {
        length
      } = dialog._attributeUIs;
      if (this.name() === "" && index < length - 1) {
        this.unmount();
        dialog._attributeUIs.splice(index, 1);
      }
      const lastAttributeUI = dialog._attributeUIs[length - 1];
      if (lastAttributeUI) {
        if (lastAttributeUI.name() && lastAttributeUI.value()) {
          return dialog._addAttributeUI("", "");
        }
      }
    });
    attributeUI.addEventListener("focus", function(ev) {
      dialog._focusedAttributeUI = this;
      return ContentEdit.removeCSSClass(
        dialog._domRemoveAttribute,
        "ct-control--muted"
      );
    });
    attributeUI.addEventListener("namechange", function(ev) {
      const {
        element
      } = dialog;
      name = this.name().toLowerCase();
      const restricted = ContentTools.getRestrictedAtributes(element.tagName());
      let valid = true;
      if (restricted && restricted.indexOf(name) !== -1) {
        valid = false;
      }
      const permitted = dialog._profile().attributes;
      if (valid && permitted && name !== "") {
        const allowed = permitted[element.tagName().toLowerCase()] || [];
        if (allowed.indexOf(name) === -1) {
          valid = false;
        }
      }
      for (var otherAttributeUI of Array.from(dialog._attributeUIs)) {
        if (name === "") {
          continue;
        }
        if (otherAttributeUI === this) {
          continue;
        }
        if (otherAttributeUI.name().toLowerCase() !== name) {
          continue;
        }
        valid = false;
      }
      this.valid(valid);
      if (valid) {
        return ContentEdit.removeCSSClass(
          dialog._domApply,
          "ct-control--muted"
        );
      } else {
        return ContentEdit.addCSSClass(dialog._domApply, "ct-control--muted");
      }
    });
    attributeUI.mount(this._domAttributes);
    return attributeUI;
  }
  _addDOMEventListeners() {
    super._addDOMEventListeners();
    const selectTab = (selected) => {
      const tabs = ["attributes", "code", "styles"];
      for (var tab of Array.from(tabs)) {
        if (tab === selected) {
          continue;
        }
        var tabCap = tab.charAt(0).toUpperCase() + tab.slice(1);
        ContentEdit.removeCSSClass(
          this._domElement,
          `ct-properties-dialog--${tab}`
        );
        ContentEdit.removeCSSClass(
          this[`_dom${tabCap}Tab`],
          "ct-control--active"
        );
      }
      const selectedCap = selected.charAt(0).toUpperCase() + selected.slice(1);
      ContentEdit.addCSSClass(
        this._domElement,
        `ct-properties-dialog--${selected}`
      );
      ContentEdit.addCSSClass(
        this[`_dom${selectedCap}Tab`],
        "ct-control--active"
      );
      return rootContext().storage().setItem("ct-properties-dialog-tab", selected);
    };
    if (this._supportsStyles) {
      this._domStylesTab.addEventListener("mousedown", () => {
        return selectTab("styles");
      });
    }
    this._domAttributesTab.addEventListener("mousedown", () => {
      return selectTab("attributes");
    });
    if (this._supportsCoding) {
      this._domCodeTab.addEventListener("mousedown", () => {
        return selectTab("code");
      });
    }
    this._domRemoveAttribute.addEventListener("mousedown", (ev) => {
      ev.preventDefault();
      if (this._focusedAttributeUI) {
        const index = this._attributeUIs.indexOf(this._focusedAttributeUI);
        const last = index === this._attributeUIs.length - 1;
        this._focusedAttributeUI.unmount();
        this._attributeUIs.splice(index, 1);
        if (last) {
          return this._addAttributeUI("", "");
        }
      }
    });
    const validateCode = (ev) => {
      try {
        const content = new HTMLString.String(this._domInnerHTML.value);
        ContentEdit.removeCSSClass(
          this._domInnerHTML,
          "ct-properties-dialog__inner-html--invalid"
        );
        return ContentEdit.removeCSSClass(this._domApply, "ct-control--muted");
      } catch (error) {
        ContentEdit.addCSSClass(
          this._domInnerHTML,
          "ct-properties-dialog__inner-html--invalid"
        );
        return ContentEdit.addCSSClass(this._domApply, "ct-control--muted");
      }
    };
    this._domInnerHTML.addEventListener("input", validateCode);
    this._domInnerHTML.addEventListener("propertychange", validateCode);
    return this._domApply.addEventListener("click", (ev) => {
      ev.preventDefault();
      const cssClass = this._domApply.getAttribute("class");
      if (cssClass.indexOf("ct-control--muted") === -1) {
        return this.save();
      }
    });
  }
};
class StyleUI extends ContentTools.AnchoredComponentUI {
  // A switch representing a predefined style that can be applied to an
  // element with this tag name.
  constructor(style, applied) {
    super();
    this.style = style;
    this._applied = applied;
  }
  // Methods
  applied(applied) {
    if (applied === void 0) {
      return this._applied;
    }
    if (this._applied === applied) {
      return;
    }
    this._applied = applied;
    if (this._applied) {
      return ContentEdit.addCSSClass(this._domElement, "ct-section--applied");
    } else {
      return ContentEdit.removeCSSClass(this._domElement, "ct-section--applied");
    }
  }
  mount(domParent, before = null) {
    this._domElement = this.constructor.createDiv(["ct-section"]);
    if (this._applied) {
      ContentEdit.addCSSClass(this._domElement, "ct-section--applied");
    }
    const label = this.constructor.createDiv(["ct-section__label"]);
    label.textContent = this.style.name();
    this._domElement.appendChild(label);
    this._domElement.appendChild(this.constructor.createDiv(["ct-section__switch"]));
    return super.mount(domParent, before);
  }
  _addDOMEventListeners() {
    const toggleSection = (ev) => {
      ev.preventDefault();
      if (this.applied()) {
        return this.applied(false);
      } else {
        return this.applied(true);
      }
    };
    return this._domElement.addEventListener("click", toggleSection);
  }
}
class AttributeUI extends ContentTools.AnchoredComponentUI {
  // An component that allows an attribute to be named and given a value given
  // or to be removed.
  constructor(name, value) {
    super();
    this._initialName = name;
    this._initialValue = value;
  }
  // Read-only properties
  name() {
    return this._domName.value.trim();
  }
  value() {
    return this._domValue.value.trim();
  }
  // Methods
  mount(domParent, before = null) {
    this._domElement = this.constructor.createDiv(["ct-attribute"]);
    this._domName = rootContext().createElement("input");
    this._domName.setAttribute("class", "ct-attribute__name");
    this._domName.setAttribute("name", "name");
    this._domName.setAttribute("placeholder", ContentEdit._("Name"));
    this._domName.setAttribute("type", "text");
    this._domName.setAttribute("value", this._initialName);
    this._domElement.appendChild(this._domName);
    this._domValue = rootContext().createElement("input");
    this._domValue.setAttribute("class", "ct-attribute__value");
    this._domValue.setAttribute("name", "value");
    this._domValue.setAttribute("placeholder", ContentEdit._("Value"));
    this._domValue.setAttribute("type", "text");
    this._domValue.setAttribute("value", this._initialValue);
    this._domElement.appendChild(this._domValue);
    return super.mount(domParent, before);
  }
  valid(valid) {
    if (valid) {
      return ContentEdit.removeCSSClass(
        this._domName,
        "ct-attribute__name--invalid"
      );
    } else {
      return ContentEdit.addCSSClass(this._domName, "ct-attribute__name--invalid");
    }
  }
  // Private methods
  _addDOMEventListeners() {
    this._domName.addEventListener("blur", () => {
      const name = this.name();
      const nextDomAttribute = this._domElement.nextSibling;
      this.dispatchEvent(this.createEvent("blur"));
      if (name === "" && nextDomAttribute) {
        const nextNameDom = nextDomAttribute.querySelector(
          ".ct-attribute__name"
        );
        return nextNameDom.focus();
      }
    });
    this._domName.addEventListener("focus", () => {
      return this.dispatchEvent(this.createEvent("focus"));
    });
    this._domName.addEventListener("input", () => {
      return this.dispatchEvent(this.createEvent("namechange"));
    });
    this._domName.addEventListener("keydown", (ev) => {
      if (ev.keyCode === 13) {
        return this._domValue.focus();
      }
    });
    this._domValue.addEventListener("blur", () => {
      return this.dispatchEvent(this.createEvent("blur"));
    });
    this._domValue.addEventListener("focus", () => {
      return this.dispatchEvent(this.createEvent("focus"));
    });
    return this._domValue.addEventListener("keydown", (ev) => {
      if (ev.keyCode !== 13 && (ev.keyCode !== 9 || ev.shiftKey)) {
        return;
      }
      ev.preventDefault();
      let nextDomAttribute = this._domElement.nextSibling;
      if (!nextDomAttribute) {
        this._domValue.blur();
        nextDomAttribute = this._domElement.nextSibling;
      }
      if (nextDomAttribute) {
        const nextNameDom = nextDomAttribute.querySelector(
          ".ct-attribute__name"
        );
        return nextNameDom.focus();
      }
    });
  }
}
ContentTools.TableDialog = class TableDialog extends ContentTools.DialogUI {
  // A dialog to support inserting/update a table
  constructor(table) {
    super(table ? "Update table" : "Insert table");
    this.table = table;
  }
  // Methods
  mount() {
    super.mount();
    let cfg = { columns: 3, foot: false, head: true };
    if (this.table) {
      cfg = {
        columns: this.table.firstSection().children[0].children.length,
        foot: this.table.tfoot(),
        head: this.table.thead()
      };
    }
    const sections = this._profile().tableSections;
    if (!sections) {
      cfg.head = true;
      cfg.foot = false;
    }
    ContentEdit.addCSSClass(this._domElement, "ct-table-dialog");
    ContentEdit.addCSSClass(this._domView, "ct-table-dialog__view");
    const headCSSClasses = ["ct-section"];
    if (cfg.head) {
      headCSSClasses.push("ct-section--applied");
    }
    this._domHeadSection = this.constructor.createDiv(headCSSClasses);
    if (sections) {
      this._domView.appendChild(this._domHeadSection);
    }
    const domHeadLabel = this.constructor.createDiv(["ct-section__label"]);
    domHeadLabel.textContent = ContentEdit._("Table head");
    this._domHeadSection.appendChild(domHeadLabel);
    this._domHeadSwitch = this.constructor.createDiv(["ct-section__switch"]);
    this._domHeadSection.appendChild(this._domHeadSwitch);
    this._domBodySection = this.constructor.createDiv([
      "ct-section",
      "ct-section--applied",
      "ct-section--contains-input"
    ]);
    this._domView.appendChild(this._domBodySection);
    const domBodyLabel = this.constructor.createDiv(["ct-section__label"]);
    domBodyLabel.textContent = ContentEdit._("Table body (columns)");
    this._domBodySection.appendChild(domBodyLabel);
    this._domBodyInput = rootContext().createElement("input");
    this._domBodyInput.setAttribute("class", "ct-section__input");
    this._domBodyInput.setAttribute("maxlength", "2");
    this._domBodyInput.setAttribute("name", "columns");
    this._domBodyInput.setAttribute("type", "text");
    this._domBodyInput.setAttribute("value", cfg.columns);
    this._domBodySection.appendChild(this._domBodyInput);
    const footCSSClasses = ["ct-section"];
    if (cfg.foot) {
      footCSSClasses.push("ct-section--applied");
    }
    this._domFootSection = this.constructor.createDiv(footCSSClasses);
    if (sections) {
      this._domView.appendChild(this._domFootSection);
    }
    const domFootLabel = this.constructor.createDiv(["ct-section__label"]);
    domFootLabel.textContent = ContentEdit._("Table foot");
    this._domFootSection.appendChild(domFootLabel);
    this._domFootSwitch = this.constructor.createDiv(["ct-section__switch"]);
    this._domFootSection.appendChild(this._domFootSwitch);
    const domControlGroup = this.constructor.createDiv(
      ["ct-control-group", "ct-control-group--right"]
    );
    this._domControls.appendChild(domControlGroup);
    this._domApply = this.constructor.createDiv([
      "ct-control",
      "ct-control--text",
      "ct-control--apply"
    ]);
    this._domApply.textContent = "Apply";
    domControlGroup.appendChild(this._domApply);
    return this._addDOMEventListeners();
  }
  save() {
    const footCSSClass = this._domFootSection.getAttribute("class");
    const headCSSClass = this._domHeadSection.getAttribute("class");
    const detail = {
      columns: parseInt(this._domBodyInput.value),
      foot: footCSSClass.indexOf("ct-section--applied") > -1,
      head: headCSSClass.indexOf("ct-section--applied") > -1
    };
    return this.dispatchEvent(this.createEvent("save", detail));
  }
  unmount() {
    super.unmount();
    this._domBodyInput = null;
    this._domBodySection = null;
    this._domApply = null;
    this._domHeadSection = null;
    this._domHeadSwitch = null;
    this._domFootSection = null;
    return this._domFootSwitch = null;
  }
  // Private methods
  _addDOMEventListeners() {
    super._addDOMEventListeners();
    const toggleSection = function(ev) {
      ev.preventDefault();
      if (this.getAttribute("class").indexOf("ct-section--applied") > -1) {
        return ContentEdit.removeCSSClass(this, "ct-section--applied");
      } else {
        return ContentEdit.addCSSClass(this, "ct-section--applied");
      }
    };
    if (this._profile().tableSections) {
      this._domHeadSection.addEventListener("click", toggleSection);
      this._domFootSection.addEventListener("click", toggleSection);
    }
    this._domBodySection.addEventListener("click", (ev) => {
      return this._domBodyInput.focus();
    });
    this._domBodyInput.addEventListener("input", (ev) => {
      const valid = /^[1-9]\d{0,1}$/.test(ev.target.value);
      if (valid) {
        ContentEdit.removeCSSClass(
          this._domBodyInput,
          "ct-section__input--invalid"
        );
        return ContentEdit.removeCSSClass(
          this._domApply,
          "ct-control--muted"
        );
      } else {
        ContentEdit.addCSSClass(
          this._domBodyInput,
          "ct-section__input--invalid"
        );
        return ContentEdit.addCSSClass(
          this._domApply,
          "ct-control--muted"
        );
      }
    });
    return this._domApply.addEventListener("click", (ev) => {
      ev.preventDefault();
      const cssClass = this._domApply.getAttribute("class");
      if (cssClass.indexOf("ct-control--muted") === -1) {
        return this.save();
      }
    });
  }
};
ContentTools.VideoDialog = class VideoDialog extends ContentTools.DialogUI {
  // A dialog to support inserting a video
  constructor() {
    super("Insert video");
  }
  clearPreview() {
    if (this._domPreview) {
      this._domPreview.parentNode.removeChild(this._domPreview);
      return this._domPreview = void 0;
    }
  }
  mount() {
    super.mount();
    ContentEdit.addCSSClass(this._domElement, "ct-video-dialog");
    ContentEdit.addCSSClass(this._domView, "ct-video-dialog__preview");
    const domControlGroup = this.constructor.createDiv(["ct-control-group"]);
    this._domControls.appendChild(domControlGroup);
    this._domInput = rootContext().createElement("input");
    this._domInput.setAttribute("class", "ct-video-dialog__input");
    this._domInput.setAttribute("name", "url");
    this._domInput.setAttribute(
      "placeholder",
      ContentEdit._("Paste YouTube or Vimeo URL") + "..."
    );
    this._domInput.setAttribute("type", "text");
    domControlGroup.appendChild(this._domInput);
    this._domButton = this.constructor.createDiv([
      "ct-control",
      "ct-control--text",
      "ct-control--insert",
      "ct-control--muted"
    ]);
    this._domButton.textContent = ContentEdit._("Insert");
    domControlGroup.appendChild(this._domButton);
    return this._addDOMEventListeners();
  }
  preview(url) {
    this.clearPreview();
    this._domPreview = rootContext().createElement("iframe");
    this._domPreview.setAttribute("frameborder", "0");
    this._domPreview.setAttribute("height", "100%");
    this._domPreview.setAttribute("src", url);
    this._domPreview.setAttribute("width", "100%");
    return this._domView.appendChild(this._domPreview);
  }
  save() {
    const videoURL = this._domInput.value.trim();
    const embedURL = ContentTools.getEmbedVideoURL(videoURL);
    if (embedURL) {
      return this.dispatchEvent(this.createEvent("save", { "url": embedURL }));
    } else {
      return this.dispatchEvent(this.createEvent("save", { "url": videoURL }));
    }
  }
  show() {
    super.show();
    return this._domInput.focus();
  }
  unmount() {
    if (this.isMounted()) {
      this._domInput.blur();
    }
    super.unmount();
    this._domButton = null;
    this._domInput = null;
    return this._domPreview = null;
  }
  // Private methods
  _addDOMEventListeners() {
    super._addDOMEventListeners();
    this._domInput.addEventListener("input", (ev) => {
      if (ev.target.value) {
        ContentEdit.removeCSSClass(this._domButton, "ct-control--muted");
      } else {
        ContentEdit.addCSSClass(this._domButton, "ct-control--muted");
      }
      if (this._updatePreviewTimeout) {
        clearTimeout(this._updatePreviewTimeout);
      }
      const updatePreview = () => {
        const videoURL = this._domInput.value.trim();
        const embedURL = ContentTools.getEmbedVideoURL(videoURL);
        if (embedURL) {
          return this.preview(embedURL);
        } else {
          return this.clearPreview();
        }
      };
      return this._updatePreviewTimeout = setTimeout(updatePreview, 500);
    });
    this._domInput.addEventListener("keypress", (ev) => {
      if (ev.keyCode === 13) {
        return this.save();
      }
    });
    return this._domButton.addEventListener("click", (ev) => {
      ev.preventDefault();
      const cssClass = this._domButton.getAttribute("class");
      if (cssClass.indexOf("ct-control--muted") === -1) {
        return this.save();
      }
    });
  }
};
const Cls$clean_html = ContentTools.HTMLCleaner = class HTMLCleaner {
  static initClass() {
    this.DEFAULT_ATTRIBUTE_WHITELIST = {
      "a": ["href"],
      "td": ["colspan"]
    };
    this.DEFAULT_TAG_WHITELIST = [
      "a",
      "address",
      "b",
      "blockquote",
      "code",
      "del",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "i",
      "ins",
      "li",
      "ol",
      "p",
      "pre",
      "strong",
      "sup",
      "table",
      "tbody",
      "td",
      "tfoot",
      "th",
      "thead",
      "tr",
      "u",
      "ul",
      "#text"
    ];
    this.NO_CONTENT_TAGS = [
      "head",
      "meta",
      "style",
      "script",
      "title"
    ];
  }
  constructor(tagWhitelist, attributeWhitelist, voidTags) {
    this.tagWhitelist = tagWhitelist || this.constructor.DEFAULT_TAG_WHITELIST;
    this.attributeWhitelist = attributeWhitelist || this.constructor.DEFAULT_ATTRIBUTE_WHITELIST;
    this.voidTags = voidTags || [];
  }
  clean(html) {
    let c;
    html = html.replace(
      /<span( class="Apple-converted-space")?> <\/span>/g,
      " "
    );
    const sandbox = rootContext().createSandboxDocument();
    const wrapper = sandbox.createElement("div");
    wrapper.innerHTML = html;
    const stack = (() => {
      const result = [];
      for (c of Array.from(wrapper.childNodes)) {
        result.push(c);
      }
      return result;
    })();
    while (stack.length > 0) {
      var node = stack.shift();
      var nodeName = node.nodeName.toLowerCase();
      if (this.tagWhitelist.indexOf(nodeName) < 0) {
        if (this.constructor.NO_CONTENT_TAGS.indexOf(nodeName) > -1) {
          node.remove();
          continue;
        }
        for (var childNode of Array.from(node.childNodes)) {
          if (!childNode) {
            continue;
          }
          childNode = childNode.cloneNode(true);
          childNode.nodeName.toLowerCase();
          node.parentNode.insertBefore(childNode, node);
          stack.push(childNode);
        }
        node.remove();
        continue;
      }
      if (nodeName !== "#text" && this.voidTags.indexOf(nodeName) < 0) {
        if (node.textContent.trim() === "") {
          if (node.textContent === "" || node.parentNode === wrapper) {
            node.remove();
          } else {
            node.parentNode.replaceChild(
              sandbox.createTextNode(" "),
              node
            );
          }
          continue;
        }
      }
      if (nodeName === "td" || nodeName === "th" || nodeName === "li") {
        if (node.querySelector("p")) {
          node.innerHTML = node.textContent;
        }
      }
      if (node.attributes) {
        var safeAttributes = this.attributeWhitelist[nodeName] || [];
        var rawAttributes = Array.from(node.attributes);
        for (var attribute of Array.from(rawAttributes)) {
          if (safeAttributes.indexOf(attribute.name.toLowerCase()) < 0) {
            node.removeAttribute(attribute.name);
            continue;
          }
          if (attribute.name.toLowerCase() === "href") {
            var value = node.getAttribute(attribute.name);
            if (value.startsWith("javascript:")) {
              node.removeAttribute(attribute.name);
              continue;
            }
          }
        }
      }
      stack.push.apply(stack, (() => {
        const result1 = [];
        for (c of Array.from(node.childNodes)) {
          result1.push(c);
        }
        return result1;
      })());
    }
    return wrapper.innerHTML;
  }
};
Cls$clean_html.initClass();
class _EditorApp extends ContentTools.ComponentUI {
  // The editor application
  constructor() {
    super();
    this.history = null;
    this._state = "dormant";
    this._busy = false;
    this._namingProp = null;
    this._profile = HTML_PROFILE;
    this._fixtureTest = (domElement) => domElement.hasAttribute("data-fixture");
    this._regionQuery = null;
    this._domRegions = null;
    this._regions = {};
    this._orderedRegions = [];
    this._rootLastModified = null;
    this._regionsLastModified = {};
    this._ignition = null;
    this._inspector = null;
    this._toolbox = null;
    this._emptyRegionsAllowed = false;
  }
  // Read-only properties
  ctrlDown() {
    return this._ctrlDown;
  }
  domRegions() {
    return this._domRegions;
  }
  getState() {
    return this._state;
  }
  ignition() {
    return this._ignition;
  }
  inspector() {
    return this._inspector;
  }
  isDormant() {
    return this._state === "dormant";
  }
  isReady() {
    return this._state === "ready";
  }
  isEditing() {
    return this._state === "editing";
  }
  orderedRegions() {
    return Array.from(this._orderedRegions).map((name) => this._regions[name]);
  }
  regions() {
    return this._regions;
  }
  shiftDown() {
    return this._shiftDown;
  }
  toolbox() {
    return this._toolbox;
  }
  // Methods
  busy(busy) {
    if (busy === void 0) {
      return this._busy;
    }
    this._busy = busy;
    if (this._ignition) {
      return this._ignition.busy(busy);
    }
  }
  profile(profile) {
    if (profile === void 0) {
      return this._profile;
    }
    this._profile = profile;
    if (this._toolbox) {
      this._toolbox.tools(
        filterToolGroups(profile, ContentTools.DEFAULT_TOOLS)
      );
    }
    for (const name in this._regions) {
      this._applyProfileTo(this._regions[name]);
    }
    return profile;
  }
  createPlaceholderElement(region) {
    return new ContentEdit.Text("p", {}, "");
  }
  init(queryOrDOMElements, namingProp, fixtureTest = null, withIgnition) {
    ContentTools.EditorApp._claim(this);
    if (namingProp == null) {
      namingProp = "id";
    }
    if (withIgnition == null) {
      withIgnition = true;
    }
    this._namingProp = namingProp;
    if (fixtureTest) {
      this._fixtureTest = fixtureTest;
    }
    this.mount();
    if (withIgnition) {
      this._ignition = new ContentTools.IgnitionUI();
      this.attach(this._ignition);
      this._ignition.addEventListener("edit", (ev) => {
        ev.preventDefault();
        this.start();
        return this._ignition.state("editing");
      });
      this._ignition.addEventListener("confirm", (ev) => {
        ev.preventDefault();
        if (this._ignition.state() !== "editing") {
          return;
        }
        this._ignition.state("ready");
        return this.stop(true);
      });
      this._ignition.addEventListener("cancel", (ev) => {
        ev.preventDefault();
        if (this._ignition.state() !== "editing") {
          return;
        }
        this.stop(false);
        if (this.isEditing()) {
          return this._ignition.state("editing");
        } else {
          return this._ignition.state("ready");
        }
      });
    }
    this._toolbox = new ContentTools.ToolboxUI(
      filterToolGroups(this._profile, ContentTools.DEFAULT_TOOLS)
    );
    this.attach(this._toolbox);
    this._inspector = new ContentTools.InspectorUI();
    this.attach(this._inspector);
    this._state = "ready";
    this._handleDetach = (element) => {
      return this._preventEmptyRegions();
    };
    this._handleAttach = (parent, element) => {
      return this._applyProfileTo(element);
    };
    this._handleClipboardPaste = (element, ev) => {
      if (ev.clipboardData) {
        if (ev.clipboardData.getData("text/html") && element.type() !== "PreText") {
          this.pasteHTML(element, ev.clipboardData.getData("text/html"));
        } else {
          this.pasteText(element, ev.clipboardData.getData("text/plain"));
        }
        return;
      }
      if (rootContext().clipboardData()) {
        rootContext().clipboardData().getData("TEXT");
        return this.pasteText(element, rootContext().clipboardData().getData("TEXT"));
      }
    };
    this._handleNextRegionTransition = (region) => {
      const regions = this.orderedRegions();
      const index = regions.indexOf(region);
      if (index >= regions.length - 1) {
        return;
      }
      region = regions[index + 1];
      let element = null;
      for (var child of Array.from(region.descendants())) {
        if (child.content !== void 0) {
          element = child;
          break;
        }
      }
      if (element) {
        element.focus();
        element.selection(new ContentSelect.Range(0, 0));
        return;
      }
      return ContentEdit.Root.get().trigger("next-region", region);
    };
    this._handlePreviousRegionTransition = (region) => {
      const regions = this.orderedRegions();
      const index = regions.indexOf(region);
      if (index <= 0) {
        return;
      }
      region = regions[index - 1];
      let element = null;
      const descendants = region.descendants();
      descendants.reverse();
      for (var child of Array.from(descendants)) {
        if (child.content !== void 0) {
          element = child;
          break;
        }
      }
      if (element) {
        const length = element.content.length();
        element.focus();
        element.selection(new ContentSelect.Range(length, length));
        return;
      }
      return ContentEdit.Root.get().trigger("previous-region", region);
    };
    ContentEdit.Root.get().bind("detach", this._handleDetach);
    ContentEdit.Root.get().bind("attach", this._handleAttach);
    ContentEdit.Root.get().bind("paste", this._handleClipboardPaste);
    ContentEdit.Root.get().bind("next-region", this._handleNextRegionTransition);
    ContentEdit.Root.get().bind(
      "previous-region",
      this._handlePreviousRegionTransition
    );
    return this.syncRegions(queryOrDOMElements);
  }
  destroy() {
    if (this.history) {
      this.history.stopWatching();
      this.history = null;
    }
    if (this._highlightTimeout) {
      clearTimeout(this._highlightTimeout);
      this._highlightTimeout = null;
    }
    ContentEdit.Root.get().unbind("detach", this._handleDetach);
    ContentEdit.Root.get().unbind("attach", this._handleAttach);
    ContentEdit.Root.get().unbind("paste", this._handleClipboardPaste);
    ContentEdit.Root.get().unbind(
      "next-region",
      this._handleNextRegionTransition
    );
    ContentEdit.Root.get().unbind(
      "previous-region",
      this._handlePreviousRegionTransition
    );
    this.removeEventListener();
    this.unmount();
    const root = ContentEdit.Root.get();
    root.cancelDragging();
    root.cancelResizing();
    if (root.focused()) {
      root.focused().blur();
    }
    this._children = [];
    return ContentTools.EditorApp._discard(this);
  }
  highlightRegions(highlight) {
    return Array.from(this._domRegions).map((domRegion) => highlight ? ContentEdit.addCSSClass(domRegion, "ct--highlight") : ContentEdit.removeCSSClass(domRegion, "ct--highlight"));
  }
  mount() {
    this._domElement = this.constructor.createDiv(["ct-app"]);
    rootContext().mountPoint().insertBefore(this._domElement, null);
    return this._addDOMEventListeners();
  }
  unmount() {
    if (!this.isMounted()) {
      return;
    }
    for (var child of Array.from(this._children)) {
      child.unmount();
    }
    this._domElement.parentNode.removeChild(this._domElement);
    this._domElement = null;
    this._removeDOMEventListeners();
    this._ignition = null;
    this._inspector = null;
    return this._toolbox = null;
  }
  // Page state methods
  pasteHTML(element, content) {
    const tagNames = ContentEdit.TagNames.get();
    const sandbox = rootContext().createSandboxDocument();
    const wrapper = sandbox.createElement("div");
    wrapper.innerHTML = this._htmlCleaner().clean(content.trim());
    const childNodes = [];
    for (var childNode of Array.from(wrapper.childNodes)) {
      if (!childNode) {
        continue;
      }
      if (childNode.nodeName.toLowerCase() === "#text") {
        if (childNode.textContent.trim() === "") {
          continue;
        }
      }
      childNodes.push(childNode);
    }
    if (!childNodes.length) {
      return;
    }
    const inlineTags = ContentTools.INLINE_TAGS.slice();
    inlineTags.push("#text");
    const firstNode = childNodes[0].nodeName.toLowerCase();
    const lastNode = childNodes[childNodes.length - 1].nodeName.toLowerCase();
    if (element.isFixed() || inlineTags.indexOf(firstNode) > -1 && inlineTags.indexOf(lastNode) > -1) {
      if (inlineTags.indexOf(firstNode) > -1 && inlineTags.indexOf(lastNode) > -1) {
        content = new HTMLString.String(wrapper.innerHTML);
      } else {
        content = new HTMLString.String(
          HTMLString.String.encode(wrapper.textContent)
        );
      }
      if (element.content) {
        const selection = element.selection();
        const cursor = selection.get()[0] + content.length();
        const tip = element.content.substring(0, selection.get()[0]);
        const tail = element.content.substring(selection.get()[1]);
        const replaced = element.content.substring(
          selection.get()[0],
          selection.get()[1]
        );
        if (replaced.length()) {
          const character = replaced.characters[0];
          const tags = character.tags();
          if (character.isTag()) {
            tags.shift();
          }
          if (tags.length >= 1) {
            content = content.format(0, content.length(), ...Array.from(tags));
          }
        }
        element.content = tip.concat(content);
        element.content = element.content.concat(tail, false);
        element.updateInnerHTML();
        element.taint();
        selection.set(cursor, cursor);
        element.selection(selection);
        return;
      } else {
        wrapper.innerHTML = "<p>" + content.html() + "</p>";
      }
    }
    const originalElement = element;
    if (element.parent().type() !== "Region") {
      element = element.closest((node2) => node2.parent().type() === "Region");
    }
    const region = element.parent();
    if (inlineTags.indexOf(firstNode) > -1 && inlineTags.indexOf(lastNode) > -1) {
      const innerP = wrapper.createElement("p");
      while (wrapper.childNodes.length > 0) {
        innerP.appendChild(wrapper.childNodes[0]);
      }
      wrapper.appendChild(innerP);
    }
    let i = 0;
    let newElement = originalElement;
    for (var node of Array.from(wrapper.childNodes)) {
      if (!node) {
        continue;
      }
      if (node.nodeName === "#text" && node.textContent.trim() === "") {
        continue;
      }
      var elementCls = tagNames.match(node.nodeName);
      if (elementCls === ContentEdit.Static) {
        var p = rootContext().createElement("p");
        p.appendChild(node);
        node = p;
        elementCls = ContentEdit.Text;
      }
      newElement = elementCls.fromDOMElement(node);
      region.attach(
        newElement,
        region.children.indexOf(element) + (1 + i)
      );
      i += 1;
    }
    if (newElement.focus) {
      return newElement.focus();
    } else if (newElement.nextSibling()) {
      newElement = newElement.nextSibling().previousWithTest(function(node2) {
        if (node2.focus) {
          return node2;
        }
      });
      if (newElement) {
        return newElement.focus();
      }
    } else {
      newElement = newElement.nextWithTest(function(node2) {
        if (node2.focus) {
          return node2;
        }
      });
      if (newElement) {
        return newElement.focus();
      } else {
        return originalElement.focus();
      }
    }
  }
  pasteText(element, content) {
    let lines;
    if (element.type() !== "PreText") {
      lines = content.split("\n");
    } else {
      lines = [content];
    }
    lines = lines.filter((line2) => line2.trim() !== "");
    if (!lines.length) {
      return;
    }
    const encodeHTML = HTMLString.String.encode;
    let spawn = true;
    const type = element.type();
    if (lines.length === 1) {
      spawn = false;
    }
    if (type === "PreText") {
      spawn = false;
    }
    if (!element.can("spawn")) {
      spawn = false;
    }
    if (spawn) {
      let insertAt, insertIn, insertNode, lastItem;
      if (type === "ListItemText") {
        insertNode = element.parent();
        insertIn = element.parent().parent();
        insertAt = insertIn.children.indexOf(insertNode) + 1;
      } else {
        insertNode = element;
        if (insertNode.parent().type() !== "Region") {
          insertNode = element.closest((node) => node.parent().type() === "Region");
        }
        insertIn = insertNode.parent();
        insertAt = insertIn.children.indexOf(insertNode) + 1;
      }
      for (let i = 0; i < lines.length; i++) {
        var item;
        var line = lines[i];
        line = encodeHTML(line);
        if (type === "ListItemText") {
          item = new ContentEdit.ListItem();
          var itemText = new ContentEdit.ListItemText(line);
          item.attach(itemText);
          lastItem = itemText;
        } else {
          item = new ContentEdit.Text("p", {}, line);
          lastItem = item;
        }
        insertIn.attach(item, insertAt + i);
      }
      const lineLength = lastItem.content.length();
      lastItem.focus();
      return lastItem.selection(new ContentSelect.Range(lineLength, lineLength));
    } else {
      content = encodeHTML(content);
      content = new HTMLString.String(content, type === "PreText");
      const selection = element.selection();
      const cursor = selection.get()[0] + content.length();
      const tip = element.content.substring(0, selection.get()[0]);
      const tail = element.content.substring(selection.get()[1]);
      const replaced = element.content.substring(
        selection.get()[0],
        selection.get()[1]
      );
      if (replaced.length()) {
        const character = replaced.characters[0];
        const tags = character.tags();
        if (character.isTag()) {
          tags.shift();
        }
        if (tags.length >= 1) {
          content = content.format(0, content.length(), ...Array.from(tags));
        }
      }
      element.content = tip.concat(content);
      element.content = element.content.concat(tail, false);
      element.updateInnerHTML();
      element.taint();
      selection.set(cursor, cursor);
      return element.selection(selection);
    }
  }
  revert() {
    if (!this.dispatchEvent(this.createEvent("revert"))) {
      return;
    }
    if (ContentTools.CANCEL_MESSAGE) {
      const confirmMessage = ContentEdit._(ContentTools.CANCEL_MESSAGE);
      if (ContentEdit.Root.get().lastModified() > this._rootLastModified && !rootContext().confirm(confirmMessage)) {
        return false;
      }
    }
    this.revertToSnapshot(this.history.goTo(0), false);
    return true;
  }
  revertToSnapshot(snapshot, restoreEditable) {
    let name, region;
    if (restoreEditable == null) {
      restoreEditable = true;
    }
    const domRegions = [];
    for (name in this._regions) {
      region = this._regions[name];
      for (var child of Array.from(region.children)) {
        child.unmount();
      }
      if (snapshot.regions[name] !== void 0) {
        if (region.children.length === 1 && region.children[0].isFixed()) {
          var wrapper = this.constructor.createDiv();
          wrapper.innerHTML = snapshot.regions[name];
          domRegions.push(wrapper.firstElementChild);
          region.domElement().parentNode.replaceChild(
            wrapper.firstElementChild,
            region.domElement()
          );
        } else {
          domRegions.push(region.domElement());
          region.domElement().innerHTML = snapshot.regions[name];
        }
      } else {
        region.domElement().remove();
        delete this._regions[name];
      }
    }
    this._domRegions = domRegions;
    if (restoreEditable) {
      if (ContentEdit.Root.get().focused()) {
        ContentEdit.Root.get().focused().blur();
      }
      this._regions = {};
      this.syncRegions(null, true);
      ContentEdit.Root.get()._modified = snapshot.rootModified;
      for (name in this._regions) {
        region = this._regions[name];
        if (snapshot.regionModifieds[name]) {
          region._modified = snapshot.regionModifieds[name];
        }
      }
      this.history.replaceRegions(this._regions);
      this.history.restoreSelection(snapshot);
      return this._inspector.updateTags();
    }
  }
  save(passive) {
    if (!this.dispatchEvent(this.createEvent("save", { passive }))) {
      return;
    }
    const root = ContentEdit.Root.get();
    if (root.focused() && !passive) {
      root.focused().blur();
    }
    if (root.lastModified() === this._rootLastModified && passive) {
      this.dispatchEvent(
        this.createEvent("saved", { regions: {}, passive })
      );
      return;
    }
    const domRegions = [];
    const modifiedRegions = {};
    for (var name in this._regions) {
      var child;
      var region = this._regions[name];
      var html = region.html();
      if (region.children.length === 1 && !region.type() === "Fixture") {
        child = region.children[0];
        if (child.content && !child.content.html()) {
          html = "";
        }
      }
      if (!passive) {
        for (child of Array.from(region.children)) {
          child.unmount();
        }
        if (region.children.length === 1 && region.children[0].isFixed()) {
          var wrapper = this.constructor.createDiv();
          wrapper.innerHTML = html;
          domRegions.push(wrapper.firstElementChild);
          region.domElement().parentNode.replaceChild(
            wrapper.firstElementChild,
            region.domElement()
          );
        } else {
          domRegions.push(region.domElement());
          region.domElement().innerHTML = html;
        }
      }
      if (region.lastModified() === this._regionsLastModified[name]) {
        continue;
      }
      modifiedRegions[name] = html;
      this._regionsLastModified[name] = region.lastModified();
    }
    this._domRegions = domRegions;
    return this.dispatchEvent(
      this.createEvent("saved", { regions: modifiedRegions, passive })
    );
  }
  setRegionOrder(regionNames) {
    return this._orderedRegions = regionNames.slice();
  }
  start() {
    if (!this.dispatchEvent(this.createEvent("start"))) {
      return;
    }
    this.busy(true);
    this.syncRegions();
    this._initRegions();
    this._preventEmptyRegions();
    this._rootLastModified = ContentEdit.Root.get().lastModified();
    this.history = new ContentTools.History(this._regions);
    this.history.watch();
    this._state = "editing";
    this._toolbox.show();
    this._inspector.show();
    this.busy(false);
    return this.dispatchEvent(this.createEvent("started"));
  }
  stop(save) {
    if (!this.dispatchEvent(this.createEvent("stop", { save }))) {
      return;
    }
    const focused = ContentEdit.Root.get().focused();
    if (focused && focused.isMounted() && focused._syncContent !== void 0) {
      focused._syncContent();
    }
    if (save) {
      this.save();
    } else {
      if (!this.revert()) {
        return;
      }
    }
    this.history.stopWatching();
    this.history = null;
    this._toolbox.hide();
    this._inspector.hide();
    this._regions = {};
    this._state = "ready";
    if (ContentEdit.Root.get().focused()) {
      this._allowEmptyRegions(() => {
        return ContentEdit.Root.get().focused().blur();
      });
    }
    return this.dispatchEvent(this.createEvent("stopped"));
  }
  syncRegions(regionQuery, restoring) {
    if (regionQuery) {
      this._regionQuery = regionQuery;
    }
    this._domRegions = [];
    if (this._regionQuery) {
      if (typeof this._regionQuery === "string" || this._regionQuery instanceof String) {
        this._domRegions = rootContext().contentScope().querySelectorAll(this._regionQuery);
      } else {
        this._domRegions = this._regionQuery;
      }
    }
    if (this._state === "editing") {
      this._initRegions(restoring);
      this._preventEmptyRegions();
    }
    if (this._ignition) {
      if (this._domRegions.length) {
        return this._ignition.show();
      } else {
        return this._ignition.hide();
      }
    }
  }
  // Private methods
  _applyProfileTo(element) {
    if (!element) {
      return;
    }
    if (!this._profile.resize && element.type() === "Image") {
      element.can("resize", false);
    }
    if (!this._profile.moveStatics && element.type() === "Static") {
      element.can("drag", false);
    }
    if (element.children) {
      for (const child of Array.from(element.children)) {
        this._applyProfileTo(child);
      }
    }
  }
  _htmlCleaner() {
    const profile = this._profile;
    if (!profile.tags && !profile.attributes) {
      return ContentTools.getHTMLCleaner();
    }
    return new ContentTools.HTMLCleaner(
      profile.tags,
      profile.attributes,
      profile.voidTags
    );
  }
  _addDOMEventListeners() {
    this._removeDOMEventListeners();
    this._handleHighlightOn = (ev) => {
      if ([17, 224, 91, 93].includes(ev.keyCode)) {
        this._ctrlDown = true;
      }
      if (ev.keyCode === 16 && !this._ctrlDown) {
        if (this._highlightTimeout) {
          return;
        }
        this._shiftDown = true;
        this._highlightTimeout = setTimeout(
          () => this.highlightRegions(true),
          ContentTools.HIGHLIGHT_HOLD_DURATION
        );
        return;
      }
      clearTimeout(this._highlightTimeout);
      return this.highlightRegions(false);
    };
    this._handleHighlightOff = (ev) => {
      if ([17, 224, 91, 93].includes(ev.keyCode)) {
        this._ctrlDown = false;
        return;
      }
      if (ev.keyCode === 16) {
        this._shiftDown = false;
        if (this._highlightTimeout) {
          clearTimeout(this._highlightTimeout);
          this._highlightTimeout = null;
        }
        return this.highlightRegions(false);
      }
    };
    this._handleVisibility = (ev) => {
      if (!rootContext().hasFocus()) {
        clearTimeout(this._highlightTimeout);
        return this.highlightRegions(false);
      }
    };
    rootContext().on("document", "keydown", this._handleHighlightOn);
    rootContext().on("document", "keyup", this._handleHighlightOff);
    rootContext().on("document", "visibilitychange", this._handleVisibility);
    this._handleBeforeUnload = (ev) => {
      if (this._state === "editing" && ContentTools.CANCEL_MESSAGE) {
        if (this.history && this.history._snapshotIndex) {
          const cancelMessage = ContentEdit._(ContentTools.CANCEL_MESSAGE);
          (ev || rootContext().currentEvent()).returnValue = cancelMessage;
          return cancelMessage;
        }
      }
    };
    rootContext().on("window", "beforeunload", this._handleBeforeUnload);
    this._handleUnload = (ev) => {
      return this.destroy();
    };
    return rootContext().on("window", "unload", this._handleUnload);
  }
  _allowEmptyRegions(callback) {
    this._emptyRegionsAllowed = true;
    callback();
    return this._emptyRegionsAllowed = false;
  }
  _preventEmptyRegions() {
    if (this._emptyRegionsAllowed) {
      return;
    }
    return (() => {
      const result = [];
      for (var name in this._regions) {
        var region = this._regions[name];
        var lastModified = region.lastModified();
        var hasEditableChildren = false;
        for (var child of Array.from(region.children)) {
          if (child.type() !== "Static") {
            hasEditableChildren = true;
            break;
          }
        }
        if (hasEditableChildren) {
          continue;
        }
        var placeholder = this.createPlaceholderElement(region);
        region.attach(placeholder);
        result.push(region._modified = lastModified);
      }
      return result;
    })();
  }
  _removeDOMEventListeners() {
    rootContext().off("document", "keydown", this._handleHighlightOn);
    rootContext().off("document", "keyup", this._handleHighlightOff);
    rootContext().off("document", "visibilitychange", this._handleVisibility);
    rootContext().off("window", "beforeunload", this._handleBeforeUnload);
    return rootContext().off("window", "unload", this._handleUnload);
  }
  _initRegions(restoring) {
    let name;
    if (restoring == null) {
      restoring = false;
    }
    const found = {};
    const domRegions = [];
    this._orderedRegions = [];
    for (let i = 0; i < this._domRegions.length; i++) {
      var domRegion = this._domRegions[i];
      name = domRegion.getAttribute(this._namingProp);
      if (!name) {
        name = i;
      }
      found[name] = true;
      this._orderedRegions.push(name);
      if (this._regions[name] && this._regions[name].domElement() === domRegion) {
        continue;
      }
      if (this._fixtureTest(domRegion)) {
        this._regions[name] = new ContentEdit.Fixture(domRegion);
      } else {
        this._regions[name] = new ContentEdit.Region(domRegion);
      }
      domRegions.push(this._regions[name].domElement());
      if (!restoring) {
        this._regionsLastModified[name] = this._regions[name].lastModified();
      }
    }
    this._domRegions = domRegions;
    return (() => {
      const result = [];
      for (name in this._regions) {
        this._regions[name];
        if (found[name]) {
          continue;
        }
        delete this._regions[name];
        delete this._regionsLastModified[name];
        var index = this._orderedRegions.indexOf(name);
        if (index > -1) {
          result.push(this._orderedRegions.splice(index, 1));
        } else {
          result.push(void 0);
        }
      }
      return result;
    })();
  }
}
(function() {
  let instance = void 0;
  const Cls$editor = ContentTools.EditorApp = class EditorApp {
    static initClass() {
      instance = null;
    }
    static get() {
      const cls = ContentTools.EditorApp.getCls();
      return instance != null ? instance : instance = new cls();
    }
    static current() {
      return instance;
    }
    static getCls() {
      return _EditorApp;
    }
    static _claim(app) {
      instance = app;
    }
    static _discard(app) {
      if (instance === app) {
        instance = null;
      }
    }
  };
  Cls$editor.initClass();
  return Cls$editor;
})();
ContentTools.History = class History {
  // The `History` class provides a mechanism for storing, navigating and
  // reverting the changes made to an editable document.
  constructor(regions) {
    this._lastSnapshotTaken = null;
    this._regions = {};
    this.replaceRegions(regions);
    this._snapshotIndex = -1;
    this._snapshots = [];
    this._store();
  }
  // Read-only properties
  canRedo() {
    return this._snapshotIndex < this._snapshots.length - 1;
  }
  canUndo() {
    return this._snapshotIndex > 0;
  }
  index() {
    return this._snapshotIndex;
  }
  length() {
    return this._snapshots.length;
  }
  snapshot() {
    return this._snapshots[this._snapshotIndex];
  }
  // Methods
  goTo(index) {
    this._snapshotIndex = Math.min(this._snapshots.length - 1, Math.max(0, index));
    return this.snapshot();
  }
  redo() {
    return this.goTo(this._snapshotIndex + 1);
  }
  replaceRegions(regions) {
    this._regions = {};
    return (() => {
      const result = [];
      for (var k in regions) {
        var v = regions[k];
        result.push(this._regions[k] = v);
      }
      return result;
    })();
  }
  restoreSelection(snapshot) {
    if (!snapshot.selected) {
      return;
    }
    const region = this._regions[snapshot.selected.region];
    const element = region.descendants()[snapshot.selected.element];
    element.focus();
    if (element.selection && snapshot.selected.selection) {
      return element.selection(snapshot.selected.selection);
    }
  }
  stopWatching() {
    if (this._watchInterval) {
      clearInterval(this._watchInterval);
    }
    if (this._delayedStoreTimeout) {
      return clearTimeout(this._delayedStoreTimeout);
    }
  }
  undo() {
    return this.goTo(this._snapshotIndex - 1);
  }
  watch() {
    this._lastSnapshotTaken = Date.now();
    const watch = () => {
      const lastModified = ContentEdit.Root.get().lastModified();
      if (lastModified === null) {
        return;
      }
      if (lastModified > this._lastSnapshotTaken) {
        if (this._delayedStoreRequested === lastModified) {
          return;
        }
        if (this._delayedStoreTimeout) {
          clearTimeout(this._delayedStoreTimeout);
        }
        const delayedStore = () => {
          this._lastSnapshotTaken = lastModified;
          return this._store();
        };
        this._delayedStoreRequested = lastModified;
        return this._delayedStoreTimeout = setTimeout(delayedStore, 500);
      }
    };
    return this._watchInterval = setInterval(watch, 50);
  }
  // Private methods
  _store() {
    let name, region;
    const snapshot = {
      regions: {},
      regionModifieds: {},
      rootModified: ContentEdit.Root.get().lastModified(),
      selected: null
    };
    for (name in this._regions) {
      region = this._regions[name];
      snapshot.regions[name] = region.html();
      snapshot.regionModifieds[name] = region.lastModified();
    }
    const element = ContentEdit.Root.get().focused();
    if (element) {
      snapshot.selected = {};
      region = element.closest((node) => node.type() === "Region" || node.type() === "Fixture");
      if (!region) {
        return;
      }
      for (name in this._regions) {
        var other_region = this._regions[name];
        if (region === other_region) {
          snapshot.selected.region = name;
          break;
        }
      }
      snapshot.selected.element = region.descendants().indexOf(element);
      if (element.selection) {
        snapshot.selected.selection = element.selection();
      }
    }
    if (this._snapshotIndex < this._snapshots.length - 1) {
      this._snapshots = this._snapshots.slice(0, this._snapshotIndex + 1);
    }
    this._snapshotIndex++;
    return this._snapshots.splice(this._snapshotIndex, 0, snapshot);
  }
};
const Cls$styles = ContentTools.StylePalette = class StylePalette {
  static initClass() {
    this._styles = [];
  }
  // Class methods
  static add(styles) {
    return this._styles = this._styles.concat(styles);
  }
  static styles(element) {
    if (element === void 0) {
      return this._styles.slice();
    }
    const tagName = element.tagName();
    return this._styles.filter(function(style) {
      if (!style._applicableTo) {
        return true;
      }
      return style._applicableTo.indexOf(tagName) !== -1;
    });
  }
};
Cls$styles.initClass();
ContentTools.Style = class Style {
  // The `Style` class is used to define styles (CSS classes) for use in the
  // editor.
  constructor(name, cssClass, applicableTo) {
    this._name = name;
    this._cssClass = cssClass;
    if (applicableTo) {
      this._applicableTo = applicableTo;
    } else {
      this._applicableTo = null;
    }
  }
  // Read-only properties
  applicableTo() {
    return this._applicableTo;
  }
  cssClass() {
    return this._cssClass;
  }
  name() {
    return this._name;
  }
};
let Cls$tools$m = ContentTools.ToolShelf = class ToolShelf {
  static initClass() {
    this._tools = {};
  }
  static stow(cls, name) {
    return this._tools[name] = cls;
  }
  static fetch(name) {
    if (!this._tools[name]) {
      throw new Error(`\`${name}\` has not been stowed on the tool shelf`);
    }
    return this._tools[name];
  }
};
Cls$tools$m.initClass();
const Cls$tools$l = ContentTools.Tool = class Tool {
  static initClass() {
    this.label = "Tool";
    this.icon = "tool";
    this.requiresElement = true;
  }
  // Class methods
  static canApply(element, selection) {
    return false;
  }
  static isApplied(element, selection) {
    return false;
  }
  static apply(element, selection, callback) {
    throw new Error("Not implemented");
  }
  static editor() {
    return ContentTools.EditorApp.get();
  }
  static dispatchEditorEvent(name, detail) {
    return this.editor().dispatchEvent(this.editor().createEvent(name, detail));
  }
  // Private class methods
  static _insertAt(element) {
    let insertNode = element;
    if (insertNode.parent().type() !== "Region") {
      insertNode = element.closest((node) => node.parent().type() === "Region");
    }
    const insertIndex = insertNode.parent().children.indexOf(insertNode) + 1;
    return [insertNode, insertIndex];
  }
};
Cls$tools$l.initClass();
const Cls$tools$k = ContentTools.Tools.Bold = class Bold extends ContentTools.Tool {
  static initClass() {
    ContentTools.ToolShelf.stow(this, "bold");
    this.label = "Bold";
    this.icon = "bold";
    this.tagName = "b";
  }
  static canApply(element, selection) {
    if (!element.content) {
      return false;
    }
    return selection && !selection.isCollapsed();
  }
  static isApplied(element, selection) {
    if (element.content === void 0 || !element.content.length()) {
      return false;
    }
    let [from, to] = Array.from(selection.get());
    if (from === to) {
      to += 1;
    }
    return element.content.slice(from, to).hasTags(this.tagName, true);
  }
  static apply(element, selection, callback) {
    const toolDetail = {
      "tool": this,
      "element": element,
      "selection": selection
    };
    if (!this.dispatchEditorEvent("tool-apply", toolDetail)) {
      return;
    }
    element.storeState();
    const [from, to] = Array.from(selection.get());
    if (this.isApplied(element, selection)) {
      element.content = element.content.unformat(
        from,
        to,
        new HTMLString.Tag(this.tagName)
      );
    } else {
      element.content = element.content.format(
        from,
        to,
        new HTMLString.Tag(this.tagName)
      );
    }
    element.content.optimize();
    element.updateInnerHTML();
    element.taint();
    element.restoreState();
    callback(true);
    return this.dispatchEditorEvent("tool-applied", toolDetail);
  }
};
Cls$tools$k.initClass();
const Cls$tools$j = ContentTools.Tools.Italic = class Italic extends ContentTools.Tools.Bold {
  static initClass() {
    ContentTools.ToolShelf.stow(this, "italic");
    this.label = "Italic";
    this.icon = "italic";
    this.tagName = "i";
  }
};
Cls$tools$j.initClass();
const Cls$tools$i = ContentTools.Tools.Link = class Link extends ContentTools.Tools.Bold {
  static initClass() {
    ContentTools.ToolShelf.stow(this, "link");
    this.label = "Link";
    this.icon = "link";
    this.tagName = "a";
  }
  static getAttr(attrName, element, selection) {
    if (element.type() === "Image") {
      if (element.a) {
        return element.a[attrName];
      }
    } else if (element.isFixed() && element.tagName() === "a") {
      return element.attr(attrName);
    } else {
      const [from, to] = Array.from(selection.get());
      const selectedContent = element.content.slice(from, to);
      for (var c of Array.from(selectedContent.characters)) {
        if (!c.hasTags("a")) {
          continue;
        }
        for (var tag of Array.from(c.tags())) {
          if (tag.name() === "a") {
            return tag.attr(attrName);
          }
        }
      }
    }
    return "";
  }
  static canApply(element, selection) {
    if (element.type() === "Image") {
      return true;
    } else if (element.isFixed() && element.tagName() === "a") {
      return true;
    } else {
      if (!element.content) {
        return false;
      }
      if (!selection) {
        return false;
      }
      if (selection.isCollapsed()) {
        const character = element.content.characters[selection.get()[0]];
        if (!character || !character.hasTags("a")) {
          return false;
        }
      }
      return true;
    }
  }
  static isApplied(element, selection) {
    if (element.type() === "Image") {
      return element.a;
    } else if (element.isFixed() && element.tagName() === "a") {
      return true;
    } else {
      return super.isApplied(element, selection);
    }
  }
  static apply(element, selection, callback) {
    let characters, from, rect, selectTag, to;
    const toolDetail = {
      "tool": this,
      "element": element,
      "selection": selection
    };
    if (!this.dispatchEditorEvent("tool-apply", toolDetail)) {
      return;
    }
    let applied = false;
    if (element.type() === "Image") {
      rect = element.domElement().getBoundingClientRect();
    } else if (element.isFixed() && element.tagName() === "a") {
      rect = element.domElement().getBoundingClientRect();
    } else {
      if (selection.isCollapsed()) {
        ({
          characters
        } = element.content);
        let starts = selection.get(0)[0];
        let ends = starts;
        while (starts > 0 && characters[starts - 1].hasTags("a")) {
          starts -= 1;
        }
        while (ends < characters.length && characters[ends].hasTags("a")) {
          ends += 1;
        }
        selection = new ContentSelect.Range(starts, ends);
        selection.select(element.domElement());
      }
      element.storeState();
      selectTag = new HTMLString.Tag("span", { "class": "ct--pseudo-select" });
      [from, to] = Array.from(selection.get());
      element.content = element.content.format(from, to, selectTag);
      element.updateInnerHTML();
      const domElement = element.domElement();
      const measureSpan = domElement.getElementsByClassName("ct--pseudo-select");
      rect = measureSpan[0].getBoundingClientRect();
    }
    const app = ContentTools.EditorApp.get();
    const modal = new ContentTools.ModalUI(true, true);
    modal.addEventListener("click", function() {
      this.unmount();
      dialog.hide();
      if (element.content) {
        element.content = element.content.unformat(from, to, selectTag);
        element.updateInnerHTML();
        element.restoreState();
      }
      callback(applied);
      if (applied) {
        return ContentTools.Tools.Link.dispatchEditorEvent(
          "tool-applied",
          toolDetail
        );
      }
    });
    var dialog = new ContentTools.LinkDialog(
      this.getAttr("href", element, selection),
      this.getAttr("target", element, selection)
    );
    const [scrollX, scrollY] = Array.from(ContentTools.getScrollPosition());
    dialog.position([
      rect.left + rect.width / 2 + scrollX,
      rect.top + rect.height / 2 + scrollY
    ]);
    dialog.addEventListener("save", function(ev) {
      const detail = ev.detail();
      applied = true;
      if (element.type() === "Image") {
        let className;
        const alignmentClassNames = [
          "align-center",
          "align-left",
          "align-right"
        ];
        if (detail.href) {
          element.a = { href: detail.href };
          if (detail.target) {
            element.a.target = detail.target;
          }
          for (className of Array.from(alignmentClassNames)) {
            if (element.hasCSSClass(className)) {
              element.removeCSSClass(className);
              element.a["class"] = className;
              break;
            }
          }
        } else {
          let linkClasses = [];
          if (element.a["class"]) {
            linkClasses = element.a["class"].split(" ");
          }
          for (className of Array.from(alignmentClassNames)) {
            if (linkClasses.indexOf(className) > -1) {
              element.addCSSClass(className);
              break;
            }
          }
          element.a = null;
        }
        element.unmount();
        element.mount();
      } else if (element.isFixed() && element.tagName() === "a") {
        element.attr("href", detail.href);
      } else {
        let firstATag = null;
        for (let i = from, end = to, asc = from <= end; asc ? i < end : i > end; asc ? i++ : i--) {
          for (var tag of Array.from(element.content.characters[i].tags())) {
            if (tag.name() === "a") {
              firstATag = tag;
              break;
            }
          }
          if (firstATag) {
            break;
          }
        }
        element.content = element.content.unformat(from, to, "a");
        if (detail.href) {
          let a;
          if (firstATag) {
            a = firstATag.copy();
          } else {
            a = new HTMLString.Tag("a");
          }
          a.attr("href", detail.href);
          if (detail.target) {
            a.attr("target", detail.target);
          } else {
            a.removeAttr("target");
          }
          console.log(a);
          element.content = element.content.format(from, to, a);
          element.content.optimize();
        }
        element.updateInnerHTML();
      }
      element.taint();
      return modal.dispatchEvent(modal.createEvent("click"));
    });
    app.attach(modal);
    app.attach(dialog);
    modal.show();
    return dialog.show();
  }
};
Cls$tools$i.initClass();
const Cls$tools$h = ContentTools.Tools.Heading = class Heading extends ContentTools.Tool {
  static initClass() {
    ContentTools.ToolShelf.stow(this, "heading");
    this.label = "Heading";
    this.icon = "heading";
    this.tagName = "h1";
  }
  static canApply(element, selection) {
    if (element.isFixed()) {
      return false;
    }
    return element.content !== void 0 && ["Text", "PreText"].indexOf(element.type()) !== -1;
  }
  static isApplied(element, selection) {
    if (!element.content) {
      return false;
    }
    if (["Text", "PreText"].indexOf(element.type()) === -1) {
      return false;
    }
    return element.tagName() === this.tagName;
  }
  static apply(element, selection, callback) {
    const toolDetail = {
      "tool": this,
      "element": element,
      "selection": selection
    };
    if (!this.dispatchEditorEvent("tool-apply", toolDetail)) {
      return;
    }
    element.storeState();
    if (element.type() === "PreText") {
      const content = element.content.html().replace(/&nbsp;/g, " ");
      const textElement = new ContentEdit.Text(this.tagName, {}, content);
      const parent = element.parent();
      const insertAt = parent.children.indexOf(element);
      parent.detach(element);
      parent.attach(textElement, insertAt);
      element.blur();
      textElement.focus();
      textElement.selection(selection);
    } else {
      element.removeAttr("class");
      if (element.tagName() === this.tagName) {
        element.tagName("p");
      } else {
        element.tagName(this.tagName);
      }
      element.restoreState();
    }
    this.dispatchEditorEvent("tool-applied", toolDetail);
    return callback(true);
  }
};
Cls$tools$h.initClass();
const Cls$tools$g = ContentTools.Tools.Subheading = class Subheading extends ContentTools.Tools.Heading {
  static initClass() {
    ContentTools.ToolShelf.stow(this, "subheading");
    this.label = "Subheading";
    this.icon = "subheading";
    this.tagName = "h2";
  }
};
Cls$tools$g.initClass();
const Cls$tools$f = ContentTools.Tools.Paragraph = class Paragraph extends ContentTools.Tools.Heading {
  static initClass() {
    ContentTools.ToolShelf.stow(this, "paragraph");
    this.label = "Paragraph";
    this.icon = "paragraph";
    this.tagName = "p";
  }
  static canApply(element, selection) {
    if (element.isFixed()) {
      return false;
    }
    return element !== void 0;
  }
  static apply(element, selection, callback) {
    const forceAdd = this.editor().ctrlDown();
    if (ContentTools.Tools.Heading.canApply(element) && !forceAdd) {
      return super.apply(element, selection, callback);
    } else {
      const toolDetail = {
        "tool": this,
        "element": element,
        "selection": selection
      };
      if (!this.dispatchEditorEvent("tool-apply", toolDetail)) {
        return;
      }
      if (element.parent().type() !== "Region") {
        element = element.closest((node) => node.parent().type() === "Region");
      }
      const region = element.parent();
      const paragraph = new ContentEdit.Text("p");
      region.attach(paragraph, region.children.indexOf(element) + 1);
      paragraph.focus();
      callback(true);
      return this.dispatchEditorEvent("tool-applied", toolDetail);
    }
  }
};
Cls$tools$f.initClass();
const Cls$tools$e = ContentTools.Tools.Preformatted = class Preformatted extends ContentTools.Tools.Heading {
  static initClass() {
    ContentTools.ToolShelf.stow(this, "preformatted");
    this.label = "Preformatted";
    this.icon = "preformatted";
    this.tagName = "pre";
  }
  static apply(element, selection, callback) {
    const toolDetail = {
      "tool": this,
      "element": element,
      "selection": selection
    };
    if (!this.dispatchEditorEvent("tool-apply", toolDetail)) {
      return;
    }
    if (element.type() === "PreText") {
      ContentTools.Tools.Paragraph.apply(element, selection, callback);
      return;
    }
    const text = element.content.text();
    const preText = new ContentEdit.PreText(
      "pre",
      {},
      HTMLString.String.encode(text)
    );
    const parent = element.parent();
    const insertAt = parent.children.indexOf(element);
    parent.detach(element);
    parent.attach(preText, insertAt);
    element.blur();
    preText.focus();
    preText.selection(selection);
    callback(true);
    return this.dispatchEditorEvent("tool-applied", toolDetail);
  }
};
Cls$tools$e.initClass();
const Cls$tools$d = ContentTools.Tools.AlignLeft = class AlignLeft extends ContentTools.Tool {
  static initClass() {
    ContentTools.ToolShelf.stow(this, "align-left");
    this.label = "Align left";
    this.icon = "align-left";
    this.className = "text-left";
  }
  static canApply(element, selection) {
    return element.content !== void 0;
  }
  static isApplied(element, selection) {
    let needle;
    if (!this.canApply(element)) {
      return false;
    }
    if (needle = element.type(), ["ListItemText", "TableCellText"].includes(needle)) {
      element = element.parent();
    }
    return element.hasCSSClass(this.className);
  }
  static apply(element, selection, callback) {
    let className, needle;
    const toolDetail = {
      "tool": this,
      "element": element,
      "selection": selection
    };
    if (!this.dispatchEditorEvent("tool-apply", toolDetail)) {
      return;
    }
    if (needle = element.type(), ["ListItemText", "TableCellText"].includes(needle)) {
      element = element.parent();
    }
    const alignmentClassNames = [
      ContentTools.Tools.AlignLeft.className,
      ContentTools.Tools.AlignCenter.className,
      ContentTools.Tools.AlignRight.className
    ];
    for (className of Array.from(alignmentClassNames)) {
      if (element.hasCSSClass(className)) {
        element.removeCSSClass(className);
        if (className === this.className) {
          return callback(true);
        }
      }
    }
    element.addCSSClass(this.className);
    callback(true);
    return this.dispatchEditorEvent("tool-applied", toolDetail);
  }
};
Cls$tools$d.initClass();
const Cls$tools$c = ContentTools.Tools.AlignCenter = class AlignCenter extends ContentTools.Tools.AlignLeft {
  static initClass() {
    ContentTools.ToolShelf.stow(this, "align-center");
    this.label = "Align center";
    this.icon = "align-center";
    this.className = "text-center";
  }
};
Cls$tools$c.initClass();
const Cls$tools$b = ContentTools.Tools.AlignRight = class AlignRight extends ContentTools.Tools.AlignLeft {
  static initClass() {
    ContentTools.ToolShelf.stow(this, "align-right");
    this.label = "Align right";
    this.icon = "align-right";
    this.className = "text-right";
  }
};
Cls$tools$b.initClass();
const Cls$tools$a = ContentTools.Tools.UnorderedList = class UnorderedList extends ContentTools.Tool {
  static initClass() {
    ContentTools.ToolShelf.stow(this, "unordered-list");
    this.label = "Bullet list";
    this.icon = "unordered-list";
    this.listTag = "ul";
  }
  static canApply(element, selection) {
    let needle;
    if (element.isFixed()) {
      return false;
    }
    return element.content !== void 0 && (needle = element.parent().type(), ["Region", "ListItem"].includes(needle));
  }
  static apply(element, selection, callback) {
    let list;
    const toolDetail = {
      "tool": this,
      "element": element,
      "selection": selection
    };
    if (!this.dispatchEditorEvent("tool-apply", toolDetail)) {
      return;
    }
    if (element.parent().type() === "ListItem") {
      element.storeState();
      list = element.closest((node) => node.type() === "List");
      list.tagName(this.listTag);
      element.restoreState();
    } else {
      const listItemText = new ContentEdit.ListItemText(element.content.copy());
      const listItem = new ContentEdit.ListItem();
      listItem.attach(listItemText);
      list = new ContentEdit.List(this.listTag, {});
      list.attach(listItem);
      const parent = element.parent();
      const insertAt = parent.children.indexOf(element);
      parent.detach(element);
      parent.attach(list, insertAt);
      listItemText.focus();
      listItemText.selection(selection);
    }
    callback(true);
    return this.dispatchEditorEvent("tool-applied", toolDetail);
  }
};
Cls$tools$a.initClass();
const Cls$tools$9 = ContentTools.Tools.OrderedList = class OrderedList extends ContentTools.Tools.UnorderedList {
  static initClass() {
    ContentTools.ToolShelf.stow(this, "ordered-list");
    this.label = "Numbers list";
    this.icon = "ordered-list";
    this.listTag = "ol";
  }
};
Cls$tools$9.initClass();
const Cls$tools$8 = ContentTools.Tools.Table = class Table2 extends ContentTools.Tool {
  static initClass() {
    ContentTools.ToolShelf.stow(this, "table");
    this.label = "Table";
    this.icon = "table";
  }
  // Class methods
  static canApply(element, selection) {
    if (element.isFixed()) {
      return false;
    }
    return element !== void 0;
  }
  static apply(element, selection, callback) {
    const toolDetail = {
      "tool": this,
      "element": element,
      "selection": selection
    };
    if (!this.dispatchEditorEvent("tool-apply", toolDetail)) {
      return;
    }
    if (element.storeState) {
      element.storeState();
    }
    const app = ContentTools.EditorApp.get();
    const modal = new ContentTools.ModalUI();
    let table = element.closest((node) => node && node.type() === "Table");
    const dialog = new ContentTools.TableDialog(table);
    dialog.addEventListener("cancel", () => {
      modal.hide();
      dialog.hide();
      if (element.restoreState) {
        element.restoreState();
      }
      return callback(false);
    });
    dialog.addEventListener("save", (ev) => {
      const tableCfg = ev.detail();
      let keepFocus = true;
      if (table) {
        this._updateTable(tableCfg, table);
        keepFocus = element.closest((node) => node && node.type() === "Table");
      } else {
        table = this._createTable(tableCfg);
        const [node, index] = Array.from(this._insertAt(element));
        node.parent().attach(table, index);
        keepFocus = false;
      }
      if (keepFocus) {
        element.restoreState();
      } else {
        table.firstSection().children[0].children[0].children[0].focus();
      }
      modal.hide();
      dialog.hide();
      callback(true);
      return this.dispatchEditorEvent("tool-applied", toolDetail);
    });
    app.attach(modal);
    app.attach(dialog);
    modal.show();
    return dialog.show();
  }
  // Private class methods
  static _adjustColumns(section, columns) {
    return (() => {
      const result = [];
      for (var row of Array.from(section.children)) {
        var cellTag = row.children[0].tagName();
        var currentColumns = row.children.length;
        var diff = columns - currentColumns;
        if (diff < 0) {
          result.push((() => {
            const result1 = [];
            for (let i = diff, asc = diff <= 0; asc ? i < 0 : i > 0; asc ? i++ : i--) {
              var cell = row.children[row.children.length - 1];
              result1.push(row.detach(cell));
            }
            return result1;
          })());
        } else if (diff > 0) {
          result.push((() => {
            const result2 = [];
            for (let i = 0, end = diff, asc1 = 0 <= end; asc1 ? i < end : i > end; asc1 ? i++ : i--) {
              var cell = new ContentEdit.TableCell(cellTag);
              row.attach(cell);
              var cellText = new ContentEdit.TableCellText("");
              result2.push(cell.attach(cellText));
            }
            return result2;
          })());
        } else {
          result.push(void 0);
        }
      }
      return result;
    })();
  }
  static _createTable(tableCfg) {
    const table = new ContentEdit.Table();
    if (tableCfg.head) {
      const head = this._createTableSection("thead", "th", tableCfg.columns);
      table.attach(head);
    }
    const body = this._createTableSection("tbody", "td", tableCfg.columns);
    table.attach(body);
    if (tableCfg.foot) {
      const foot = this._createTableSection("tfoot", "td", tableCfg.columns);
      table.attach(foot);
    }
    return table;
  }
  static _createTableSection(sectionTag, cellTag, columns) {
    const section = new ContentEdit.TableSection(sectionTag);
    const row = new ContentEdit.TableRow();
    section.attach(row);
    for (let i = 0, end = columns, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
      var cell = new ContentEdit.TableCell(cellTag);
      row.attach(cell);
      var cellText = new ContentEdit.TableCellText("");
      cell.attach(cellText);
    }
    return section;
  }
  static _updateTable(tableCfg, table) {
    if (!tableCfg.head && table.thead()) {
      table.detach(table.thead());
    }
    if (!tableCfg.foot && table.tfoot()) {
      table.detach(table.tfoot());
    }
    const columns = table.firstSection().children[0].children.length;
    if (tableCfg.columns !== columns) {
      for (var section of Array.from(table.children)) {
        this._adjustColumns(section, tableCfg.columns);
      }
    }
    if (tableCfg.head && !table.thead()) {
      const head = this._createTableSection("thead", "th", tableCfg.columns);
      table.attach(head, 0);
    }
    if (tableCfg.foot && !table.tfoot()) {
      const foot = this._createTableSection("tfoot", "td", tableCfg.columns);
      return table.attach(foot);
    }
  }
};
Cls$tools$8.initClass();
const Cls$tools$7 = ContentTools.Tools.Indent = class Indent extends ContentTools.Tool {
  static initClass() {
    ContentTools.ToolShelf.stow(this, "indent");
    this.label = "Indent";
    this.icon = "indent";
  }
  static canApply(element, selection) {
    return element.parent().type() === "ListItem" && element.parent().parent().children.indexOf(element.parent()) > 0;
  }
  static apply(element, selection, callback) {
    const toolDetail = {
      "tool": this,
      "element": element,
      "selection": selection
    };
    if (!this.dispatchEditorEvent("tool-apply", toolDetail)) {
      return;
    }
    element.parent().indent();
    callback(true);
    return this.dispatchEditorEvent("tool-applied", toolDetail);
  }
};
Cls$tools$7.initClass();
const Cls$tools$6 = ContentTools.Tools.Unindent = class Unindent extends ContentTools.Tool {
  static initClass() {
    ContentTools.ToolShelf.stow(this, "unindent");
    this.label = "Unindent";
    this.icon = "unindent";
  }
  static canApply(element, selection) {
    return element.parent().type() === "ListItem";
  }
  static apply(element, selection, callback) {
    const toolDetail = {
      "tool": this,
      "element": element,
      "selection": selection
    };
    if (!this.dispatchEditorEvent("tool-apply", toolDetail)) {
      return;
    }
    element.parent().unindent();
    callback(true);
    return this.dispatchEditorEvent("tool-applied", toolDetail);
  }
};
Cls$tools$6.initClass();
const Cls$tools$5 = ContentTools.Tools.LineBreak = class LineBreak extends ContentTools.Tool {
  static initClass() {
    ContentTools.ToolShelf.stow(this, "line-break");
    this.label = "Line break";
    this.icon = "line-break";
  }
  static canApply(element, selection) {
    return element.content;
  }
  static apply(element, selection, callback) {
    const toolDetail = {
      "tool": this,
      "element": element,
      "selection": selection
    };
    if (!this.dispatchEditorEvent("tool-apply", toolDetail)) {
      return;
    }
    const cursor = selection.get()[0] + 1;
    const tip = element.content.substring(0, selection.get()[0]);
    const tail = element.content.substring(selection.get()[1]);
    const br = new HTMLString.String("<br>", element.content.preserveWhitespace());
    element.content = tip.concat(br, tail);
    element.updateInnerHTML();
    element.taint();
    selection.set(cursor, cursor);
    element.selection(selection);
    callback(true);
    return this.dispatchEditorEvent("tool-applied", toolDetail);
  }
};
Cls$tools$5.initClass();
const Cls$tools$4 = ContentTools.Tools.Image = class Image2 extends ContentTools.Tool {
  static initClass() {
    ContentTools.ToolShelf.stow(this, "image");
    this.label = "Image";
    this.icon = "image";
  }
  static canApply(element, selection) {
    if (element.isFixed()) {
      if (element.type() !== "ImageFixture") {
        return false;
      }
    }
    return true;
  }
  static apply(element, selection, callback) {
    const toolDetail = {
      "tool": this,
      "element": element,
      "selection": selection
    };
    if (!this.dispatchEditorEvent("tool-apply", toolDetail)) {
      return;
    }
    if (element.storeState) {
      element.storeState();
    }
    const app = ContentTools.EditorApp.get();
    const modal = new ContentTools.ModalUI();
    const dialog = new ContentTools.ImageDialog();
    dialog.addEventListener("cancel", () => {
      modal.hide();
      dialog.hide();
      if (element.restoreState) {
        element.restoreState();
      }
      return callback(false);
    });
    dialog.addEventListener("save", (ev) => {
      const detail = ev.detail();
      const {
        imageURL
      } = detail;
      const {
        imageSize
      } = detail;
      let {
        imageAttrs
      } = detail;
      if (!imageAttrs) {
        imageAttrs = {};
      }
      imageAttrs.height = imageSize[1];
      imageAttrs.src = imageURL;
      imageAttrs.width = imageSize[0];
      if (element.type() === "ImageFixture") {
        element.src(imageURL);
      } else {
        const image = new ContentEdit.Image(imageAttrs);
        const [node, index] = Array.from(this._insertAt(element));
        node.parent().attach(image, index);
        image.focus();
      }
      modal.hide();
      dialog.hide();
      callback(true);
      return this.dispatchEditorEvent("tool-applied", toolDetail);
    });
    app.attach(modal);
    app.attach(dialog);
    modal.show();
    return dialog.show();
  }
};
Cls$tools$4.initClass();
const Cls$tools$3 = ContentTools.Tools.Video = class Video2 extends ContentTools.Tool {
  static initClass() {
    ContentTools.ToolShelf.stow(this, "video");
    this.label = "Video";
    this.icon = "video";
  }
  static canApply(element, selection) {
    return !element.isFixed();
  }
  static apply(element, selection, callback) {
    const toolDetail = {
      "tool": this,
      "element": element,
      "selection": selection
    };
    if (!this.dispatchEditorEvent("tool-apply", toolDetail)) {
      return;
    }
    if (element.storeState) {
      element.storeState();
    }
    const app = ContentTools.EditorApp.get();
    const modal = new ContentTools.ModalUI();
    const dialog = new ContentTools.VideoDialog();
    dialog.addEventListener("cancel", () => {
      modal.hide();
      dialog.hide();
      if (element.restoreState) {
        element.restoreState();
      }
      return callback(false);
    });
    dialog.addEventListener("save", (ev) => {
      const {
        url
      } = ev.detail();
      if (url) {
        const video = new ContentEdit.Video(
          "iframe",
          {
            "frameborder": 0,
            "height": ContentTools.DEFAULT_VIDEO_HEIGHT,
            "src": url,
            "width": ContentTools.DEFAULT_VIDEO_WIDTH
          }
        );
        const [node, index] = Array.from(this._insertAt(element));
        node.parent().attach(video, index);
        video.focus();
      } else {
        if (element.restoreState) {
          element.restoreState();
        }
      }
      modal.hide();
      dialog.hide();
      const applied = url !== "";
      callback(applied);
      if (applied) {
        return this.dispatchEditorEvent("tool-applied", toolDetail);
      }
    });
    app.attach(modal);
    app.attach(dialog);
    modal.show();
    return dialog.show();
  }
};
Cls$tools$3.initClass();
const Cls$tools$2 = ContentTools.Tools.Undo = class Undo extends ContentTools.Tool {
  static initClass() {
    ContentTools.ToolShelf.stow(this, "undo");
    this.label = "Undo";
    this.icon = "undo";
    this.requiresElement = false;
  }
  static canApply(element, selection) {
    const app = ContentTools.EditorApp.get();
    return app.history && app.history.canUndo();
  }
  static apply(element, selection, callback) {
    const toolDetail = {
      "tool": this,
      "element": element,
      "selection": selection
    };
    if (!this.dispatchEditorEvent("tool-apply", toolDetail)) {
      return;
    }
    const app = this.editor();
    app.history.stopWatching();
    const snapshot = app.history.undo();
    app.revertToSnapshot(snapshot);
    app.history.watch();
    return this.dispatchEditorEvent("tool-applied", toolDetail);
  }
};
Cls$tools$2.initClass();
const Cls$tools$1 = ContentTools.Tools.Redo = class Redo extends ContentTools.Tool {
  static initClass() {
    ContentTools.ToolShelf.stow(this, "redo");
    this.label = "Redo";
    this.icon = "redo";
    this.requiresElement = false;
  }
  static canApply(element, selection) {
    const app = ContentTools.EditorApp.get();
    return app.history && app.history.canRedo();
  }
  static apply(element, selection, callback) {
    const toolDetail = {
      "tool": this,
      "element": element,
      "selection": selection
    };
    if (!this.dispatchEditorEvent("tool-apply", toolDetail)) {
      return;
    }
    const app = ContentTools.EditorApp.get();
    app.history.stopWatching();
    const snapshot = app.history.redo();
    app.revertToSnapshot(snapshot);
    app.history.watch();
    return this.dispatchEditorEvent("tool-applied", toolDetail);
  }
};
Cls$tools$1.initClass();
const Cls$tools = ContentTools.Tools.Remove = class Remove extends ContentTools.Tool {
  static initClass() {
    ContentTools.ToolShelf.stow(this, "remove");
    this.label = "Remove";
    this.icon = "remove";
  }
  static canApply(element, selection) {
    return !element.isFixed();
  }
  static apply(element, selection, callback) {
    const toolDetail = {
      "tool": this,
      "element": element,
      "selection": selection
    };
    if (!this.dispatchEditorEvent("tool-apply", toolDetail)) {
      return;
    }
    const app = this.editor();
    element.blur();
    if (element.nextContent()) {
      element.nextContent().focus();
    } else if (element.previousContent()) {
      element.previousContent().focus();
    }
    if (!element.isMounted()) {
      callback(true);
      this.dispatchEditorEvent("tool-applied", toolDetail);
      return;
    }
    switch (element.type()) {
      case "ListItemText":
        if (app.ctrlDown()) {
          const list = element.closest((node) => node.parent().type() === "Region");
          list.parent().detach(list);
        } else {
          element.parent().parent().detach(element.parent());
        }
        break;
      case "TableCellText":
        if (app.ctrlDown()) {
          const table = element.closest((node) => node.type() === "Table");
          table.parent().detach(table);
        } else {
          const row = element.parent().parent();
          row.parent().detach(row);
        }
        break;
      default:
        element.parent().detach(element);
        break;
    }
    callback(true);
    return this.dispatchEditorEvent("tool-applied", toolDetail);
  }
};
Cls$tools.initClass();
export {
  ContentTools as C,
  DocumentRootContext as D,
  FSM as F,
  HTMLString as H,
  MARKDOWN_PROFILE as M,
  PROFILES as P,
  ContentEdit as a,
  ContentSelect as b,
  HTML_PROFILE as c,
  filterToolGroups as f,
  restrictedAttributes as r
};
