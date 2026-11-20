// tracker.js — progress state for the Leonida Trophy Ledger.
// Progress lives in the browser's localStorage, can be exported to a JSON
// file and imported back, and can be seeded from a share link (?earned=1,2,3).

export const STORAGE_KEY = 'leonida-trophy-ledger-v1';

// PlayStation trophy point values, used for the points total in the header.
export const GRADE_POINTS = { bronze: 15, silver: 30, gold: 90, platinum: 300 };

export function emptyState() {
  return { earned: [], spoilers: true, hideEarned: false };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return {
      earned: Array.isArray(parsed.earned) ? parsed.earned.filter((n) => Number.isInteger(n)) : [],
      spoilers: parsed.spoilers !== false,
      hideEarned: parsed.hideEarned === true,
    };
  } catch {
    return emptyState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private mode); the tracker still works in memory.
  }
}

// Points and per-grade counts for the trophies the player has earned.
export function progressSummary(trophies, earnedIds) {
  const earned = trophies.filter((t) => earnedIds.has(t.id));
  const byGrade = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  let points = 0;
  for (const t of earned) {
    byGrade[t.grade] += 1;
    points += GRADE_POINTS[t.grade] ?? 0;
  }
  const totalPoints = trophies.reduce((sum, t) => sum + (GRADE_POINTS[t.grade] ?? 0), 0);
  return {
    earnedCount: earned.length,
    total: trophies.length,
    percent: trophies.length ? Math.round((earned.length / trophies.length) * 100) : 0,
    byGrade,
    points,
    totalPoints,
  };
}

// Download the current progress as a JSON file the reader keeps.
export function exportProgress(state) {
  const payload = {
    app: 'leonida-trophy-ledger',
    version: 1,
    exportedAt: new Date().toISOString(),
    earned: [...state.earned].sort((a, b) => a - b),
    spoilers: state.spoilers,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'leonida-trophy-progress.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Read an imported file's text back into a clean list of valid trophy ids.
export function parseImportedProgress(text, validIds) {
  const parsed = JSON.parse(text);
  const list = Array.isArray(parsed) ? parsed : parsed.earned;
  if (!Array.isArray(list)) throw new Error('No earned list in that file.');
  return list.filter((n) => Number.isInteger(n) && validIds.has(n));
}

// A share link can carry progress: ?earned=2,3,8 returns those ids.
export function idsFromShareLink(search) {
  const raw = new URLSearchParams(search).get('earned');
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => Number.parseInt(part, 10))
    .filter((n) => Number.isInteger(n) && n > 0);
}
