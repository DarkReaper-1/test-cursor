(function (global) {
  const CHECK_KEY = "presswell.reminders.lastCheck";

  async function ensurePermission() {
    if (!("Notification" in window)) return "unsupported";
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    return Notification.requestPermission();
  }

  function maybeNotify(settings) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const now = new Date();
    const hour = now.getHours();
    const dayKey = now.toDateString() + ":" + hour;
    const last = localStorage.getItem(CHECK_KEY);
    if (last === dayKey) return;

    if (settings.remindAm && hour === 9) {
      new Notification("PressWell", { body: "Good morning — time to check your blood pressure with your cuff." });
      localStorage.setItem(CHECK_KEY, dayKey);
    }
    if (settings.remindPm && hour === 20) {
      new Notification("PressWell", { body: "Evening check-in — measure your heart rate with the camera if you like." });
      localStorage.setItem(CHECK_KEY, dayKey);
    }
  }

  function startWatcher(getSettings) {
    maybeNotify(getSettings());
    return setInterval(() => maybeNotify(getSettings()), 60 * 1000);
  }

  global.Reminders = { ensurePermission, maybeNotify, startWatcher };
})(window);
