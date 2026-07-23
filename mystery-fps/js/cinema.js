import { $, waitMs } from "./util.js";

/**
 * Film language: fades, title cards, chapter banners.
 */
export function createCinema({ audio }) {
  let bannerTimer;

  async function fade(on, ms = 700) {
    const el = $("#cinema-fade");
    if (!el) return;
    if (on) {
      el.classList.add("on");
      await waitMs(ms);
    } else {
      el.classList.remove("on");
      await waitMs(ms * 0.6);
    }
  }

  async function titleCard({ act = "", title = "", sub = "", hold = 2200 } = {}) {
    const card = $("#title-card");
    if (!card) return;
    $("#tc-act").textContent = act;
    $("#tc-title").textContent = title;
    $("#tc-sub").textContent = sub;
    card.classList.remove("hidden");
    audio.noirHit();
    await waitMs(hold);
    card.classList.add("hidden");
    await waitMs(280);
  }

  function roomBanner(text) {
    const el = $("#room-banner");
    if (!el) return;
    el.textContent = text;
    el.classList.remove("hidden");
    el.classList.add("show");
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.classList.add("hidden"), 400);
    }, 1800);
  }

  function clearFade() {
    $("#cinema-fade")?.classList.remove("on");
  }

  return { fade, titleCard, roomBanner, clearFade };
}
