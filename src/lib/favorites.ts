// お気に入り管理（localStorage）

const STORAGE_KEY = "machibuse_favorites";

export interface FavoriteEntry {
  type: "mansion" | "unit" | "listing";
  id: string;
  addedAt: string;
}

function loadFavorites(): FavoriteEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavorites(entries: FavoriteEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage unavailable
  }
}

export function getFavorites(type?: FavoriteEntry["type"]): FavoriteEntry[] {
  const all = loadFavorites();
  return type ? all.filter((e) => e.type === type) : all;
}

export function isFavorite(type: FavoriteEntry["type"], id: string): boolean {
  return loadFavorites().some((e) => e.type === type && e.id === id);
}

export function addFavorite(type: FavoriteEntry["type"], id: string): void {
  const entries = loadFavorites();
  if (!entries.some((e) => e.type === type && e.id === id)) {
    entries.push({ type, id, addedAt: new Date().toISOString() });
    saveFavorites(entries);
  }
}

export function removeFavorite(type: FavoriteEntry["type"], id: string): void {
  const entries = loadFavorites().filter((e) => !(e.type === type && e.id === id));
  saveFavorites(entries);
}

export function toggleFavorite(type: FavoriteEntry["type"], id: string): boolean {
  if (isFavorite(type, id)) {
    removeFavorite(type, id);
    return false;
  } else {
    addFavorite(type, id);
    return true;
  }
}
