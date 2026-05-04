// Daily check-in reminder.
//
// Stored entirely in localStorage:
//   mindmate.reminder = { enabled: bool, time: "HH:MM" }
//
// Real push notifications need a server with VAPID keys + web-push, which is
// a bigger commitment than this project warrants right now. Instead we do the
// pragmatic thing: when the user opens the app, if it's past their reminder
// time AND they haven't logged a mood today, we show a soft in-page banner
// AND fire a browser Notification (only if they've granted permission).

const KEY = "mindmate.reminder";

export function loadReminder() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { enabled: false, time: "21:00" };
    const parsed = JSON.parse(raw);
    return {
      enabled: !!parsed.enabled,
      time: typeof parsed.time === "string" ? parsed.time : "21:00",
    };
  } catch {
    return { enabled: false, time: "21:00" };
  }
}

export function saveReminder(reminder) {
  try {
    localStorage.setItem(KEY, JSON.stringify(reminder));
  } catch {
    /* ignore */
  }
}

// Yes/no: should the dashboard show the reminder banner right now?
// Logic: enabled, current time >= reminder time, and the user hasn't logged
// a mood today. `lastLogDate` is the YYYY-MM-DD of their most recent mood.
export function shouldShowReminder({ enabled, time }, lastLogDate) {
  if (!enabled) return false;

  const now = new Date();
  const [hh, mm] = (time || "21:00").split(":").map((n) => Number(n) || 0);
  const reminderTime = new Date(now);
  reminderTime.setHours(hh, mm, 0, 0);
  if (now < reminderTime) return false;

  // Local YYYY-MM-DD of today.
  const today =
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0");

  return lastLogDate !== today;
}

// Best-effort notification. Asks permission if not yet decided.
// Safe to call on every dashboard load; won't double-fire because we tag
// notifications with today's date and the browser dedupes by tag.
export async function maybeFireBrowserNotification({ enabled }) {
  if (!enabled) return;
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "denied") return;

  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch {
      return;
    }
  }
  if (Notification.permission !== "granted") return;

  const today = new Date().toISOString().slice(0, 10);
  try {
    new Notification("MindMate check-in", {
      body: "Take a moment for yourself. How are you feeling?",
      tag: `checkin-${today}`,
      icon: "/icon.svg",
      silent: false,
    });
  } catch {
    /* ignore */
  }
}
