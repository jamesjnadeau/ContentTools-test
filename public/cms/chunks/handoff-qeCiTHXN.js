const TOKEN_KEY = "content-tools:github-token";
const APP_TOKEN_KEY = "content-tools:github-app-token";
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
const EDIT_FLAG = "cms-edit";
function withEditFlag(url) {
  return `${url}${url.includes("?") ? "&" : "?"}${EDIT_FLAG}`;
}
const TOKEN_PARAM = "cms-token";
const KEY_PARAM = "cms-key";
const KEYS = [TOKEN_KEY, APP_TOKEN_KEY];
function handoffFragment(handoff) {
  return `${TOKEN_PARAM}=${encodeURIComponent(handoff.value)}&${KEY_PARAM}=${handoff.key}`;
}
function readHandoff(hash) {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  let value = null;
  let key = null;
  const rest = [];
  for (const segment of raw.split("&")) {
    const at = segment.indexOf("=");
    if (at === -1) {
      rest.push(segment);
      continue;
    }
    const name = segment.slice(0, at);
    const held = segment.slice(at + 1);
    if (name === TOKEN_PARAM) {
      value = decoded(held);
    } else if (name === KEY_PARAM) {
      key = decoded(held);
    } else {
      rest.push(segment);
    }
  }
  if (!value || !KEYS.includes(key)) {
    return null;
  }
  return { handoff: { key, value }, rest: rest.length === 0 ? "" : `#${rest.join("&")}` };
}
function decoded(raw) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}
export {
  APP_TOKEN_KEY as A,
  EDIT_FLAG as E,
  TOKEN_KEY as T,
  handoffFragment as h,
  memoryStorage as m,
  readHandoff as r,
  sessionStorageOrMemory as s,
  withEditFlag as w
};
