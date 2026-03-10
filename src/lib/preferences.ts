import type { MansionWithStats } from "@/types";

export interface UserPreferences {
  areas: string[];
  layouts: string[];
  rentMax: number | null; // 万円
  rentMin: number | null; // 万円
  walkingMax: number | null; // 分
  sizeMin: number | null; // ㎡
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  areas: [],
  layouts: [],
  rentMax: null,
  rentMin: null,
  walkingMax: null,
  sizeMin: null,
};

const STORAGE_KEY = "machibuse_preferences";

export function savePreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage unavailable
  }
}

export function loadPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(raw);
    return {
      areas: Array.isArray(parsed.areas) ? parsed.areas : [],
      layouts: Array.isArray(parsed.layouts) ? parsed.layouts : [],
      rentMax: typeof parsed.rentMax === "number" ? parsed.rentMax : null,
      rentMin: typeof parsed.rentMin === "number" ? parsed.rentMin : null,
      walkingMax: typeof parsed.walkingMax === "number" ? parsed.walkingMax : null,
      sizeMin: typeof parsed.sizeMin === "number" ? parsed.sizeMin : null,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function hasPreferences(prefs: UserPreferences): boolean {
  return (
    prefs.areas.length > 0 ||
    prefs.layouts.length > 0 ||
    prefs.rentMax !== null ||
    prefs.rentMin !== null ||
    prefs.walkingMax !== null ||
    prefs.sizeMin !== null
  );
}

/**
 * MansionWithStats に対してマッチスコア (0-100) を計算する。
 * スコアリング対象: エリア(30点), 家賃(25点), 駅近(10点)
 * 間取り・広さは MansionWithStats に情報がないためスキップ（満点扱い）。
 * 設定されていない条件は満点扱い。
 */
export function calculateMatchScore(
  mansion: MansionWithStats,
  prefs: UserPreferences
): number {
  // 条件が一切設定されていなければ -1（スコアなし）
  if (!hasPreferences(prefs)) return -1;

  let totalWeight = 0;
  let earnedScore = 0;

  // --- エリアマッチ (30点) ---
  if (prefs.areas.length > 0) {
    totalWeight += 30;
    const matched = prefs.areas.some((area) => mansion.address.includes(area));
    if (matched) earnedScore += 30;
  }

  // --- 家賃マッチ (25点) ---
  // MansionWithStats には直接家賃情報がないが、APIで matching_rent_range が付与される場合を考慮
  // ここではシンプルに: 家賃条件が設定されていても MansionWithStats 単体では判定不可なので
  // API側で既にフィルタされた前提で満点扱いにするか、
  // もし mansion に追加フィールドがあればそれを使う
  const mansionAny = mansion as unknown as Record<string, unknown>;
  if (prefs.rentMin !== null || prefs.rentMax !== null) {
    totalWeight += 25;
    // APIから matching_rent_range が返される場合
    if (mansionAny.matching_rent_range) {
      earnedScore += 25; // フィルタ済みなのでマッチ
    } else {
      // フィルタなしの場合は満点（判定不能）
      earnedScore += 25;
    }
  }

  // --- 駅近マッチ (10点) ---
  if (prefs.walkingMax !== null) {
    totalWeight += 10;
    if (mansion.walking_minutes <= prefs.walkingMax) {
      earnedScore += 10;
    }
  }

  // --- 間取りマッチ (25点) - MansionWithStatsでは判定不可、満点扱い ---
  if (prefs.layouts.length > 0) {
    totalWeight += 25;
    if (mansionAny.matching_layouts && Array.isArray(mansionAny.matching_layouts) && (mansionAny.matching_layouts as string[]).length > 0) {
      earnedScore += 25;
    } else if (!mansionAny.matching_layouts) {
      // API フィルタなしの場合は満点扱い
      earnedScore += 25;
    }
    // matching_layouts が空配列の場合は 0点
  }

  // --- 広さマッチ (10点) - MansionWithStatsでは判定不可、満点扱い ---
  if (prefs.sizeMin !== null) {
    totalWeight += 10;
    // API側でフィルタされていれば満点
    earnedScore += 10;
  }

  if (totalWeight === 0) return -1;

  return Math.round((earnedScore / totalWeight) * 100);
}

/**
 * マッチスコアに基づくバッジラベルを返す
 */
export function getMatchBadge(score: number): { label: string; className: string } | null {
  if (score < 0) return null;
  if (score >= 90) {
    return { label: "ぴったり", className: "bg-green-100 text-green-800" };
  }
  if (score >= 70) {
    return { label: "おすすめ", className: "bg-blue-100 text-blue-800" };
  }
  if (score >= 50) {
    return { label: "条件近い", className: "bg-yellow-100 text-yellow-800" };
  }
  return null;
}

export const AREA_OPTIONS = [
  "港区",
  "渋谷区",
  "千代田区",
  "新宿区",
  "品川区",
  "目黒区",
  "文京区",
];

export const LAYOUT_OPTIONS = ["1K", "1LDK", "2LDK", "3LDK", "4LDK"];
