import { l as layered, s as sheetFactory, T as TAG_NAME$1, C as ContentToolsEditor } from "./chunks/content-tools-editor-CHkxDF7I.js";
import { M as MarkdownDocument } from "./chunks/index-VRdDdMz1.js";
import { C as ContentTools, a as ContentEdit } from "./chunks/remove-7_L_-H_j.js";
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
function slugTemplate(raw, path) {
  const template = optionalStr(raw, path, DEFAULT_SLUG);
  if (template.includes("/")) {
    throw new ConfigError(
      path,
      `"${template}" contains "/"; a slug names one file, not a path`
    );
  }
  const used = /* @__PURE__ */ new Set();
  for (const [, name] of template.matchAll(SLUG_TOKEN)) {
    const token = name.trim();
    if (!SLUG_TOKENS.includes(token)) {
      throw new ConfigError(
        path,
        `"{{${name}}}" is not a slug token; expected one of ` + SLUG_TOKENS.map((t) => `{{${t}}}`).join(", ")
      );
    }
    used.add(token);
  }
  const rest = template.replace(SLUG_TOKEN, "");
  if (/[{}]/.test(rest)) {
    throw new ConfigError(
      path,
      `"${template}" has a brace that is not part of a token; a token is written {{slug}}`
    );
  }
  if (!used.has("slug")) {
    throw new ConfigError(
      path,
      `"${template}" has no {{slug}}, so every new entry would be named the same`
    );
  }
  return template;
}
function parseCollection(raw, path) {
  const input = object(raw, path);
  const name = str(input.name, `${path}.name`);
  const label = optionalStr(input.label, `${path}.label`, name);
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
        fields: Object.freeze(parseFields(file.fields, `${at}.fields`))
      });
    });
    if (files.length === 0) {
      throw new ConfigError(`${path}.files`, "is empty");
    }
    return Object.freeze({ kind: "file", name, label, files: Object.freeze(files) });
  }
  return Object.freeze({
    kind: "folder",
    name,
    label,
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
    const { parse } = await import("./chunks/index-VRdDdMz1.js").then((n) => n.a);
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
  return collection.slug.replace(SLUG_TOKEN, (_, name) => values[name.trim()]);
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
function memoryStorage() {
  const held = /* @__PURE__ */ new Map();
  return {
    getItem: (key) => held.get(key) ?? null,
    setItem: (key, value) => void held.set(key, value),
    removeItem: (key) => void held.delete(key)
  };
}
function sessionStorageOrMemory() {
  try {
    return globalThis.sessionStorage;
  } catch {
    return memoryStorage();
  }
}
const TOKEN_KEY = "content-tools:github-token";
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
  async authenticate() {
    const held = this.currentToken();
    if (held) {
      return { token: held };
    }
    const given = (await this.ask() ?? "").trim();
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
const APP_TOKEN_KEY = "content-tools:github-app-token";
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
const shellCSS = '/**\n * Local replacements for the handful of Bourbon mixins this project used.\n *\n * Bourbon existed here only to emit vendor prefixes for transform, transition,\n * animation, @keyframes, box-sizing, user-select and hyphens. All of those are\n * unprefixed standards in every browser this library targets, so the mixins are\n * gone and the properties are written directly -- except where a prefix is still\n * genuinely required (see `user-select` and `hyphens` below).\n */\n/**\n * The one Bourbon *variable* this project used, inlined verbatim from\n * bourbon/addons/_font-family.scss so the `pre` styling is unchanged.\n */\n/**\n * Contain floats. The one Bourbon mixin worth keeping as a mixin, since it\n * expands to a pseudo-element rather than a single declaration.\n */\n/**\n * Safari still requires -webkit-user-select; the -moz- and -ms- forms are long\n * obsolete and are not emitted.\n */\n/**\n * Safari still requires -webkit-hyphens.\n */\n/**\n * All widgets are assigned a z-index equal to or higher than this setting. The\n * base z-index can be adjusted to overcome z-index conflicts with existing page\n * elements.\n */\n/**\n * For UI widgets that appear on the page (as opposed to appearing in front of a\n * modal screen) we define a base background colour.\n */\n/**\n * The colour used when casting shadows for widgets that appear to float.\n */\n/**\n * Confirm, Cancel and Edit actions are common amoung the various ui components.\n * Each action has an associated/common colour.\n */\n/**\n * Tooltips feature for a number of components, their base appearance is\n * configured using a mixin.\n */\n/**\n * The following settings relate to typography. For portability we limit the the\n * use of fonts to:\n *\n * - `type-icon` used for displaying icons (courtesy of http://icomoon.io).\n * - `type-text` used for displaying text.\n *\n */\n:host {\n  display: block;\n}\n\n.ct-cms {\n  background: white;\n  box-sizing: border-box;\n  color: #646464;\n  display: flex;\n  flex-direction: column;\n  min-height: 100%;\n  font-family: arial, sans-serif;\n  font-size: 14px;\n  line-height: 18px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n.ct-cms *, .ct-cms *:before, .ct-cms *:after {\n  box-sizing: border-box;\n}\n\n.ct-cms__header {\n  align-items: baseline;\n  background: #e9e9e9;\n  border-bottom: 1px solid #d0d0d0;\n  display: flex;\n  gap: 12px;\n  padding: 8px 12px;\n}\n\n.ct-cms__title {\n  font-family: arial, sans-serif;\n  font-size: 14px;\n  line-height: 20px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  font-weight: bold;\n  margin: 0;\n}\n\n.ct-cms__repo {\n  font-family: arial, sans-serif;\n  font-size: 12px;\n  line-height: 20px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  color: #646464;\n}\n\n.ct-cms__spacer {\n  flex: 1 1 auto;\n}\n\n.ct-cms__body {\n  display: flex;\n  flex: 1 1 auto;\n  min-height: 0;\n}\n\n.ct-cms__nav {\n  background: #f7f7f7;\n  border-right: 1px solid #d0d0d0;\n  flex: 0 0 180px;\n  overflow-y: auto;\n  padding: 8px 0;\n}\n\n.ct-cms__nav-heading {\n  font-family: arial, sans-serif;\n  font-size: 11px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  color: #646464;\n  margin: 0;\n  padding: 4px 12px;\n  text-transform: uppercase;\n}\n\n.ct-cms__nav-list {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n}\n\n.ct-cms__nav-link {\n  color: #646464;\n  display: block;\n  padding: 5px 12px;\n  text-decoration: none;\n}\n.ct-cms__nav-link:hover {\n  background: rgb(91.862745098%, 91.862745098%, 91.862745098%);\n}\n.ct-cms__nav-link:focus-visible {\n  outline: 2px solid #2980b9;\n  outline-offset: -2px;\n}\n.ct-cms__nav-link--current {\n  background: white;\n  box-shadow: inset 3px 0 0 #f39c12;\n  font-weight: bold;\n}\n\n.ct-cms__main {\n  flex: 1 1 auto;\n  min-width: 0;\n  overflow-y: auto;\n  padding: 16px;\n}\n\n.ct-cms__heading {\n  font-family: arial, sans-serif;\n  font-size: 18px;\n  line-height: 24px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  margin: 0 0 12px;\n}\n\n.ct-cms__note {\n  color: #646464;\n}\n.ct-cms__note:empty {\n  display: none;\n}\n\n.ct-cms__entry-list {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n}\n\n.ct-cms__entry {\n  align-items: baseline;\n  border-bottom: 1px solid #d0d0d0;\n  display: flex;\n  gap: 8px;\n  padding: 6px 0;\n}\n\n.ct-cms__entry-link {\n  color: #2980b9;\n  flex: 1 1 auto;\n  min-width: 0;\n  overflow-wrap: anywhere;\n}\n\n.ct-cms__entry-marks {\n  align-items: baseline;\n  display: flex;\n  flex: 0 0 auto;\n  gap: 8px;\n}\n\n.ct-cms__badge {\n  background: #f7f7f7;\n  border: 1px solid #d0d0d0;\n  padding: 1px 6px;\n  font-family: arial, sans-serif;\n  font-size: 11px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  text-transform: uppercase;\n}\n\n.ct-cms__badge--unpublished {\n  background: rgb(98.9567682495%, 91.3933380581%, 79.396172927%);\n  border-color: rgb(97.2218284904%, 77.0800850461%, 45.131112686%);\n}\n\n.ct-cms__entry-pull {\n  color: #646464;\n  font-family: arial, sans-serif;\n  font-size: 11px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-cms__review-list {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n}\n\n.ct-cms__review {\n  align-items: baseline;\n  border-bottom: 1px solid #d0d0d0;\n  display: flex;\n  flex-wrap: wrap;\n  gap: 8px;\n  padding: 6px 0;\n}\n\n.ct-cms__review-link {\n  color: #2980b9;\n  min-width: 0;\n  overflow-wrap: anywhere;\n}\n\n.ct-cms__review-where {\n  color: #646464;\n  font-family: arial, sans-serif;\n  font-size: 11px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-cms__review-moves {\n  display: flex;\n  gap: 8px;\n}\n\n.ct-cms__review-move--current:disabled {\n  color: #646464;\n  font-weight: bold;\n  text-decoration: none;\n}\n\n.ct-cms__review-pull {\n  color: #646464;\n  font-family: arial, sans-serif;\n  font-size: 11px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-cms__alert {\n  background: rgb(98.2594681708%, 87.0185334408%, 85.858178888%);\n  border: 1px solid #e74c3c;\n  margin: 0 0 12px;\n  padding: 8px 12px;\n}\n\n.ct-cms__alert-title {\n  font-family: arial, sans-serif;\n  font-size: 14px;\n  line-height: 20px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  font-weight: bold;\n  margin: 0;\n}\n\n.ct-cms__alert-detail {\n  margin: 4px 0 0;\n  white-space: pre-wrap;\n  word-break: break-word;\n}\n\n.ct-cms__alert--notice {\n  background: #f7f7f7;\n  border-color: #d0d0d0;\n}\n\n.ct-cms__entries-head,\n.ct-cms__entry-head {\n  align-items: baseline;\n  display: flex;\n  gap: 8px;\n  margin: 0 0 4px;\n}\n\n.ct-cms__entries-head .ct-cms__heading {\n  margin: 0;\n}\n\n.ct-cms__entry-head .ct-cms__heading {\n  margin: 0;\n  min-width: 0;\n  overflow-wrap: anywhere;\n}\n\n.ct-cms__entry-back {\n  color: #2980b9;\n  display: inline-block;\n  margin: 0 0 12px;\n  font-family: arial, sans-serif;\n  font-size: 12px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-cms__conflict,\n.ct-cms__confirm,\n.ct-cms__gate-rescue,\n.ct-cms__leave {\n  border: 1px solid #e74c3c;\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  margin: 0 0 12px;\n  padding: 12px;\n}\n\n.ct-cms__confirm,\n.ct-cms__leave {\n  align-items: flex-start;\n  flex-direction: row;\n  flex-wrap: wrap;\n}\n\n.ct-cms__confirm-note,\n.ct-cms__leave-note {\n  flex: 1 1 100%;\n  margin: 0;\n}\n\n.ct-cms__conflict-text {\n  border: 1px solid #d0d0d0;\n  font-family: "Bitstream Vera Sans Mono", Consolas, Courier, monospace;\n  font-size: 12px;\n  min-height: 160px;\n  padding: 8px;\n  resize: vertical;\n  white-space: pre;\n  width: 100%;\n}\n\n.ct-cms__alert-path {\n  font-family: "Bitstream Vera Sans Mono", Consolas, Courier, monospace;\n  font-size: 12px;\n}\n\n.ct-cms__fields {\n  background: #f7f7f7;\n  border: 1px solid #d0d0d0;\n  margin: 0 0 12px;\n  padding: 12px;\n}\n\n.ct-cms__fields-heading {\n  margin: 0 0 8px;\n  font-family: arial, sans-serif;\n  font-size: 14px;\n  line-height: 18px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-cms__field-rows {\n  display: grid;\n  gap: 12px;\n  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));\n}\n\n.ct-cms__field {\n  min-width: 0;\n}\n\n.ct-cms__field-label {\n  display: block;\n  font-weight: bold;\n  margin: 0 0 4px;\n  font-family: arial, sans-serif;\n  font-size: 12px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-cms__field-input {\n  border: 1px solid #d0d0d0;\n  display: block;\n  padding: 6px 8px;\n  width: 100%;\n  font-family: arial, sans-serif;\n  font-size: 14px;\n  line-height: 18px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n.ct-cms__field-input:focus-visible {\n  outline: 2px solid #2980b9;\n  outline-offset: -1px;\n}\n.ct-cms__field-input[readonly] {\n  background: #f7f7f7;\n  color: #646464;\n}\n\ntextarea.ct-cms__field-input {\n  min-height: 72px;\n  resize: vertical;\n}\n\n.ct-cms__field-check {\n  display: block;\n  margin: 2px 0;\n}\n\n.ct-cms__field-hint {\n  color: #646464;\n  margin: 4px 0 0;\n  font-family: arial, sans-serif;\n  font-size: 12px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-cms__field-error {\n  color: #e74c3c;\n  margin: 4px 0 0;\n  font-family: arial, sans-serif;\n  font-size: 12px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-cms__field-preview {\n  border: 1px solid #d0d0d0;\n  display: block;\n  margin: 4px 0 0;\n  max-height: 120px;\n  max-width: 100%;\n}\n\n.ct-cms__create-form {\n  max-width: 480px;\n}\n\n.ct-cms__create-form .ct-cms__button {\n  margin: 12px 0 0;\n}\n\n.ct-cms__gate {\n  align-items: center;\n  display: flex;\n  flex: 1 1 auto;\n  justify-content: center;\n  padding: 24px;\n}\n\n.ct-cms__gate-panel {\n  background: #f7f7f7;\n  border: 1px solid #d0d0d0;\n  max-width: 480px;\n  padding: 20px;\n  width: 100%;\n}\n\n.ct-cms__gate-title {\n  font-family: arial, sans-serif;\n  font-size: 18px;\n  line-height: 24px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  margin: 0 0 8px;\n}\n\n.ct-cms__gate-text {\n  margin: 0 0 12px;\n}\n\n.ct-cms__gate-permissions {\n  margin: 0 0 12px;\n  padding-left: 20px;\n}\n\n.ct-cms__label {\n  display: block;\n  font-weight: bold;\n  margin: 0 0 4px;\n}\n\n.ct-cms__input {\n  border: 1px solid #d0d0d0;\n  display: block;\n  padding: 6px 8px;\n  width: 100%;\n  font-family: arial, sans-serif;\n  font-size: 14px;\n  line-height: 18px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n.ct-cms__input:focus-visible {\n  outline: 2px solid #2980b9;\n  outline-offset: -1px;\n}\n\n.ct-cms__button {\n  background: #27ae60;\n  border: 0;\n  color: white;\n  cursor: pointer;\n  padding: 7px 14px;\n  font-family: arial, sans-serif;\n  font-size: 14px;\n  line-height: 18px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n.ct-cms__button:hover {\n  background: rgb(12.3645401823%, 55.1648715824%, 30.4357912179%);\n}\n.ct-cms__button:focus-visible {\n  outline: 2px solid #2980b9;\n  outline-offset: 2px;\n}\n.ct-cms__button--cancel {\n  background: #e74c3c;\n}\n.ct-cms__button--cancel:hover {\n  background: rgb(87.3650282031%, 17.9210314263%, 10.7526188558%);\n}\n.ct-cms__button:disabled {\n  background: #646464;\n  cursor: default;\n}\n.ct-cms__button--add {\n  display: inline-block;\n  text-decoration: none;\n}\n.ct-cms__button--muted {\n  background: transparent;\n  color: #2980b9;\n  padding: 7px 0;\n  text-decoration: underline;\n}\n.ct-cms__button--muted:hover {\n  background: transparent;\n  color: rgb(12.4501127885%, 38.8686448031%, 56.1773381919%);\n}\n\n.ct-cms__media-grid {\n  display: grid;\n  gap: 12px;\n  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));\n  list-style: none;\n  margin: 0;\n  padding: 0;\n}\n\n.ct-cms__media-item {\n  border: 1px solid #d0d0d0;\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  padding: 6px;\n}\n\n.ct-cms__media-thumb {\n  background: #f7f7f7;\n  height: 90px;\n  object-fit: contain;\n  width: 100%;\n}\n\n.ct-cms__media-name {\n  overflow-wrap: anywhere;\n  font-family: arial, sans-serif;\n  font-size: 11px;\n  line-height: 15px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-cms__media-note {\n  color: #646464;\n  margin: 0;\n  font-family: arial, sans-serif;\n  font-size: 11px;\n  line-height: 15px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-cms__media-folder {\n  color: #646464;\n  font-family: "Bitstream Vera Sans Mono", Consolas, Courier, monospace;\n  font-family: arial, sans-serif;\n  font-size: 12px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.ct-cms__hint {\n  color: #646464;\n  margin: 12px 0 0;\n  font-family: arial, sans-serif;\n  font-size: 12px;\n  line-height: 16px;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n[hidden][hidden] {\n  display: none;\n}';
const shellStyles = layered(shellCSS, "ct-shell");
const shellStyleSheet = sheetFactory(shellStyles);
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
    class: "ct-cms__field-input",
    id: "ct-cms-new-title",
    type: "text",
    autocomplete: "off"
  });
  const preview = h(doc, "p", { class: "ct-cms__field-hint" });
  const submit = h(doc, "button", {
    class: "ct-cms__button",
    type: "button"
  }, ["Create"]);
  const form = h(doc, "div", { class: "ct-cms__create-form" }, [
    h(
      doc,
      "label",
      { class: "ct-cms__field-label", for: "ct-cms-new-title" },
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
const UNKNOWN_WIDGET = "unknown";
function wasSet(value) {
  return value !== void 0;
}
function fieldRow(doc, field, control, extra = []) {
  const id = `ct-cms-field-${field.name}`;
  control.setAttribute("id", id);
  if (field.required) {
    control.setAttribute("required", "required");
  }
  const error = h(doc, "p", { class: "ct-cms__field-error", role: "alert" });
  error.hidden = true;
  const node = h(doc, "div", { class: "ct-cms__field" }, [
    h(
      doc,
      "label",
      { class: "ct-cms__field-label", for: id },
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
    const props = { class: "ct-cms__field-input" };
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
    { class: "ct-cms__field-input", type: "number" }
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
    { class: "ct-cms__field-check", type: "checkbox" }
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
      { class: "ct-cms__field-input", type }
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
  const control = h(doc, "select", { class: "ct-cms__field-input" });
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
    { class: "ct-cms__field-input" }
  );
  const had = wasSet(value);
  control.value = Array.isArray(value) ? value.join("\n") : "";
  const hint = h(doc, "p", { class: "ct-cms__field-hint" }, ["One per line."]);
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
    { class: "ct-cms__field-input", type: "text" }
  );
  const had = wasSet(value);
  control.value = had && value !== null ? String(value) : "";
  const preview = h(doc, "img", { class: "ct-cms__field-preview", alt: "" });
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
    class: "ct-cms__field-input",
    type: "text",
    readonly: "readonly"
  });
  control.value = value === void 0 || value === null ? "" : JSON.stringify(value);
  const note = h(
    doc,
    "p",
    { class: "ct-cms__field-hint" },
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
function buildFields(doc, registry = () => DEFAULT_WIDGETS) {
  const rows = h(doc, "div", { class: "ct-cms__field-rows" });
  const note = h(doc, "p", { class: "ct-cms__note" });
  const node = h(doc, "section", { class: "ct-cms__fields" }, [
    h(doc, "h3", { class: "ct-cms__fields-heading" }, ["Details"]),
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
  let mediaOpen = false;
  const media = h(doc, "button", {
    class: "ct-cms__button ct-cms__button--muted ct-cms__entry-media",
    type: "button",
    "aria-expanded": "false",
    onclick: () => handlers.showMedia(!mediaOpen)
  }, ["Media"]);
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
      media,
      remove,
      submit
    ]),
    back,
    note,
    leaving,
    deleting,
    conflict,
    /* Above the slot the editor lands in, because the frontmatter is
       the top of the file and reading the screen in file order is
       one less thing to explain. */
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
      mediaOpen = state.mediaOpen;
      media.setAttribute("aria-expanded", String(state.mediaOpen));
      media.disabled = entry === null;
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
    button: el.querySelector(".ct-cms__media-insert"),
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
  let current = { insertable: false };
  function paint(el, item) {
    const { image, button, note: failed } = partsOf(el);
    const ready = image.naturalWidth > 0;
    button.hidden = !current.insertable || item.type === null;
    button.disabled = !ready;
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
      ),
      h(doc, "button", {
        class: "ct-cms__button ct-cms__media-insert",
        type: "button",
        onclick: () => handlers.insert(
          item,
          [image.naturalWidth, image.naturalHeight]
        )
      }, ["Insert"])
    ]);
    image.addEventListener("load", () => paint(el, item));
    image.addEventListener("error", () => {
      if (el.dataset.ctState !== "public") {
        el.dataset.ctState = "failed";
        paint(el, item);
        return;
      }
      el.dataset.ctState = "fallback";
      paint(el, item);
      void handlers.thumbnail(item).then((url) => {
        if (url) {
          image.src = url;
        } else {
          el.dataset.ctState = "failed";
          paint(el, item);
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
      current = state;
      folder.textContent = state.folder;
      const files = state.files;
      note.textContent = files === null ? "Loading…" : files.length === 0 ? "Nothing in this folder yet. Images are added from inside an entry, through the editor’s image button, so that a picture and the entry using it are committed together." : state.truncated ? "This folder is larger than GitHub will list in one request, so what follows is only the first part of it." : state.insertable ? "" : "Open an entry to insert one of these into it.";
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
        (el, item) => paint(el, item)
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
const EDITOR_SLOT = "editor";
function withMedia(state, media, entry) {
  entry.update(state.entry);
  if (!state.entry.mediaOpen) {
    return [entry.node];
  }
  media.update(state.media);
  return [entry.node, media.node];
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
function createView(doc, state, create, entry, media, name) {
  if (state.entry.entry) {
    return withMedia(state, media, entry);
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
      return createView(doc, state, create, entry, media, state.route.collection);
    case "entry":
      return withMedia(state, media, entry);
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
  const slot = doc.createElement("slot");
  slot.name = EDITOR_SLOT;
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
      h(doc, "main", { class: "ct-cms__main" }, [alert, view, slot])
    ])
  ]);
  return {
    node,
    slot,
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
function insertImage(regionName, image) {
  var _a;
  const app = ContentTools.EditorApp.current();
  const region = (_a = app == null ? void 0 : app.regions()) == null ? void 0 : _a[regionName];
  if (!region) {
    return false;
  }
  const node = new ContentEdit.Image({
    src: image.url,
    alt: image.alt,
    width: image.size[0],
    height: image.size[1]
  });
  const focused = ContentEdit.Root.get().focused();
  const inRegion = focused && focused.closest((n) => n.type() === "Region") === region;
  if (inRegion) {
    const [at, index] = ContentTools.Tool._insertAt(focused);
    at.parent().attach(node, index);
  } else {
    region.attach(node, region.children.length);
  }
  node.focus();
  return true;
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
const TAG_NAME = "content-tools-cms";
const CONFIG_ATTRIBUTE = "config";
const RESCUE_KEY = "content-tools:unsaved";
const REGION = "body";
const EDITOR_REGIONS = "[data-editable]";
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
      showMedia: (open) => this._showMedia(open),
      thumbnail: (item) => this._thumbnail(item),
      insert: (item, size) => this._insert(item, size),
      moveStatus: (entry, status) => this._moveStatus(entry, status)
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
    this._entry = null;
    this._doc = null;
    this._store = null;
    this._media = null;
    this._mediaOpen = false;
    this._thumbnails = /* @__PURE__ */ new Set();
    this._review = null;
    this._moving = [];
    this._editor = null;
    this._edited = null;
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
    if ("entry" in patch) {
      this._entry = patch.entry ?? null;
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
    if ("mediaOpen" in patch) {
      this._mediaOpen = patch.mediaOpen ?? false;
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
   * Read an entry and put an editor on the page for it.
   *
   * The media folder is listed in the SAME round trip, because the
   * names it already holds decide what an upload is staged as -- and a
   * collision has to be resolved at the moment the image is inserted,
   * not at commit time, since the URL the editor shows has to be the
   * URL that ends up in the file.
   */
  async _openEntry(at, collection, slug) {
    const repo = this._repo;
    const config = this._config;
    const [entry, folder] = await Promise.all([
      repo.readEntry(collection, slug),
      repo.github.listDirectory(config.media.folder, repo.base)
    ]);
    if (at !== this._nav) {
      return;
    }
    this._mount(entry, MarkdownDocument.parse(entry.content ?? ""), folder);
  }
  /**
   * Put an editor on the page for an entry, however it was arrived at.
   *
   * Shared by opening an existing entry and creating a new one, and it
   * is the same code on purpose: the only thing a new entry does
   * differently is where its `MarkdownDocument` came from. Everything
   * after that -- the form, the media store, the editor, the dirty
   * check, the save -- must not be able to tell the two apart, or a
   * created entry becomes a second set of rules nobody exercises until
   * somebody writes one.
   */
  _mount(entry, doc, folder) {
    const config = this._config;
    this._doc = doc;
    this._media = this._listing(folder);
    this._store = new MediaStore({
      config,
      taken: folder.map((file) => file.name)
    });
    this._openForm(doc, entry.collection, entry.slug);
    const editor = this._buildEditor(doc, this._store);
    this._setEditor(editor);
    editor.start();
    this._setState({ entry });
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
      let folder;
      try {
        [entry, folder] = await Promise.all([
          repo.readEntry(route.collection, slug),
          repo.github.listDirectory(
            this._config.media.folder,
            repo.base
          )
        ]);
      } finally {
        this._creating = false;
      }
      if (at !== this._nav) {
        return;
      }
      if (entry.content !== null || entry.pull) {
        throw new EntryExistsError(route.collection, slug, entry.path);
      }
      this._mount(entry, this._blankDocument(fieldsFor(collection, slug)), folder);
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
      const repo = this._repo;
      const entry = this._entry;
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
    const front = doc.frontmatter();
    const data = front ? front.data : null;
    let refusal = null;
    if (front && !front.valid) {
      refusal = UNREADABLE;
    } else if (!isMergeable(data)) {
      refusal = NOT_A_MAPPING;
    }
    this._form = {
      /* What tells the form one entry from the next -- and NOT
                     the `Entry` object, because a save replaces that with a
                     copy re-pinned to the new commit, and keying on it would
                     rebuild every control under whoever was typing on every
                     press of Submit.
      
                     Its CONTENT survives mutation: any non-empty string
                     passes the whole suite today, because every entry-to-
                     entry move goes through `_closeEntry` and a closed form
                     rebuilds whatever it is handed next. Recorded rather than
                     simplified to a constant -- it becomes load-bearing the
                     first time the shell opens a different entry without
                     closing the one before it, and there a constant key shows
                     the previous file's answers over the new file's body. */
      key: `${collection}/${slug}`,
      fields: fieldsFor(found, slug),
      data,
      refusal
    };
  }
  /**
   * The editor element for `doc`, fully built and not yet connected.
   *
   * Everything is in place before it enters the DOM, because
   * `connectedCallback` boots immediately: an element connected first
   * and configured afterwards boots against the defaults and then has
   * to be rebooted, which tears down and re-claims the lease for
   * nothing.
   */
  _buildEditor(doc, store) {
    const doc_ = this.ownerDocument;
    const editor = doc_.createElement(TAG_NAME$1);
    editor.setAttribute("slot", EDITOR_SLOT);
    editor.setAttribute("regions", EDITOR_REGIONS);
    editor.setAttribute("mode", "markdown");
    editor.imageUploader = mediaUploader({ store });
    const region = doc_.createElement("div");
    region.setAttribute("data-editable", "");
    region.setAttribute("data-name", REGION);
    region.innerHTML = doc.toHTML();
    editor.appendChild(region);
    editor.addEventListener("ct-saved", (ev) => this._remember(ev));
    return editor;
  }
  /**
   * This host's only light-DOM child, and the only place it is written.
   *
   * Not `replaceChildren`: a host page's own children are none of the
   * shell's business, and the M5-1 invariant that the shell writes
   * nothing into its light DOM holds for everything except this one
   * element.
   *
   * There is no editor-to-editor case, and there is deliberately no
   * code for one. `_navigate` closes the open entry BEFORE it awaits
   * the next, so the lease is genuinely free across the read rather
   * than handed over in a single tick -- the one-tick `replaceWith`
   * swap the plan called for was written, found to be unreachable, and
   * removed. Adding it back means removing the `_closeEntry` above.
   */
  _setEditor(next) {
    const current = this._editor;
    this._editor = next;
    if (next) {
      this.appendChild(next);
    } else if (current) {
      current.remove();
    }
  }
  /**
   * Forget the open entry. Does NOT render; every caller sets state
   * immediately afterwards and a second render would only flicker.
   */
  _closeEntry() {
    this._setEditor(null);
    this._entry = null;
    this._doc = null;
    this._store = null;
    this._edited = null;
    this._form = null;
    this._deleting = false;
    this._mediaOpen = false;
    this._saving = false;
    this._saved = null;
    this._conflict = null;
  }
  _entryState() {
    const entry = this._entry;
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
      mediaOpen: this._mediaOpen
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
  /** Open or close the media panel under the entry. */
  _showMedia(open) {
    this._setState({ mediaOpen: open });
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
   * Put a file that is already in the repository into the open entry.
   *
   * Nothing is staged and nothing is committed: the file is in the
   * repository already, so the entry references it by the same public
   * URL a tile just proved renders, and the save that follows writes
   * one changed line.
   *
   * The panel stays open. Inserting one picture is rarely the whole
   * job, and a panel that closes itself makes the second insert a
   * hunt for the button again.
   */
  _insert(item, size) {
    insertImage(REGION, { url: item.url, size, alt: item.name });
  }
  /**
   * The media folder, for the route and for the panel alike.
   *
   * `insertable` is derived from there being an open entry, never
   * remembered: the panel's Insert buttons must go dead the instant the
   * entry does. A boolean set when the panel opened would survive an
   * entry closing under it -- a save that navigated, a conflict that
   * reloaded -- and every press after that would report success and
   * insert into nothing.
   */
  _mediaState(config) {
    var _a, _b;
    return {
      folder: config.media.folder,
      files: ((_a = this._media) == null ? void 0 : _a.files) ?? null,
      truncated: ((_b = this._media) == null ? void 0 : _b.truncated) ?? false,
      insertable: this._entry !== null
    };
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
  /**
   * The body HTML as it stands right now.
   *
   * `save(true)` is passive: it reports without unmounting the
   * regions, so the caret stays where the person left it. It fills
   * `_edited` synchronously through the handler above, and the cache
   * is why this may be called twice -- the dirty check and the submit
   * both want the answer, and the second caller would otherwise be
   * told nothing had changed.
   */
  _currentHtml() {
    var _a, _b;
    (_a = this._editor) == null ? void 0 : _a.save(true);
    return this._edited ?? ((_b = this._doc) == null ? void 0 : _b.toHTML()) ?? "";
  }
  /**
   * Exactly what a save would write, or null if there is nothing open.
   *
   * ONE method, because the dirty check and the submit both need this
   * answer and two spellings of it can disagree -- which they would do
   * by holding a navigation over work that a save then reports as
   * unchanged, or worse by letting one go that a save would have
   * written. The media rewrite belongs here for the same reason: it
   * happens on the way to the commit, so it has to happen on the way
   * to the comparison.
   */
  _pending() {
    const doc = this._doc;
    const store = this._store;
    if (!doc || !store) {
      return null;
    }
    const { html, media } = store.rewrite(this._currentHtml());
    return { content: doc.update(html, this._frontmatterOption()), media };
  }
  /**
   * The `frontmatter` option for `update`, or nothing at all.
   *
   * Returning `undefined` is not the same as returning `{frontmatter:
   * <unchanged>}`: `update` preserves the original block BYTE FOR BYTE
   * only when it is given no data, and a YAML round trip loses key
   * order, comments and quoting style. So a save that only touched the
   * body has to reach `update` with no options object, and this is the
   * line that decides it.
   */
  _frontmatterOption() {
    var _a;
    const values = this._frame.entry.values();
    if (values === null) {
      return void 0;
    }
    const data = ((_a = this._form) == null ? void 0 : _a.data) ?? null;
    const merged = mergeFrontmatter(data, values);
    return frontmatterChanged(data, merged) ? { frontmatter: merged } : void 0;
  }
  /**
   * Whether there is work that a save would write.
   *
   * The MARKDOWN decides, not the HTML. The editor normalises what it
   * is handed -- attribute order, whitespace, the placeholder
   * paragraph an empty region needs to hold a caret -- so an HTML
   * comparison reports edits nobody made, and a leave panel that
   * appears every time is a leave panel people click through.
   */
  _dirty() {
    const entry = this._entry;
    const pending = entry ? this._pending() : null;
    return pending !== null && pending.content !== ((entry == null ? void 0 : entry.content) ?? "");
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
      const entry = this._entry;
      const errors = this._frame.entry.errors();
      if (errors.length > 0) {
        this._setState({ error: {
          title: errors.length === 1 ? "One field needs filling in." : `${errors.length} fields need filling in.`,
          detail: errors.join(" "),
          kind: "notice",
          path: ""
        } });
        return;
      }
      const pending = this._pending();
      if (!repo || !entry || !pending) {
        return;
      }
      const { content, media } = pending;
      this._setState({ saving: true, saved: null, conflict: null, error: null });
      const fresh = entry.content === null;
      let result;
      try {
        result = await repo.saveEntry(entry.collection, entry.slug, {
          content,
          media,
          parent: entry.commit,
          /* Asked for, not inferred. The shell checked this
             before opening the editor; this is the check that
             settles the race the first one cannot -- two
             authors who both passed it and are both now
             pressing Submit. Without it the second one's post
             is committed onto the first one's pull request. */
          create: fresh,
          message: `${fresh ? "Create" : "Update"} ${entry.path}`
        });
      } catch (error) {
        this._saving = false;
        const described = describeError(error);
        if (described.kind === "conflict") {
          this._setState({ error: described, conflict: content });
          return;
        }
        throw error;
      }
      if (this._route.kind === "new") {
        this._route = {
          kind: "entry",
          collection: entry.collection,
          slug: entry.slug
        };
        this._restoreHash();
      }
      this._setState({
        entry: {
          ...entry,
          content,
          commit: result.commit ?? entry.commit,
          pull: result.pull
        },
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
    const auth = config.backend.auth;
    if (auth.kind !== "github-app") {
      return new PatAuthAdapter({ prompt: () => this._offered });
    }
    return new GitHubAppAuthAdapter({
      clientId: auth.clientId,
      proxy: auth.proxy,
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
   * The editor goes with it. It is a child of THIS host, and the frame
   * that slots it is merely hidden when the gate comes back -- so an
   * editor left behind is invisible, still connected, and still holding
   * the one-per-page `EditorApp` lease. Signing back in and opening an
   * entry would then refuse, with nothing in any stack trace.
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
   * The frame is HIDDEN rather than removed. It holds the editor slot,
   * and a slot detached from the shadow root unslots whatever was in it
   * -- leaving an editor that is invisible, still connected, and still
   * holding the one-per-page lease. One attribute is a far cheaper
   * invariant than remembering never to detach it.
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
if (typeof customElements !== "undefined") {
  if (!customElements.get(TAG_NAME)) {
    customElements.define(TAG_NAME, ContentToolsCms);
  }
  if (!customElements.get(TAG_NAME$1)) {
    customElements.define(TAG_NAME$1, ContentToolsEditor);
  }
}
export {
  ContentToolsCms,
  EDITOR_SLOT,
  TAG_NAME
};
