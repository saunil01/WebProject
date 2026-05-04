// Streak math.
//
// Given the user's mood entries, compute:
//   - current: how many *consecutive* days ending today (or yesterday) had at
//     least one mood entry. We're lenient: missing today doesn't break the
//     streak until the next day rolls over.
//   - longest: the longest such run anywhere in their history.
//   - lastLogDate: ISO YYYY-MM-DD of the most recent entry, or null.
//
// Design choices we deliberately made:
//   - Streaks count *days*, not entries. Two moods on Tuesday count once.
//   - "Today missing" is forgiven until tomorrow — no streak-loss anxiety.
//   - The streak is a UTC-day boundary mismatch waiting to happen if we
//     used UTC; we use the local date instead so the user's idea of "today"
//     matches what the UI shows.

function localDayKey(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function computeStreaks(moods = []) {
  if (!moods || moods.length === 0) {
    return { current: 0, longest: 0, lastLogDate: null };
  }

  // Set of distinct day keys the user logged at least one mood on.
  const days = new Set();
  for (const m of moods) days.add(localDayKey(m.mood_date));

  // Sorted ascending list of unique days.
  const sortedDays = [...days].sort();

  // Find longest run anywhere.
  let longest = 1;
  let runHere = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1] + "T00:00:00");
    const curr = new Date(sortedDays[i] + "T00:00:00");
    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      runHere++;
      if (runHere > longest) longest = runHere;
    } else {
      runHere = 1;
    }
  }

  // Current streak: walk backward from today (or yesterday).
  const today = new Date();
  const todayKey = localDayKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = localDayKey(yesterday);

  let current = 0;
  // Anchor: if today is logged, start at today. Else if yesterday is logged,
  // we're still "alive" — start at yesterday. Otherwise streak is 0.
  let cursor;
  if (days.has(todayKey)) {
    cursor = today;
  } else if (days.has(yesterdayKey)) {
    cursor = yesterday;
  } else {
    return {
      current: 0,
      longest,
      lastLogDate: sortedDays[sortedDays.length - 1],
    };
  }

  while (days.has(localDayKey(cursor))) {
    current++;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    current,
    longest,
    lastLogDate: sortedDays[sortedDays.length - 1],
  };
}
