// ウォッチリスト管理（localStorage）

export interface WatchConditions {
  rentMin: number | null;   // 万円
  rentMax: number | null;   // 万円
  sizeMin: number | null;   // ㎡
  layouts: string[];        // 間取りタイプ
  walkingMax: number | null; // 駅徒歩（分）
}

export interface WatchEntry {
  mansionId: string;
  conditions: WatchConditions;
  addedAt: string;
}

const STORAGE_KEY = "machibuse_watchlist";
const STORAGE_KEY_V2 = "machibuse_watchlist_v2";

export const DEFAULT_CONDITIONS: WatchConditions = {
  rentMin: null,
  rentMax: null,
  sizeMin: null,
  layouts: [],
  walkingMax: null,
};

function loadWatchEntries(): WatchEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V2);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    // v1からの移行
    const v1 = localStorage.getItem(STORAGE_KEY);
    if (v1) {
      const ids: string[] = JSON.parse(v1);
      const entries: WatchEntry[] = ids.map((id) => ({
        mansionId: id,
        conditions: { ...DEFAULT_CONDITIONS },
        addedAt: new Date().toISOString(),
      }));
      localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(entries));
      return entries;
    }
    return [];
  } catch {
    return [];
  }
}

function saveWatchEntries(entries: WatchEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(entries));
    // v1互換
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.map((e) => e.mansionId)));
  } catch {
    // localStorage unavailable
  }
}

export function getWatchedMansionIds(): string[] {
  return loadWatchEntries().map((e) => e.mansionId);
}

export function getWatchEntries(): WatchEntry[] {
  return loadWatchEntries();
}

export function getWatchEntry(mansionId: string): WatchEntry | null {
  return loadWatchEntries().find((e) => e.mansionId === mansionId) || null;
}

export function addToWatchlist(mansionId: string, conditions?: WatchConditions): void {
  const entries = loadWatchEntries();
  if (!entries.some((e) => e.mansionId === mansionId)) {
    entries.push({
      mansionId,
      conditions: conditions || { ...DEFAULT_CONDITIONS },
      addedAt: new Date().toISOString(),
    });
    saveWatchEntries(entries);
  }
}

export function removeFromWatchlist(mansionId: string): void {
  const entries = loadWatchEntries().filter((e) => e.mansionId !== mansionId);
  saveWatchEntries(entries);
}

export function updateWatchConditions(mansionId: string, conditions: WatchConditions): void {
  const entries = loadWatchEntries();
  const entry = entries.find((e) => e.mansionId === mansionId);
  if (entry) {
    entry.conditions = conditions;
    saveWatchEntries(entries);
  }
}

export function isWatched(mansionId: string): boolean {
  return getWatchedMansionIds().includes(mansionId);
}

export function toggleWatchlist(mansionId: string): boolean {
  if (isWatched(mansionId)) {
    removeFromWatchlist(mansionId);
    return false;
  } else {
    addToWatchlist(mansionId);
    return true;
  }
}
