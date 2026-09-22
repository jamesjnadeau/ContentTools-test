import { T as TOKEN_KEY, s as sessionStorageOrMemory, m as memoryStorage, A as APP_TOKEN_KEY } from "./handoff-qeCiTHXN.js";
class ConfigError extends Error {
  constructor(path, message) {
    super(path ? `${path}: ${message}` : message);
    this.name = "ConfigError";
    this.path = path;
  }
}
const DEFAULT_BRANCH = "main";
const DEFAULT_API_BASE = "https://api.github.com";
const DEFAULT_EXTENSION = "md";
const DEFAULT_SLUG = "{{slug}}";
const SLUG_TOKENS = Object.freeze(
  ["slug", "year", "month", "day"]
);
const PAGE_TOKENS = Object.freeze(["slug"]);
const PREVIEW_TOKENS = Object.freeze(["pr"]);
const SLUG_TOKEN = /\{\{([^{}]*)\}\}/g;
function parseAuth(value) {
  if (value === void 0 || value === null) {
    return Object.freeze({ kind: "pat" });
  }
  const auth = object(value, "backend.auth");
  const kind = optionalStr(auth.kind, "backend.auth.kind", "pat");
  if (kind === "pat") {
    return Object.freeze({ kind: "pat" });
  }
  if (kind !== "github-app") {
    throw new ConfigError(
      "backend.auth.kind",
      `expected "pat" or "github-app", got "${kind}"`
    );
  }
  return Object.freeze({
    kind: "github-app",
    clientId: str(auth.clientId, "backend.auth.clientId"),
    proxy: str(auth.proxy, "backend.auth.proxy")
  });
}
function object(value, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ConfigError(path, "expected an object");
  }
  return value;
}
function array(value, path) {
  if (!Array.isArray(value)) {
    throw new ConfigError(path, "expected an array");
  }
  return value;
}
function str(value, path) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ConfigError(path, "expected a non-empty string");
  }
  return value;
}
function optionalStr(value, path, fallback) {
  return value === void 0 || value === null ? fallback : str(value, path);
}
function optionalBool(value, path, fallback) {
  if (value === void 0 || value === null) {
    return fallback;
  }
  if (typeof value !== "boolean") {
    throw new ConfigError(path, "expected true or false");
  }
  return value;
}
function trimSlashes(value) {
  return value.replace(/^\/+|\/+$/g, "");
}
function parseOptions(value, path) {
  return array(value, path).map((raw, i) => {
    const at = `${path}[${i}]`;
    if (typeof raw === "string") {
      return Object.freeze({ value: raw, label: raw });
    }
    const option = object(raw, at);
    const optionValue = str(option.value, `${at}.value`);
    return Object.freeze({
      value: optionValue,
      label: optionalStr(option.label, `${at}.label`, optionValue)
    });
  });
}
function parseFields(value, path) {
  if (value === void 0 || value === null) {
    return [];
  }
  return array(value, path).map((raw, i) => {
    const at = `${path}[${i}]`;
    const field = object(raw, at);
    const name = str(field.name, `${at}.name`);
    const widget = optionalStr(field.widget, `${at}.widget`, "string");
    const hasOptions = field.options !== void 0 && field.options !== null;
    if (widget === "select" && !hasOptions) {
      throw new ConfigError(`${at}.options`, "is required for a `select` field");
    }
    const options = hasOptions ? parseOptions(field.options, `${at}.options`) : [];
    if (widget === "select" && options.length === 0) {
      throw new ConfigError(`${at}.options`, "is empty");
    }
    return Object.freeze({
      name,
      label: optionalStr(field.label, `${at}.label`, name),
      widget,
      required: optionalBool(field.required, `${at}.required`, false),
      options: Object.freeze(options),
      default: field.default
    });
  });
}
function templateTokens(template, allowed, path) {
  const used = /* @__PURE__ */ new Set();
  for (const [, name] of template.matchAll(SLUG_TOKEN)) {
    const token = name.trim();
    if (!allowed.includes(token)) {
      throw new ConfigError(
        path,
        `"{{${name}}}" is not a token here; expected ` + (allowed.length ? `one of ${allowed.map((t) => `{{${t}}}`).join(", ")}` : "no tokens at all")
      );
    }
    used.add(token);
  }
  if (/[{}]/.test(template.replace(SLUG_TOKEN, ""))) {
    throw new ConfigError(
      path,
      `"${template}" has a brace that is not part of a token; a token is written {{like-this}}`
    );
  }
  return used;
}
function slugTemplate(raw, path) {
  const template = optionalStr(raw, path, DEFAULT_SLUG);
  if (template.includes("/")) {
    throw new ConfigError(
      path,
      `"${template}" contains "/"; a slug names one file, not a path`
    );
  }
  const used = templateTokens(template, SLUG_TOKENS, path);
  if (!used.has("slug")) {
    throw new ConfigError(
      path,
      `"${template}" has no {{slug}}, so every new entry would be named the same`
    );
  }
  return template;
}
function pageTemplate(raw, path, slugged) {
  if (raw === void 0 || raw === null) {
    return null;
  }
  const template = str(raw, path);
  if (!template.startsWith("/")) {
    throw new ConfigError(
      path,
      `"${template}" is not rooted; a page path starts with "/"`
    );
  }
  const used = templateTokens(template, slugged ? PAGE_TOKENS : [], path);
  if (slugged && !used.has("slug")) {
    throw new ConfigError(
      path,
      `"${template}" has no {{slug}}, so every entry in this collection would claim the same page`
    );
  }
  return expandTokens(template, { slug: "{{slug}}" });
}
function previewTemplate(raw, path) {
  if (raw === void 0 || raw === null) {
    return null;
  }
  const template = str(raw, path);
  if (!/^https?:\/\//.test(template)) {
    throw new ConfigError(
      path,
      `"${template}" is not an absolute http(s) URL; a preview deployment is served from a different origin`
    );
  }
  if (!templateTokens(template, PREVIEW_TOKENS, path).has("pr")) {
    throw new ConfigError(
      path,
      `"${template}" has no {{pr}}, so every pull request would preview at the same URL`
    );
  }
  return template.replace(/\/+$/, "");
}
function parseSite(raw) {
  const input = raw === void 0 || raw === null ? {} : object(raw, "site");
  const base = optionalStr(input.base, "site.base", "");
  return Object.freeze({
    /* Normalised to leading-slash-no-trailing so that
       `${base}${page}` is right for both a site at the root and one
       under a prefix, without either end guessing what the other
       wrote. */
    base: base === "" ? "" : `/${trimSlashes(base)}`,
    preview: previewTemplate(input.preview, "site.preview")
  });
}
function requireBody(hasPage, body, path) {
  if (hasPage && body === null) {
    throw new ConfigError(
      `${path}.body`,
      "is required alongside `page`: in-page editing has to be told which element holds the rendered body"
    );
  }
}
function parseCollection(raw, path) {
  const input = object(raw, path);
  const name = str(input.name, `${path}.name`);
  const label = optionalStr(input.label, `${path}.label`, name);
  const body = input.body === void 0 || input.body === null ? null : str(input.body, `${path}.body`);
  const hasFolder = input.folder !== void 0 && input.folder !== null;
  const hasFiles = input.files !== void 0 && input.files !== null;
  if (hasFolder && hasFiles) {
    throw new ConfigError(path, "has both `folder` and `files`; a collection is one or the other");
  }
  if (!hasFolder && !hasFiles) {
    throw new ConfigError(path, "needs either `folder` or `files`");
  }
  if (hasFiles) {
    const files = array(input.files, `${path}.files`).map((rawFile, i) => {
      const at = `${path}.files[${i}]`;
      const file = object(rawFile, at);
      const fileName = str(file.name, `${at}.name`);
      return Object.freeze({
        name: fileName,
        label: optionalStr(file.label, `${at}.label`, fileName),
        file: trimSlashes(str(file.file, `${at}.file`)),
        fields: Object.freeze(parseFields(file.fields, `${at}.fields`)),
        page: pageTemplate(file.page, `${at}.page`, false)
      });
    });
    if (files.length === 0) {
      throw new ConfigError(`${path}.files`, "is empty");
    }
    requireBody(files.some((f) => f.page !== null), body, path);
    return Object.freeze({
      kind: "file",
      name,
      label,
      files: Object.freeze(files),
      body
    });
  }
  const page = pageTemplate(input.page, `${path}.page`, true);
  requireBody(page !== null, body, path);
  return Object.freeze({
    kind: "folder",
    name,
    label,
    page,
    body,
    folder: trimSlashes(str(input.folder, `${path}.folder`)),
    create: optionalBool(input.create, `${path}.create`, false),
    delete: optionalBool(input.delete, `${path}.delete`, false),
    /* A leading dot is the natural way to write this and means the same
       thing, so accept it rather than rejecting a config that is right
       in every way a reader would care about. */
    extension: optionalStr(input.extension, `${path}.extension`, DEFAULT_EXTENSION).replace(/^\./, ""),
    slug: slugTemplate(input.slug, `${path}.slug`),
    fields: Object.freeze(parseFields(input.fields, `${path}.fields`))
  });
}
function parseConfig(input) {
  const root = object(input, "");
  const backend = object(root.backend, "backend");
  const repo = str(backend.repo, "backend.repo");
  if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) {
    throw new ConfigError("backend.repo", `expected "owner/name", got "${repo}"`);
  }
  const media = object(root.media, "media");
  const collections = array(root.collections, "collections").map((raw, i) => parseCollection(raw, `collections[${i}]`));
  if (collections.length === 0) {
    throw new ConfigError("collections", "is empty");
  }
  const seen = /* @__PURE__ */ new Set();
  for (const collection of collections) {
    if (seen.has(collection.name)) {
      throw new ConfigError("collections", `duplicate collection name "${collection.name}"`);
    }
    seen.add(collection.name);
  }
  return Object.freeze({
    backend: Object.freeze({
      repo,
      branch: optionalStr(backend.branch, "backend.branch", DEFAULT_BRANCH),
      apiBase: optionalStr(backend.apiBase, "backend.apiBase", DEFAULT_API_BASE).replace(/\/+$/, ""),
      auth: parseAuth(backend.auth)
    }),
    media: Object.freeze({
      folder: trimSlashes(str(media.folder, "media.folder")),
      /* Kept leading-slash-as-written: `/images` and `images` mean
         different things in a document, and normalising would change
         what the published markdown says. */
      publicPath: str(media.publicPath, "media.publicPath").replace(/\/+$/, "")
    }),
    site: parseSite(root.site),
    collections: Object.freeze(collections)
  });
}
async function loadConfig(url, options = {}) {
  const get = options.fetch ?? globalThis.fetch;
  const response = await get(url);
  if (!response.ok) {
    throw new ConfigError("", `could not load ${url}: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const { parse } = await import("./index-BNtVnYoY.js").then((n) => n.a);
    try {
      data = parse(text);
    } catch (error) {
      throw new ConfigError("", `${url} is neither JSON nor YAML: ${error.message}`);
    }
  }
  return parseConfig(data);
}
function findCollection(config, name) {
  return config.collections.find((c) => c.name === name) ?? null;
}
function entryPath(collection, slug) {
  if (collection.kind === "file") {
    const entry = collection.files.find((f) => f.name === slug);
    if (!entry) {
      throw new ConfigError(`collections.${collection.name}`, `has no file named "${slug}"`);
    }
    return entry.file;
  }
  return `${collection.folder}/${slug}.${collection.extension}`;
}
function fieldsFor(collection, slug) {
  var _a;
  if (collection.kind === "file") {
    return ((_a = collection.files.find((f) => f.name === slug)) == null ? void 0 : _a.fields) ?? [];
  }
  return collection.fields;
}
function slugify(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function expandSlug(collection, title, at) {
  const pad = (value) => String(value).padStart(2, "0");
  const values = {
    slug: slugify(title),
    /* The AUTHOR's calendar day, not UTC's. Somebody writing at nine
       in the evening in Berlin files a post under the day they wrote
       it, which is the date they will later look for it under -- and
       under UTC a third of their evenings would be filed under the
       day before. */
    year: String(at.getFullYear()),
    month: pad(at.getMonth() + 1),
    day: pad(at.getDate())
  };
  return expandTokens(collection.slug, values);
}
function expandTokens(template, values) {
  return template.replace(SLUG_TOKEN, (_, name) => values[name.trim()]);
}
function slugFromPath(collection, path) {
  var _a;
  if (collection.kind === "file") {
    return ((_a = collection.files.find((f) => f.file === path)) == null ? void 0 : _a.name) ?? null;
  }
  const prefix = `${collection.folder}/`;
  const suffix = `.${collection.extension}`;
  if (!path.startsWith(prefix) || !path.endsWith(suffix)) {
    return null;
  }
  const slug = path.slice(prefix.length, path.length - suffix.length);
  return slug === "" || slug.includes("/") ? null : slug;
}
function mediaPath(config, filename) {
  return `${config.media.folder}/${filename}`;
}
function mediaURL(config, filename) {
  return `${config.media.publicPath}/${filename}`;
}
const DIRECTORY_LIMIT = 1e3;
class GitHubError extends Error {
  constructor(method, path, status, body) {
    const detail = messageFrom(body);
    super(`${method} ${path} failed: ${status}${detail ? ` -- ${detail}` : ""}`);
    this.name = "GitHubError";
    this.status = status;
    this.method = method;
    this.path = path;
    this.body = body;
  }
}
class ConflictError extends GitHubError {
  constructor(method, path, status, body) {
    super(method, path, status, body);
    this.name = "ConflictError";
  }
}
function messageFrom(body) {
  if (body && typeof body === "object" && typeof body.message === "string") {
    return body.message;
  }
  return "";
}
function encodeBase64(bytes) {
  const CHUNK = 32768;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
const JSON_MEDIA = "application/vnd.github+json";
const JSON_BODY = "application/json";
class GitHub {
  constructor(options) {
    const [owner, name] = options.repo.split("/");
    this.owner = owner;
    this.name = name;
    this.apiBase = options.apiBase ?? "https://api.github.com";
    this.token = options.token;
    this.http = options.fetch ?? globalThis.fetch.bind(globalThis);
  }
  /** `/repos/{owner}/{name}` plus whatever follows. */
  repoPath(suffix = "") {
    return `/repos/${this.owner}/${this.name}${suffix}`;
  }
  async headers(accept) {
    const headers = {
      Accept: accept,
      "X-GitHub-Api-Version": "2022-11-28"
    };
    const token = typeof this.token === "function" ? await this.token() : this.token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }
  /**
   * One request, for the endpoints where any failure is a failure.
   *
   * The others -- reading a file, a directory or a branch head -- call
   * `send` instead, because for them a 404 is an answer rather than an
   * error and has to be seen before this would throw over it.
   */
  async request(method, path, options = {}) {
    const response = await this.send(method, path, options);
    if (!response.ok) {
      throw await errorFor(method, path, response);
    }
    return await response.json();
  }
  async send(method, path, options = {}) {
    const init = {
      method,
      headers: await this.headers(options.accept ?? JSON_MEDIA)
    };
    if (options.body !== void 0) {
      init.body = JSON.stringify(options.body);
      init.headers["Content-Type"] = JSON_BODY;
    }
    return this.http(`${this.apiBase}${path}`, init);
  }
  /**
   * Every page of a list endpoint, followed by the `Link` header.
   *
   * Following the header rather than counting pages: a collection that
   * grows past `per_page` between two requests would otherwise be read
   * short, and a folder quietly missing its newest entries is not a
   * failure anyone would look for.
   */
  async paginate(path) {
    const items = [];
    let next = `${this.apiBase}${path}${path.includes("?") ? "&" : "?"}per_page=100`;
    while (next) {
      const response = await this.http(next, {
        method: "GET",
        headers: await this.headers(JSON_MEDIA)
      });
      if (!response.ok) {
        throw await errorFor("GET", next, response);
      }
      items.push(...await response.json());
      next = nextLink(response.headers.get("Link"));
    }
    return items;
  }
  // --- repository -------------------------------------------------------
  /** Repository metadata, including `default_branch`. */
  repo() {
    return this.request("GET", this.repoPath());
  }
  // --- contents ---------------------------------------------------------
  /**
   * A file's text, or null if it is not there.
   *
   * Read as `raw` rather than as base64 JSON. Two reasons, both silent
   * when got wrong: the JSON form wraps its base64 in newlines and
   * decodes to mojibake for any non-ASCII byte if handled naively, and
   * over 1 MB it gives up entirely, returning `encoding: "none"` and an
   * empty string rather than an error.
   */
  async readFile(path, ref) {
    const at = `${this.repoPath(`/contents/${encodePath(path)}`)}?ref=${encodeURIComponent(ref)}`;
    const response = await this.send("GET", at, { accept: "application/vnd.github.raw" });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw await errorFor("GET", at, response);
    }
    return response.text();
  }
  /**
   * The entries of a directory, or [] if it is not there.
   *
   * Silently capped at `DIRECTORY_LIMIT`, which is why that constant is
   * exported: the response carries no `Link` header and no flag saying
   * it was cut short, so the only way to notice is to count.
   */
  async listDirectory(path, ref) {
    const at = `${this.repoPath(`/contents/${encodePath(path)}`)}?ref=${encodeURIComponent(ref)}`;
    const response = await this.send("GET", at);
    if (response.status === 404) {
      return [];
    }
    if (!response.ok) {
      throw await errorFor("GET", at, response);
    }
    const body = await response.json();
    return Array.isArray(body) ? body : [];
  }
  // --- git data ---------------------------------------------------------
  /** The commit sha a branch points at, or null if there is no such branch. */
  async branchSha(branch) {
    const at = this.repoPath(`/git/ref/heads/${encodePath(branch)}`);
    const response = await this.send("GET", at);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw await errorFor("GET", at, response);
    }
    return (await response.json()).object.sha;
  }
  createBranch(branch, sha) {
    return this.request("POST", this.repoPath("/git/refs"), {
      body: { ref: `refs/heads/${branch}`, sha }
    });
  }
  /**
   * Move a branch, never forcing.
   *
   * A forced update would silently discard a commit somebody else pushed
   * to this entry's branch -- a reviewer's fixup, most likely. Refusing
   * and surfacing a `ConflictError` leaves the shell able to re-read and
   * retry with the user's work still in hand.
   */
  updateBranch(branch, sha) {
    return this.request("PATCH", this.repoPath(`/git/refs/heads/${encodePath(branch)}`), {
      body: { sha, force: false }
    });
  }
  /**
   * Move a branch anywhere, discarding whatever it pointed at.
   *
   * Separate from `updateBranch` rather than a flag on it, so that
   * every forced write is visible at the call site. There is exactly
   * one: `CmsRepo.saveEntry` resetting a `cms/...` branch whose pull
   * request is no longer open.
   */
  resetBranch(branch, sha) {
    return this.request("PATCH", this.repoPath(`/git/refs/heads/${encodePath(branch)}`), {
      body: { sha, force: true }
    });
  }
  /**
   * A blob's bytes, by sha.
   *
   * Content-addressed, so unlike `readFile` there is no ref for this to
   * be stale against and a 404 means the sha is wrong rather than "not
   * committed yet" -- which is why this one throws on every failure
   * instead of answering null.
   *
   * Read as `raw`, and handed back as BYTES rather than text. A blob
   * reached this way is an image: decoding it as a string would replace
   * every byte the encoder does not recognise with U+FFFD, and the
   * damage shows up as a picture that will not render rather than as an
   * error anybody can trace back to here.
   */
  async readBlob(sha) {
    const at = this.repoPath(`/git/blobs/${encodeURIComponent(sha)}`);
    const response = await this.send("GET", at, { accept: "application/vnd.github.raw" });
    if (!response.ok) {
      throw await errorFor("GET", at, response);
    }
    return new Uint8Array(await response.arrayBuffer());
  }
  async createBlob(content, encoding) {
    const blob = await this.request("POST", this.repoPath("/git/blobs"), {
      body: { content, encoding }
    });
    return blob.sha;
  }
  /** A commit's tree sha. */
  async commitTree(sha) {
    const commit = await this.request(
      "GET",
      this.repoPath(`/git/commits/${sha}`)
    );
    return commit.tree.sha;
  }
  listTree(sha) {
    return this.request("GET", this.repoPath(`/git/trees/${sha}?recursive=1`));
  }
  async createTree(baseTree, entries) {
    const tree = await this.request("POST", this.repoPath("/git/trees"), {
      body: { base_tree: baseTree, tree: entries }
    });
    return tree.sha;
  }
  async createCommit(message, tree, parents) {
    const commit = await this.request("POST", this.repoPath("/git/commits"), {
      body: { message, tree, parents }
    });
    return commit.sha;
  }
  // --- pull requests ----------------------------------------------------
  createPull(options) {
    return this.request("POST", this.repoPath("/pulls"), { body: options });
  }
  /** Every open pull request. */
  listPulls() {
    return this.paginate(this.repoPath("/pulls?state=open"));
  }
  async findPull(head) {
    const pulls = await this.request(
      "GET",
      `${this.repoPath("/pulls")}?state=open&head=${encodeURIComponent(`${this.owner}:${head}`)}`
    );
    return pulls[0] ?? null;
  }
  // --- labels -----------------------------------------------------------
  /**
   * Add labels, creating any the repository does not have.
   *
   * `POST /issues/{n}/labels` creates unknown labels implicitly, which is
   * the behaviour this relies on: a fresh repository has none of the
   * `cms/*` labels and asking the operator to make three by hand before
   * the tool works is not a setup step worth having.
   */
  addLabels(issue, labels) {
    return this.request("POST", this.repoPath(`/issues/${issue}/labels`), { body: { labels } });
  }
  async removeLabel(issue, label) {
    const at = this.repoPath(`/issues/${issue}/labels/${encodeURIComponent(label)}`);
    const response = await this.send("DELETE", at);
    if (!response.ok && response.status !== 404) {
      throw await errorFor("DELETE", at, response);
    }
  }
}
function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}
async function errorFor(method, path, response) {
  let body = null;
  try {
    const text = await response.text();
    body = text ? JSON.parse(text) : null;
  } catch {
  }
  const Ctor = response.status === 409 || response.status === 422 && /\/git\/refs\//.test(path) ? ConflictError : GitHubError;
  return new Ctor(method, path, response.status, body);
}
function nextLink(header) {
  if (!header) {
    return null;
  }
  for (const part of header.split(",")) {
    const match = /<([^>]+)>\s*;\s*rel="next"/.exec(part);
    if (match) {
      return match[1];
    }
  }
  return null;
}
const STATUSES = Object.freeze([
  "draft",
  "in-review",
  "ready"
]);
function labelFor(status) {
  return `cms/${status}`;
}
function statusForLabel(label) {
  return STATUSES.find((status) => labelFor(status) === label) ?? null;
}
function statusOf(pull) {
  let found = null;
  for (const label of pull.labels) {
    const status = statusForLabel(label.name);
    if (status && (!found || STATUSES.indexOf(status) > STATUSES.indexOf(found))) {
      found = status;
    }
  }
  return found;
}
const BRANCH_PREFIX = "cms";
function branchFor(collection, slug) {
  return `${BRANCH_PREFIX}/${collection}/${slug}`;
}
function entryForBranch(ref) {
  const parts = ref.split("/");
  if (parts.length !== 3 || parts[0] !== BRANCH_PREFIX || !parts[1] || !parts[2]) {
    return null;
  }
  return { collection: parts[1], slug: parts[2] };
}
class CmsRepo {
  constructor(options) {
    this.config = options.config;
    this.github = options.github ?? new GitHub({
      repo: options.config.backend.repo,
      apiBase: options.config.backend.apiBase,
      token: options.token,
      fetch: options.fetch
    });
  }
  /** The branch entries are read from and pull requests target. */
  get base() {
    return this.config.backend.branch;
  }
  collection(name) {
    const collection = findCollection(this.config, name);
    if (!collection) {
      throw new ConfigError("collections", `no collection named "${name}"`);
    }
    return collection;
  }
  /**
   * The entries of a collection, as they stand on the base branch.
   *
   * Entries that exist only inside an open pull request are NOT here --
   * they are not in the published site either. `listInFlight()` is the
   * other half, and a shell showing "all entries" merges the two rather
   * than this method guessing which it wanted.
   */
  async listEntries(name) {
    const collection = this.collection(name);
    if (collection.kind === "file") {
      return {
        entries: collection.files.map((file) => ({
          collection: name,
          slug: file.name,
          path: file.file
        })),
        truncated: false
      };
    }
    const listing = await this.github.listDirectory(collection.folder, this.base);
    return {
      entries: listing.filter((item) => item.type === "file").map((item) => ({ slug: slugFromPath(collection, item.path), path: item.path })).filter((item) => item.slug !== null).map((item) => ({ collection: name, ...item })),
      /* Measured against the RAW listing, before the filters above.
         A folder of 1000 files holding a handful of directories and
         a stray `.gitkeep` comes back short of the cap once filtered,
         so counting what survived would report a capped listing as a
         complete one -- which is the silently-short list this flag
         exists to prevent. */
      truncated: listing.length >= DIRECTORY_LIMIT
    };
  }
  /**
   * Open an entry for editing.
   *
   * If a pull request is open for it, the version under review is the
   * one to edit. Reading the base branch instead would show the user a
   * version without their own unmerged work in it, and the next save
   * would commit that over the top -- a silent revert of everything in
   * the pull request, with no error and nothing to notice.
   */
  async readEntry(name, slug) {
    const collection = this.collection(name);
    const path = entryPath(collection, slug);
    const branch = branchFor(name, slug);
    const pull = await this.github.findPull(branch);
    const ref = pull ? branch : this.base;
    return {
      collection: name,
      slug,
      path,
      ref,
      /* From the pull request rather than a second request for the
         ref: GitHub reports the head it has, so the two cannot
         disagree about which commit this content came from. */
      commit: pull ? pull.head.sha : await this.baseSha(),
      content: await this.github.readFile(path, ref),
      pull
    };
  }
  /**
   * Commit an entry, and its media, and open a pull request.
   *
   * One commit whatever is attached: an entry and the images it
   * references land together or not at all, so an abandoned edit leaves
   * nothing behind and a reviewer never sees a post pointing at a file
   * that arrives in the next commit.
   */
  async saveEntry(name, slug, options) {
    const collection = this.collection(name);
    const path = entryPath(collection, slug);
    const branch = branchFor(name, slug);
    const media = options.media ?? [];
    const message = options.message ?? `Update ${name}/${slug}`;
    const pull = await this.github.findPull(branch);
    const current = await this.github.readFile(path, pull ? branch : this.base);
    if (options.create && (current !== null || pull)) {
      throw new EntryExistsError(name, slug, path);
    }
    if (current === options.content && media.length === 0) {
      if (pull) {
        return { branch, pull, commit: null, changed: false, reset: false };
      }
      throw new NothingToSaveError(name, slug);
    }
    return this.push(
      branch,
      pull,
      message,
      options,
      await this.treeEntries(path, options.content, media)
    );
  }
  /**
   * Remove an entry, as a pull request like any other edit.
   *
   * A deletion is a change to the site, so it goes through the same
   * branch, the same review and the same merge as a typo fix. There is
   * deliberately no direct write: a tool that can delete a page without
   * anybody seeing it first has removed the review gate this whole
   * workflow exists to be.
   */
  async deleteEntry(name, slug, options = {}) {
    const collection = this.collection(name);
    const path = entryPath(collection, slug);
    const branch = branchFor(name, slug);
    const message = options.message ?? `Delete ${name}/${slug}`;
    const pull = await this.github.findPull(branch);
    if (await this.github.readFile(path, pull ? branch : this.base) === null) {
      throw new EntryMissingError(name, slug, path);
    }
    return this.push(
      branch,
      pull,
      message,
      options,
      [{ path, mode: "100644", type: "blob", sha: null }]
    );
  }
  /**
   * Commit a tree to an entry's branch and make sure a pull request is open.
   *
   * Shared by saving and deleting, and extracted the moment there were
   * two of them. Every line below is an invariant about the `cms/`
   * namespace -- which parent a commit gets, when a branch may be
   * forced, which pull request a status goes on -- and a second copy
   * that drifted from this one would put a deletion on a branch under
   * different rules from an edit to the same file.
   */
  async push(branch, pull, message, options, entries) {
    const existing = await this.github.branchSha(branch);
    const baseSha = await this.baseSha();
    const parent = options.parent ?? (pull ? existing : baseSha);
    const reset = Boolean(existing) && !pull;
    const tree = await this.github.createTree(
      await this.github.commitTree(parent),
      entries
    );
    const commit = await this.github.createCommit(message, tree, [parent]);
    if (!existing) {
      await this.github.createBranch(branch, commit);
    } else if (pull) {
      await this.github.updateBranch(branch, commit);
    } else {
      await this.github.resetBranch(branch, commit);
    }
    const found = pull ?? await this.github.createPull({
      title: message,
      body: options.body ?? "",
      head: branch,
      base: this.base,
      draft: Boolean(options.draft)
    });
    const open = { ...found, head: { ...found.head, sha: commit } };
    const status = options.status ?? (pull ? null : "draft");
    return {
      branch,
      commit,
      changed: true,
      reset,
      pull: status ? await this.setStatus(open, status) : open
    };
  }
  /**
   * Move an entry's pull request to a status.
   *
   * The new label goes on before the old one comes off, so a pull
   * request is never briefly unlabelled -- a board built on label
   * queries would drop the card. The other way round, a failure between
   * the two leaves both labels, which `statusOf` resolves in favour of
   * the furthest along.
   *
   * The pull request comes back with its labels as they now stand,
   * computed rather than re-read: it saves a request, and the caller's
   * copy would otherwise still describe the status it just changed.
   */
  async setStatus(pull, status) {
    const wanted = labelFor(status);
    const labels = pull.labels.filter((label) => !statusForLabel(label.name));
    if (!pull.labels.some((label) => label.name === wanted)) {
      await this.github.addLabels(pull.number, [wanted]);
    }
    for (const label of pull.labels) {
      if (statusForLabel(label.name) && label.name !== wanted) {
        await this.github.removeLabel(pull.number, label.name);
      }
    }
    return { ...pull, labels: [...labels, { name: wanted }] };
  }
  /** The base branch's head, which everything here is measured from. */
  async baseSha() {
    const sha = await this.github.branchSha(this.base);
    if (sha === null) {
      throw new ConfigError("backend.branch", `branch "${this.base}" does not exist`);
    }
    return sha;
  }
  /** Blobs for the entry and everything travelling with it. */
  async treeEntries(path, content, media) {
    const entries = [{
      path,
      mode: "100644",
      type: "blob",
      /* Text goes up as text. An earlier version base64'd the entry
         too, so that it travelled the same way as the media; no
         test could tell the two apart, and `utf-8` is the API's own
         default, a third smaller on the wire and readable in a
         network log when a save goes wrong. Media has no choice --
         it is bytes, and most of them are not text. */
      sha: await this.github.createBlob(content, "utf-8")
    }];
    for (const file of media) {
      entries.push({
        path: file.path,
        mode: "100644",
        type: "blob",
        sha: await this.github.createBlob(encodeBase64(file.bytes), "base64")
      });
    }
    return entries;
  }
  /**
   * The entries currently under review.
   *
   * Pull requests outside the `cms/` namespace, and ones naming a
   * collection this deployment does not have, are skipped: a repository
   * is not only edited by this tool, and a config that has dropped a
   * collection should not start reporting entries nobody can open.
   */
  async listInFlight() {
    const entries = [];
    for (const pull of await this.github.listPulls()) {
      const named = entryForBranch(pull.head.ref);
      if (!named) {
        continue;
      }
      const collection = findCollection(this.config, named.collection);
      if (!collection) {
        continue;
      }
      entries.push({
        collection: named.collection,
        slug: named.slug,
        path: entryPath(collection, named.slug),
        pull
      });
    }
    return entries;
  }
}
class NothingToSaveError extends Error {
  constructor(collection, slug) {
    super(`${collection}/${slug} is unchanged, so there is nothing to open a pull request for`);
    this.name = "NothingToSaveError";
    this.collection = collection;
    this.slug = slug;
  }
}
class EntryExistsError extends Error {
  constructor(collection, slug, path) {
    super(`${path} already exists, so ${collection}/${slug} cannot be created`);
    this.name = "EntryExistsError";
    this.collection = collection;
    this.slug = slug;
    this.path = path;
  }
}
class EntryMissingError extends Error {
  constructor(collection, slug, path) {
    super(`${path} does not exist, so ${collection}/${slug} cannot be deleted`);
    this.name = "EntryMissingError";
    this.collection = collection;
    this.slug = slug;
    this.path = path;
  }
}
class NotAuthenticatedError extends Error {
  constructor(message = "no GitHub token was given") {
    super(message);
    this.name = "NotAuthenticatedError";
  }
}
class PatAuthAdapter {
  constructor(options) {
    this.ask = options.prompt;
    this.key = options.key ?? TOKEN_KEY;
    this.storage = options.storage ?? sessionStorageOrMemory();
  }
  currentToken() {
    try {
      return this.storage.getItem(this.key);
    } catch {
      return null;
    }
  }
  /**
   * What crosses to the site's own page.
   *
   * `currentToken()` rather than a second read of storage, so a
   * storage that has started refusing answers the same way here as it
   * does everywhere else -- and so the two can never disagree about
   * whether this tab is signed in.
   */
  handoff() {
    const held = this.currentToken();
    return held === null ? null : { key: this.key, value: held };
  }
  async authenticate() {
    const held = this.currentToken();
    if (held) {
      return { token: held };
    }
    const given = (this.ask ? await this.ask() ?? "" : "").trim();
    if (!given) {
      throw new NotAuthenticatedError();
    }
    this.remember(given);
    return { token: given };
  }
  async logout() {
    try {
      this.storage.removeItem(this.key);
    } catch {
      this.storage = memoryStorage();
    }
  }
  remember(token) {
    try {
      this.storage.setItem(this.key, token);
    } catch {
      const memory = memoryStorage();
      memory.setItem(this.key, token);
      this.storage = memory;
    }
  }
}
const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const APP_FLOW_KEY = "content-tools:github-app-flow";
const EXPIRY_SKEW_MS = 6e4;
class RedirectingError extends Error {
  constructor() {
    super("This page will come back once you have signed in with GitHub.");
    this.name = "RedirectingError";
  }
}
class SignInError extends Error {
  constructor(message) {
    super(message);
    this.name = "SignInError";
  }
}
class GitHubAppAuthAdapter {
  constructor(options) {
    this.gate = {
      label: "Sign in with GitHub",
      note: "You will be taken to GitHub to authorise this site, and brought back here. A session lasts about eight hours; after that, sign in again."
    };
    this.options = options;
    this.storage = options.storage ?? sessionStorageOrMemory();
  }
  currentToken() {
    const held = this.read(APP_TOKEN_KEY);
    if (!held) {
      return null;
    }
    if (held.expiresAt !== null && this.clock() + EXPIRY_SKEW_MS >= held.expiresAt) {
      return null;
    }
    return held.token;
  }
  /**
   * What crosses to the site's own page.
   *
   * The STORED shape, expiry and all, rather than the bearer alone:
   * an App token lasts about eight hours and the page it lands on has
   * no way to renew one, so a bearer handed over without its expiry
   * would be a page that keeps sending a dead token and collecting
   * 401s instead of saying, once, that the session is over.
   *
   * `currentToken()` is what gates it, so a token THIS adapter would
   * refuse to use is not one it hands on. `held === null` after that
   * cannot happen -- it is the same read -- and is kept for the
   * narrowing, like the guard in `read` below.
   */
  handoff() {
    const held = this.read(APP_TOKEN_KEY);
    return held === null || this.currentToken() === null ? null : { key: APP_TOKEN_KEY, value: JSON.stringify(held) };
  }
  async authenticate() {
    const held = this.currentToken();
    if (held) {
      return { token: held };
    }
    const random = this.randomness();
    const state = base64url(random.getRandomValues(new Uint8Array(16)));
    const verifier = base64url(random.getRandomValues(new Uint8Array(32)));
    const challenge = await this.challengeFor(verifier, random);
    const here = this.currentHref();
    this.write(APP_FLOW_KEY, { state, verifier, hash: here.hash });
    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set("client_id", this.options.clientId);
    url.searchParams.set("redirect_uri", this.redirectUri());
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    (this.options.navigate ?? ((to) => location.assign(to)))(url.toString());
    throw new RedirectingError();
  }
  /**
   * Finish a flow this page was redirected back from.
   *
   * Called once at boot, before the shell loads a route, so a returning
   * author never sees the gate flash past.
   */
  async resume() {
    const here = this.currentHref();
    const code = here.searchParams.get("code");
    const returned = here.searchParams.get("state");
    const error = here.searchParams.get("error");
    if (!code && !error) {
      return;
    }
    const flow = this.read(APP_FLOW_KEY);
    this.forget(APP_FLOW_KEY);
    this.replace(`${here.origin}${here.pathname}${flow ? flow.hash : here.hash}`);
    if (error) {
      throw new SignInError(
        here.searchParams.get("error_description") ?? `GitHub refused the sign-in (${error}).`
      );
    }
    if (!flow) {
      throw new SignInError(
        "This sign-in could not be completed, because the browser no longer has the request that started it. Signing in again should work."
      );
    }
    if (returned !== flow.state) {
      throw new SignInError(
        "This sign-in did not match the one this tab started, so it was stopped. Signing in again should work."
      );
    }
    const body = new URLSearchParams({
      code,
      code_verifier: flow.verifier,
      redirect_uri: this.redirectUri()
    });
    const http = this.options.fetch ?? ((input, init) => fetch(input, init));
    let answer;
    try {
      answer = await http(this.options.proxy, {
        method: "POST",
        /* Form-encoded: a CORS-simple content type, so the browser
           sends no preflight and the proxy needs no OPTIONS
           branch. */
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: body.toString()
      });
    } catch (reason) {
      throw new SignInError(
        `The sign-in service at ${this.options.proxy} could not be reached (${reason.message}).`
      );
    }
    const result = await answer.json().catch(() => ({}));
    if (!result.token) {
      throw new SignInError(
        result.error_description ?? `The sign-in service answered ${answer.status}.`
      );
    }
    this.write(APP_TOKEN_KEY, {
      token: result.token,
      expiresAt: result.expires_in === void 0 ? null : this.clock() + result.expires_in * 1e3
    });
  }
  async logout() {
    this.forget(APP_TOKEN_KEY);
    this.forget(APP_FLOW_KEY);
  }
  // --- the seams, and the storage guards ---------------------------------
  clock() {
    return (this.options.now ?? Date.now)();
  }
  currentHref() {
    return new URL((this.options.href ?? (() => location.href))());
  }
  replace(url) {
    (this.options.replaceUrl ?? ((to) => history.replaceState(null, "", to)))(url);
  }
  redirectUri() {
    const here = this.currentHref();
    return `${here.origin}${here.pathname}`;
  }
  randomness() {
    const random = this.options.crypto ?? globalThis.crypto;
    if (!random || !random.subtle) {
      throw new SignInError(
        "Signing in needs a secure context. Serve this page over HTTPS (or from localhost) and try again."
      );
    }
    return random;
  }
  async challengeFor(verifier, random) {
    const digest = await random.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(verifier)
    );
    return base64url(new Uint8Array(digest));
  }
  read(key) {
    try {
      const raw = this.storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  write(key, value) {
    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch {
      const memory = memoryStorage();
      memory.setItem(key, JSON.stringify(value));
      this.storage = memory;
    }
  }
  forget(key) {
    try {
      this.storage.removeItem(key);
    } catch {
      this.storage = memoryStorage();
    }
  }
}
function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function adapterFor(config, options = {}) {
  const auth = config.backend.auth;
  if (auth.kind !== "github-app") {
    return new PatAuthAdapter({ prompt: options.prompt });
  }
  return new GitHubAppAuthAdapter({
    clientId: auth.clientId,
    proxy: auth.proxy,
    fetch: options.fetch
  });
}
const NOTHING_TO_SAVE = {
  title: "Nothing to save.",
  detail: "This entry already matches what the repository holds, so no commit was made.",
  kind: "notice",
  path: ""
};
function describeError(error) {
  const name = readString(error, "name");
  const message = readString(error, "message");
  const status = readNumber(error, "status");
  if (name === "ConfigError") {
    const path = readString(error, "path");
    return {
      title: "This deployment is misconfigured.",
      // The message already reads `${path}: ${message}`, so rendering
      // both would print the path twice.
      detail: withoutPrefix(message, `${path}: `),
      kind: "config",
      path
    };
  }
  if (name === "NothingToSaveError") {
    return NOTHING_TO_SAVE;
  }
  if (name === "EntryExistsError") {
    return {
      title: "There is already an entry with that name.",
      detail: `${readString(error, "path")} exists, either on the site or in a pull request waiting for review. Choose a different name.`,
      kind: "notice",
      path: ""
    };
  }
  if (name === "EntryMissingError") {
    return {
      title: "That entry is already gone.",
      detail: `${readString(error, "path")} is not in the repository, so there is nothing to delete.`,
      kind: "notice",
      path: ""
    };
  }
  if (name === "ConflictError") {
    return {
      title: "Somebody else changed this entry while it was open.",
      detail: "Nothing was written, and nothing of theirs was lost. Reload the entry to get their version; what this save would have written is below, to copy from.",
      kind: "conflict",
      path: ""
    };
  }
  if (name === "RedirectingError") {
    return {
      title: "Taking you to GitHub.",
      detail: message,
      kind: "notice",
      path: ""
    };
  }
  if (name === "SignInError") {
    return {
      title: "That sign-in did not finish.",
      detail: message,
      kind: "unauthorized",
      path: ""
    };
  }
  if (name === "NotAuthenticatedError") {
    return { title: "No token was given.", detail: message, kind: "unauthorized", path: "" };
  }
  if (name.endsWith("GitHubError") || status !== null) {
    const where = `${readString(error, "method")} ${readString(error, "path")}`.trim();
    if (status === 401) {
      return {
        title: "GitHub rejected that token.",
        detail: "It may have expired or been revoked. Signing in again with a new one is the fix.",
        kind: "unauthorized",
        path: ""
      };
    }
    if (status === 403 || status === 404) {
      return {
        title: "That token cannot reach this repository.",
        detail: `${where} was refused (${status}). Check the token is scoped to this repository and grants Contents and Pull requests, both read and write.`,
        kind: "forbidden",
        path: ""
      };
    }
    return {
      title: `GitHub returned ${status ?? "an error"}.`,
      detail: message,
      kind: "github",
      path: ""
    };
  }
  if (name === "TypeError") {
    return { title: "Could not reach GitHub.", detail: message, kind: "offline", path: "" };
  }
  if (name) {
    return { title: "Something went wrong.", detail: `${name}: ${message}`, kind: "unknown", path: "" };
  }
  return { title: "Something went wrong.", detail: String(error), kind: "unknown", path: "" };
}
function cannotPush(repo) {
  return {
    title: `This token cannot write to ${repo}.`,
    detail: "It needs Contents and Pull requests set to read and write, not read-only.",
    kind: "forbidden",
    path: ""
  };
}
function deletedNotice(pull) {
  return {
    title: `Deletion opened as pull request #${pull}.`,
    detail: "The entry stays on the site, and in this list, until somebody reviews and merges that pull request.",
    kind: "notice",
    path: ""
  };
}
function fieldsNeeded(messages) {
  return {
    title: messages.length === 1 ? "One field needs filling in." : `${messages.length} fields need filling in.`,
    detail: messages.join(" "),
    kind: "notice",
    path: ""
  };
}
function readString(error, key) {
  const value = error == null ? void 0 : error[key];
  return typeof value === "string" ? value : "";
}
function readNumber(error, key) {
  const value = error == null ? void 0 : error[key];
  return typeof value === "number" ? value : null;
}
function withoutPrefix(text, prefix) {
  return prefix.length > 2 && text.startsWith(prefix) ? text.slice(prefix.length) : text;
}
function h(doc, tag, props = {}, children = []) {
  const el = doc.createElement(tag);
  apply(el, props);
  for (const child of children) {
    if (child === null || child === void 0 || child === false) {
      continue;
    }
    el.appendChild(typeof child === "object" ? child : doc.createTextNode(String(child)));
  }
  return el;
}
function apply(el, props) {
  for (const [name, value] of Object.entries(props)) {
    if (typeof value === "function") {
      el[name] = value;
    } else if (name === "text") {
      el.textContent = String(value);
    } else if (value === false || value === null || value === void 0) {
      el.removeAttribute(name);
    } else {
      el.setAttribute(name, String(value));
    }
  }
}
function list(parent, items, key, make, update) {
  const existing = /* @__PURE__ */ new Map();
  for (const child of [...parent.children]) {
    const k = child.getAttribute("data-key");
    if (k !== null) {
      existing.set(k, child);
    }
  }
  let previous = null;
  for (const item of items) {
    const k = key(item);
    let el = existing.get(k);
    if (el) {
      existing.delete(k);
    } else {
      el = make(item);
      el.setAttribute("data-key", k);
    }
    if (update) {
      update(el, item);
    }
    const before = previous ? previous.nextSibling : parent.firstChild;
    if (el !== before) {
      parent.insertBefore(el, before);
    }
    previous = el;
  }
  for (const el of existing.values()) {
    el.remove();
  }
}
const UNKNOWN_WIDGET = "unknown";
function wasSet(value) {
  return value !== void 0;
}
function fieldRow(doc, field, control, extra = []) {
  const id = `ct-field-${field.name}`;
  control.setAttribute("id", id);
  if (field.required) {
    control.setAttribute("required", "required");
  }
  const error = h(doc, "p", { class: "ct-field__error", role: "alert" });
  error.hidden = true;
  const node = h(doc, "div", { class: "ct-field" }, [
    h(
      doc,
      "label",
      { class: "ct-field__label", for: id },
      [field.required ? `${field.label} *` : field.label]
    ),
    control,
    ...extra,
    error
  ]);
  return { node, error };
}
function requireFilled(field, empty) {
  return field.required && empty ? `${field.label} is required.` : null;
}
function textLike(tag, type) {
  return (doc, field, value) => {
    const props = { class: "ct-field__input" };
    if (type) {
      props.type = type;
    }
    const control = h(doc, tag, props);
    const had = wasSet(value);
    control.value = had && value !== null ? String(value) : "";
    const { node, error } = fieldRow(doc, field, control);
    return {
      node,
      value: () => control.value === "" && !had ? void 0 : control.value,
      validate: () => show(error, requireFilled(field, control.value === ""))
    };
  };
}
function show(error, message) {
  error.textContent = message ?? "";
  error.hidden = message === null;
  return message;
}
const stringWidget = textLike("input", "text");
const textWidget = textLike("textarea");
const numberWidget = (doc, field, value) => {
  const control = h(
    doc,
    "input",
    { class: "ct-field__input", type: "number" }
  );
  const had = wasSet(value);
  const shown = typeof value === "number";
  control.value = shown ? String(value) : "";
  const { node, error } = fieldRow(doc, field, control);
  return {
    node,
    /* `null`, not `''`, for a cleared number. `count: ''` is a string
       where the site's templates expect arithmetic, and YAML will
       happily store it. */
    value: () => {
      if (control.value === "") {
        return had && shown ? null : void 0;
      }
      return control.valueAsNumber;
    },
    validate: () => show(error, control.validity.badInput ? `${field.label} must be a number.` : requireFilled(field, control.value === ""))
  };
};
const booleanWidget = (doc, field, value) => {
  const control = h(
    doc,
    "input",
    { class: "ct-field__check", type: "checkbox" }
  );
  const had = wasSet(value);
  control.checked = value === true;
  const { node } = fieldRow(doc, field, control);
  return {
    node,
    /* A checkbox has no empty state, so an absent key that is still
       unticked is the ONLY thing that can mean "not set". Anything
       else is a deliberate false, which `draft: false` says out loud
       and an absent key does not. */
    value: () => !had && !control.checked ? void 0 : control.checked,
    // Nothing to require: a checkbox always has an answer.
    validate: () => null
  };
};
function dateLike(type) {
  return (doc, field, value) => {
    const control = h(
      doc,
      "input",
      { class: "ct-field__input", type }
    );
    const had = wasSet(value);
    control.value = textOfDate(value, type);
    const shown = control.value !== "";
    const { node, error } = fieldRow(doc, field, control);
    return {
      node,
      /* The control's own text, never a `Date`. `date` and
         `datetime` are two widgets rather than one for exactly
         this: writing `2024-01-02T00:00:00.000Z` where the file
         said `2024-01-02` changes what the file means, and turns
         a one-word edit into a diff nobody can read. */
      value: () => {
        if (control.value === "") {
          return had && shown ? null : void 0;
        }
        return control.value;
      },
      validate: () => show(error, control.validity.badInput ? `${field.label} must be a ${type === "date" ? "date" : "date and time"}.` : requireFilled(field, control.value === ""))
    };
  };
}
function textOfDate(value, type) {
  const iso = value instanceof Date ? value.toISOString() : typeof value === "string" ? value : "";
  if (iso === "") {
    return "";
  }
  return type === "date" ? iso.slice(0, 10) : iso.slice(0, 16);
}
const selectWidget = (doc, field, value) => {
  const control = h(doc, "select", { class: "ct-field__input" });
  const had = wasSet(value);
  if (!had) {
    control.appendChild(h(doc, "option", { value: "" }, ["—"]));
  }
  for (const option of field.options) {
    control.appendChild(h(doc, "option", { value: option.value }, [option.label]));
  }
  control.value = typeof value === "string" ? value : "";
  const { node, error } = fieldRow(doc, field, control);
  return {
    node,
    value: () => control.value === "" && !had ? void 0 : control.value,
    validate: () => show(error, requireFilled(field, control.value === ""))
  };
};
const listWidget = (doc, field, value) => {
  const control = h(
    doc,
    "textarea",
    { class: "ct-field__input" }
  );
  const had = wasSet(value);
  control.value = Array.isArray(value) ? value.join("\n") : "";
  const hint = h(doc, "p", { class: "ct-field__hint" }, ["One per line."]);
  const { node, error } = fieldRow(doc, field, control, [hint]);
  const lines = () => control.value.split("\n").map((line) => line.trim()).filter((line) => line !== "");
  return {
    node,
    /* Blank lines dropped and each entry trimmed, because the
       separator is a newline and a trailing one is how every
       textarea ends. An empty list that WAS a list stays `[]`: the
       tags were removed, which is not the same as never having had
       any. */
    value: () => {
      const out = lines();
      return out.length === 0 && !had ? void 0 : out;
    },
    validate: () => show(error, requireFilled(field, lines().length === 0))
  };
};
const imageWidget = (doc, field, value) => {
  const control = h(
    doc,
    "input",
    { class: "ct-field__input", type: "text" }
  );
  const had = wasSet(value);
  control.value = had && value !== null ? String(value) : "";
  const preview = h(doc, "img", { class: "ct-field__preview", alt: "" });
  const paint = () => {
    preview.hidden = control.value === "";
    if (control.value !== "") {
      preview.setAttribute("src", control.value);
    }
  };
  control.addEventListener("input", paint);
  const { node, error } = fieldRow(doc, field, control, [preview]);
  paint();
  return {
    node,
    value: () => control.value === "" && !had ? void 0 : control.value,
    validate: () => show(error, requireFilled(field, control.value === ""))
  };
};
const unknownWidget = (doc, field, value) => {
  const control = h(doc, "input", {
    class: "ct-field__input",
    type: "text",
    readonly: "readonly"
  });
  control.value = value === void 0 || value === null ? "" : JSON.stringify(value);
  const note = h(
    doc,
    "p",
    { class: "ct-field__hint" },
    [`No widget called "${field.widget}". Shown as stored, and left alone.`]
  );
  const { node } = fieldRow(doc, field, control, [note]);
  return {
    node,
    // Untouched, whatever it is. The key passes straight through.
    value: () => void 0,
    /* Not an error, and deliberately not required-checked: the person
       in front of it cannot fix either, and a form they cannot submit
       would stop them saving the body too. */
    validate: () => null
  };
};
const DEFAULT_WIDGETS = Object.freeze({
  "string": stringWidget,
  "text": textWidget,
  "number": numberWidget,
  "boolean": booleanWidget,
  "date": dateLike("date"),
  "datetime": dateLike("datetime-local"),
  "select": selectWidget,
  "list": listWidget,
  "image": imageWidget,
  [UNKNOWN_WIDGET]: unknownWidget
});
function buildWidget(doc, field, value, registry = DEFAULT_WIDGETS) {
  const make = registry[field.widget] ?? registry[UNKNOWN_WIDGET] ?? unknownWidget;
  return make(doc, field, value);
}
function fieldDefaults(fields) {
  const out = {};
  for (const field of fields) {
    if (field.default !== void 0) {
      out[field.name] = field.default;
    }
  }
  return out;
}
function isMergeable(data) {
  return data === null || data === void 0 || isPlainObject(data);
}
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
}
function mergeFrontmatter(data, values) {
  const out = isPlainObject(data) ? { ...data } : {};
  for (const [name, value] of Object.entries(values)) {
    if (value !== void 0) {
      out[name] = value;
    }
  }
  return out;
}
function frontmatterChanged(data, merged) {
  if (!isPlainObject(data)) {
    return Object.keys(merged).length > 0;
  }
  return !sameValue(data, merged);
}
function sameValue(a, b) {
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => sameValue(item, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((key) => sameValue(a[key], b[key]));
  }
  return a === b;
}
const NOT_A_MAPPING = "This entry’s frontmatter is not a set of keys, so it cannot be edited here. It will be saved exactly as it is.";
const UNREADABLE = "This entry’s frontmatter could not be read as YAML, so it cannot be edited here. It will be saved exactly as it is, for you to fix in the repository.";
function formState(collection, slug, doc) {
  const front = doc.frontmatter();
  const data = front ? front.data : null;
  let refusal = null;
  if (front && !front.valid) {
    refusal = UNREADABLE;
  } else if (!isMergeable(data)) {
    refusal = NOT_A_MAPPING;
  }
  return {
    /* What tells the form one entry from the next -- and NOT the
       `Entry` object, because a save replaces that with a copy
       re-pinned to the new commit, and keying on it would rebuild
       every control under whoever was typing on every press of
       Submit. */
    key: `${collection.name}/${slug}`,
    fields: fieldsFor(collection, slug),
    data,
    refusal
  };
}
function buildFields(doc, registry = () => DEFAULT_WIDGETS) {
  const rows = h(doc, "div", { class: "ct-fields__rows" });
  const note = h(doc, "p", { class: "ct-fields__note" });
  const node = h(doc, "section", { class: "ct-fields" }, [
    h(doc, "h3", { class: "ct-fields__heading" }, ["Details"]),
    note,
    rows
  ]);
  let built = null;
  let widgets = [];
  let usable = false;
  function rebuild(state) {
    widgets = [];
    rows.replaceChildren();
    usable = state.refusal === null;
    note.textContent = state.refusal ?? "";
    if (!usable) {
      return;
    }
    const held = state.data ?? {};
    for (const field of state.fields) {
      const widget = buildWidget(doc, field, held[field.name], registry());
      widgets.push({ field, widget });
      rows.appendChild(widget.node);
    }
  }
  return {
    node,
    update(state) {
      const empty = state === null || state.fields.length === 0 && state.refusal === null;
      node.hidden = empty;
      if (empty) {
        built = null;
        usable = false;
        widgets = [];
        rows.replaceChildren();
        return;
      }
      if (state.key !== built) {
        built = state.key;
        rebuild(state);
      }
    },
    values() {
      if (!usable) {
        return null;
      }
      const out = {};
      for (const { field, widget } of widgets) {
        out[field.name] = widget.value();
      }
      return out;
    },
    errors() {
      return widgets.map(({ widget }) => widget.validate()).filter((message) => message !== null);
    }
  };
}
function pagePath(config, collection, slug) {
  var _a;
  const template = collection.kind === "file" ? ((_a = collection.files.find((f) => f.name === slug)) == null ? void 0 : _a.page) ?? null : collection.page;
  if (template === null) {
    return null;
  }
  return `${config.site.base}${expandTokens(template, { slug })}`;
}
function previewOrigin(config, pull) {
  const template = config.site.preview;
  return template === null ? null : expandTokens(template, { pr: String(pull) });
}
function editUrl(config, collection, slug, pull) {
  const path = pagePath(config, collection, slug);
  if (path === null) {
    return null;
  }
  const origin = pull === null ? null : previewOrigin(config, pull);
  return origin === null ? path : `${origin}${path}`;
}
function editUrlIsStale(config, pull) {
  return pull !== null && config.site.preview === null;
}
function entryForUrl(config, url) {
  const path = pathOf(url, config.site.base);
  if (path === null) {
    return null;
  }
  for (const collection of config.collections) {
    if (collection.kind === "file") {
      const file = collection.files.find(
        (f) => f.page !== null && canonical(f.page) === path
      );
      if (file) {
        return { collection: collection.name, slug: file.name };
      }
      continue;
    }
    const slug = collection.page === null ? null : matchPage(collection.page, path);
    if (slug !== null) {
      return { collection: collection.name, slug };
    }
  }
  return null;
}
function declaredEntry(config, doc) {
  var _a, _b;
  const content = (_b = (_a = doc.querySelector('meta[name="cms:entry"]')) == null ? void 0 : _a.getAttribute("content")) == null ? void 0 : _b.trim();
  if (!content) {
    return null;
  }
  const at = content.indexOf("/");
  const name = at === -1 ? "" : content.slice(0, at);
  const slug = at === -1 ? "" : content.slice(at + 1);
  if (name === "" || slug === "" || slug.includes("/")) {
    return null;
  }
  return findCollection(config, name) === null ? null : { collection: name, slug };
}
function bodySelector(collection, doc) {
  return doc.querySelector("[data-cms-body]") ? "[data-cms-body]" : collection.body;
}
function pathOf(url, base) {
  let path;
  try {
    path = new URL(url, "http://localhost").pathname;
  } catch {
    return null;
  }
  if (base !== "" && (path === base || path.startsWith(`${base}/`))) {
    path = path.slice(base.length);
  }
  path = path.replace(/\/index\.html$/, "/");
  try {
    path = decodeURIComponent(path);
  } catch {
    return null;
  }
  return canonical(path);
}
function canonical(path) {
  const rooted = path.startsWith("/") ? path : `/${path}`;
  return rooted.replace(/\/+$/, "");
}
function matchPage(template, path) {
  const pattern = canonical(template).split("{{slug}}").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("([^/]+)");
  const found = new RegExp(`^${pattern}$`).exec(path);
  if (!found) {
    return null;
  }
  const slugs = found.slice(1);
  return slugs.every((slug) => slug === slugs[0]) ? slugs[0] : null;
}
function safeFilename(filename) {
  const at = filename.lastIndexOf(".");
  const stem = at > 0 ? filename.slice(0, at) : filename;
  const extension = at > 0 ? filename.slice(at + 1) : "";
  const safe = slugify(stem) || "file";
  const suffix = slugify(extension);
  return suffix ? `${safe}.${suffix}` : safe;
}
const IMAGE_TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  /* Safe in an `<img>`, which is the only place the shell puts it:
     script and external references inside an SVG are inert there, in
     every engine. It would NOT be safe inlined into the page, and
     nothing does that. */
  svg: "image/svg+xml"
};
function imageType(filename) {
  const at = filename.lastIndexOf(".");
  if (at <= 0) {
    return null;
  }
  return IMAGE_TYPES[filename.slice(at + 1).toLowerCase()] ?? null;
}
class MediaStore {
  constructor(options) {
    this.files = [];
    this.config = options.config;
    this.taken = new Set(options.taken ?? []);
  }
  /** Everything staged, whether or not the content still references it. */
  staged() {
    return this.files;
  }
  /**
   * Hold a file against the URL the editor is showing for it.
   *
   * Returns the record rather than nothing, because the caller has to
   * know the name that survived collision resolution to show it.
   */
  stage(file) {
    const filename = this.unique(safeFilename(file.filename));
    this.taken.add(filename);
    const staged = {
      token: file.token,
      filename,
      path: mediaPath(this.config, filename),
      url: mediaURL(this.config, filename),
      bytes: file.bytes
    };
    this.files.push(staged);
    return staged;
  }
  /**
   * Swap every staged URL in `html` for the one the file will have, and
   * report the files that HTML still references.
   *
   * Both answers come from one pass on purpose. Two calls -- rewrite the
   * HTML, then ask separately what to commit -- can disagree, and the way
   * they disagree is an entry referencing an image that was never
   * committed. An image the user inserted and then deleted is simply not
   * in the list: it is staged, unreferenced, and never reaches the
   * repository.
   */
  rewrite(html) {
    let out = html;
    const media = [];
    for (const file of this.files) {
      if (!out.includes(file.token)) {
        continue;
      }
      out = out.split(file.token).join(file.url);
      media.push({ path: file.path, bytes: file.bytes });
    }
    return { html: out, media };
  }
  /** `name.png` → `name-1.png`, until nothing holds the name. */
  unique(filename) {
    if (!this.taken.has(filename)) {
      return filename;
    }
    const at = filename.lastIndexOf(".");
    const stem = at > 0 ? filename.slice(0, at) : filename;
    const extension = at > 0 ? filename.slice(at) : "";
    for (let n = 1; ; n += 1) {
      const candidate = `${stem}-${n}${extension}`;
      if (!this.taken.has(candidate)) {
        return candidate;
      }
    }
  }
}
function mediaUploader(options) {
  const store = options.store;
  const makeURL = options.createObjectURL ?? ((blob) => URL.createObjectURL(blob));
  const measure = options.measure ?? measureImage;
  return function attach(dialog) {
    let staged = null;
    let size = [0, 0];
    dialog.addEventListener("imageuploader.fileready", (ev) => accept(ev.detail().file));
    dialog.addEventListener("imageuploader.clear", () => dialog.clear());
    dialog.addEventListener("imageuploader.cancelupload", () => {
      dialog.state("empty");
    });
    dialog.addEventListener("imageuploader.save", () => {
      if (staged) {
        dialog.save(staged.token, size, { alt: staged.filename });
      }
    });
    async function accept(file) {
      dialog.progress(0);
      dialog.state("uploading");
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const token = makeURL(new Blob([bytes], { type: file.type }));
        size = await measure(token);
        staged = store.stage({ token, filename: file.name, bytes });
        dialog.populate(token, size);
      } catch (error) {
        dialog.clear();
        console.error("content-tools: could not read that image", error);
      }
    }
  };
}
function measureImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve([image.naturalWidth, image.naturalHeight]);
    image.onerror = () => reject(new Error(`could not read ${url} as an image`));
    image.src = url;
  });
}
const REGION = "body";
class EntrySession {
  constructor(options) {
    this.entry = options.entry;
    this.doc = options.doc;
    this._values = options.values;
  }
  /**
   * Exactly what a save would write, and the media that must travel
   * with it.
   *
   * ONE method, because the dirty check and the submit both need this
   * answer and two spellings of it can disagree -- which they would do
   * by holding a navigation over work that a save then reports as
   * unchanged, or worse by letting one go that a save would have
   * written.
   *
   * Nothing to write means the SOURCE, unchanged: a screen with no
   * editor cannot have touched the body, so the file it would save is
   * the file it read. `updateFrontmatter` keeps that true on the other
   * branch too -- see its own header for why the body is not put
   * through the walker to get there.
   *
   * No media travels from here. Staging an upload needs an image
   * dialog, which needs an editor; `EditingSession` is where that
   * happens and where this is overridden.
   */
  pending() {
    const merged = this.merged();
    return {
      content: merged === null ? this.doc.source() : this.doc.updateFrontmatter(merged),
      media: []
    };
  }
  /**
   * Whether there is work that a save would write.
   *
   * The MARKDOWN decides, not the form's own idea of having been
   * typed into. Somebody who clears a field and types it back has
   * touched the form without changing the file, and a leave panel
   * that appears every time is a leave panel people click through.
   *
   * Compared against `content` RAW, null and all, which is what
   * makes a FRESH entry read as work from the moment it is named:
   * there is no file at its path, and no string equals null. The old
   * spelling read `?? ''` here, so a just-named entry nobody had
   * typed into was nothing to lose -- and it is the one thing on that
   * screen that is. The filename is what a create route exists to
   * decide, it is the one thing about an entry nobody can change
   * afterwards without breaking its URL, and leaving without
   * submitting throws it away.
   *
   * Only the LEAVE question turns on this, and that is worth knowing
   * before changing it: `_submit` never asks, it hands the pending
   * bytes to the repository and lets a create be a create. So the
   * test that can tell the two spellings apart is a navigation away
   * from an untouched new entry, and nothing else in the shell can.
   *
   * An explicit `content === null ||` was written beside this and
   * deleted: it says the same thing the comparison already says, and
   * no test could tell those two apart at all.
   */
  dirty() {
    return this.pending().content !== this.entry.content;
  }
  /**
   * Commit what this session holds, and open or update the pull
   * request.
   *
   * The open `MarkdownDocument` is NEVER re-parsed afterwards, and that
   * is the subtlest rule here. Re-parsing the string just written would
   * renumber the blocks while a live DOM still carries the old
   * `data-ct-md` indices, so the next save would splice against the
   * wrong originals -- content corruption inside a diff that looks
   * perfectly reviewable. It stays correct because `parent` pins the
   * commit this edit was read at: the branch is what we read plus our
   * own change, or it is a `ConflictError`.
   *
   * Takes the `Pending` rather than computing it, so the caller still
   * holds the markdown when this throws. A conflict is the one failure
   * where the person's work is in hand and the only way forward throws
   * it away, and offering them the reload without showing them what
   * they wrote is data loss with a button on it.
   */
  async commit(repo, pending) {
    const entry = this.entry;
    const fresh = entry.content === null;
    const result = await repo.saveEntry(entry.collection, entry.slug, {
      content: pending.content,
      media: pending.media,
      parent: entry.commit,
      /* Asked for, not inferred. The caller checked this before
         opening the entry; this is the check that settles the
         race the first one cannot -- two authors who both passed
         it and are both now pressing Submit. Without it the second
         one's post is committed onto the first one's pull
         request. */
      create: fresh,
      message: `${fresh ? "Create" : "Update"} ${entry.path}`
    });
    this.entry = {
      ...entry,
      content: pending.content,
      commit: result.commit ?? entry.commit,
      pull: result.pull
    };
    return result;
  }
  /**
   * What the frontmatter should become, or null when it should be
   * left exactly as it is.
   *
   * Null is not "no frontmatter": it is the instruction to preserve the
   * original block BYTE FOR BYTE, which a YAML round trip would not --
   * key order, comments and quoting style all go. So a save that
   * touched nothing in the form has to reach the document without any
   * data at all, and this is the line that decides it.
   */
  merged() {
    var _a;
    const values = this._values();
    if (values === null) {
      return null;
    }
    const data = ((_a = this.doc.frontmatter()) == null ? void 0 : _a.data) ?? null;
    const merged = mergeFrontmatter(data, values);
    return frontmatterChanged(data, merged) ? merged : null;
  }
}
export {
  DIRECTORY_LIMIT as A,
  cannotPush as B,
  CmsRepo as C,
  DEFAULT_WIDGETS as D,
  EntrySession as E,
  MediaStore as M,
  NOTHING_TO_SAVE as N,
  PatAuthAdapter as P,
  REGION as R,
  STATUSES as S,
  declaredEntry as a,
  buildFields as b,
  adapterFor as c,
  describeError as d,
  entryForUrl as e,
  fieldsNeeded as f,
  formState as g,
  h,
  findCollection as i,
  ConfigError as j,
  bodySelector as k,
  loadConfig as l,
  mediaUploader as m,
  slugify as n,
  entryPath as o,
  expandSlug as p,
  list as q,
  editUrl as r,
  statusOf as s,
  editUrlIsStale as t,
  imageType as u,
  mediaURL as v,
  EntryExistsError as w,
  fieldsFor as x,
  fieldDefaults as y,
  deletedNotice as z
};
