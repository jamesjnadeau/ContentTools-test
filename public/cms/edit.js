import { r as readHandoff, E as EDIT_FLAG, T as TOKEN_KEY, A as APP_TOKEN_KEY } from "./chunks/handoff-qeCiTHXN.js";
function wanted(where) {
  if (new URLSearchParams(where.location.search).has(EDIT_FLAG)) {
    return true;
  }
  try {
    const held = where.sessionStorage;
    return held.getItem(TOKEN_KEY) !== null || held.getItem(APP_TOKEN_KEY) !== null;
  } catch {
    return false;
  }
}
function claim(where) {
  const claimed = readHandoff(where.location.hash);
  if (!claimed) {
    return false;
  }
  try {
    const { pathname, search } = where.location;
    where.history.replaceState(null, "", `${pathname}${search}${claimed.rest}`);
  } catch {
  }
  try {
    where.sessionStorage.setItem(claimed.handoff.key, claimed.handoff.value);
  } catch {
  }
  return true;
}
async function boot(where) {
  const handed = claim(where);
  if (!handed && !wanted(where)) {
    return;
  }
  const { open } = await import("./chunks/surface-CSwbCbgR.js");
  await open(where, { contentStyles: CONTENT_STYLES });
}
const CONTENT_STYLES = new URL("./content-tools-content.min.css", import.meta.url).href;
if (typeof window !== "undefined") {
  void boot(window);
}
export {
  EDIT_FLAG,
  boot,
  claim,
  wanted
};
