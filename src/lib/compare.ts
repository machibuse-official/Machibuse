// 物件比較管理（localStorage）

const STORAGE_KEY = "machibuse_compare";
const MAX_COMPARE = 4;

function loadCompareIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCompareIds(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage unavailable
  }
}

export function getCompareIds(): string[] {
  return loadCompareIds();
}

export function isInCompare(mansionId: string): boolean {
  return loadCompareIds().includes(mansionId);
}

export function addToCompare(mansionId: string): boolean {
  const ids = loadCompareIds();
  if (ids.length >= MAX_COMPARE) return false;
  if (!ids.includes(mansionId)) {
    ids.push(mansionId);
    saveCompareIds(ids);
  }
  return true;
}

export function removeFromCompare(mansionId: string): void {
  const ids = loadCompareIds().filter((id) => id !== mansionId);
  saveCompareIds(ids);
}

export function clearCompare(): void {
  saveCompareIds([]);
}

export function toggleCompare(mansionId: string): { added: boolean; full: boolean } {
  if (isInCompare(mansionId)) {
    removeFromCompare(mansionId);
    return { added: false, full: false };
  }
  const success = addToCompare(mansionId);
  return { added: success, full: !success };
}

export { MAX_COMPARE };
