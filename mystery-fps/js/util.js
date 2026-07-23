/** Shared helpers */

export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];

export const DEMO = new URLSearchParams(location.search).has("demo");

export function waitMs(ms) {
  return new Promise((r) => setTimeout(r, DEMO ? Math.min(ms, 220) : ms));
}

export function showScreen(id) {
  $$(".screen").forEach((s) => s.classList.remove("active"));
  $(id).classList.add("active");
}
