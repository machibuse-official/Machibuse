"use client";

import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from "react";
import Link from "next/link";
import { AddMansionModal, type MansionFormData } from "@/components/mansion/add-mansion-modal";
import { CompareModal } from "@/components/mansion/compare-modal";
import { ImageSlideshow } from "@/components/ui/image-slideshow";
import type { MansionWithStats } from "@/types";

const MansionMap = lazy(() => import("@/components/ui/mansion-map").then((m) => ({ default: m.MansionMap })));
import {
  type UserPreferences,
  loadPreferences,
  savePreferences,
  hasPreferences,
  calculateMatchScore,
  getMatchBadge,
  AREA_OPTIONS,
  LAYOUT_OPTIONS,
  FEATURE_CATEGORIES,
  RENT_OPTIONS,
  SIZE_OPTIONS,
  WALKING_OPTIONS,
  POPULAR_FEATURES,
} from "@/lib/preferences";
import {
  getWatchedMansionIds,
  toggleWatchlist,
} from "@/lib/watchlist";
// DB画像優先（APIが images[] を返す）、フォールバックは exterior_image_url

type SortKey = "updated_at" | "name" | "active_listings_count" | "walking_minutes" | "match";
type FilterKey = "all" | "watched" | "active";
type ViewMode = "search" | "results";

const ITEMS_PER_PAGE = 15;

/* ====================================================================
   nifty不動産 iOS完全再現
   ==================================================================== */
const NIFTY = {
  blue: "#007aff",
  red: "#ff3b30",
  green: "#34c759",
  orange: "#ff9500",
  gray1: "#8e8e93",
  gray2: "#c7c7cc",
  gray3: "#e5e5ea",
  gray4: "#f2f2f7",
  gray5: "#f9f9f9",
  bg: "#f2f2f7",
  black: "#000000",
  font: '-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", system-ui, sans-serif',
  rent: "#e5004f",
};

export default function MansionsPage() {
  const [mansions, setMansions] = useState<MansionWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [watchedIds, setWatchedIds] = useState<string[]>([]);
  const [searchPrefs, setSearchPrefs] = useState<UserPreferences>({
    areas: [], layouts: [], rentMax: null, rentMin: null,
    walkingMax: null, sizeMin: null, features: [],
  });
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  // モバイル: 初回は検索条件画面、2回目以降は結果画面
  const [mobileView, setMobileView] = useState<ViewMode>("search");
  const [mobileFilterTab, setMobileFilterTab] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  // フリーテキスト検索
  const [searchQuery, setSearchQuery] = useState("");
  // 比較機能
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  // 地図/リスト切り替え
  const [viewType, setViewType] = useState<"list" | "map">("list");

  const fetchMansions = useCallback(() => {
    setLoading(true);
    setError(null);

    const currentPrefs = loadPreferences();
    setPrefs(currentPrefs);
    setSearchPrefs({ ...currentPrefs });
    setWatchedIds(getWatchedMansionIds());

    if (hasPreferences(currentPrefs)) {
      setSortKey("match");
    }

    const params = new URLSearchParams();
    if (currentPrefs.layouts.length > 0) params.set("layouts", currentPrefs.layouts.join(","));
    if (currentPrefs.rentMin !== null) params.set("rent_min", String(currentPrefs.rentMin));
    if (currentPrefs.rentMax !== null) params.set("rent_max", String(currentPrefs.rentMax));
    if (currentPrefs.sizeMin !== null) params.set("size_min", String(currentPrefs.sizeMin));
    if (currentPrefs.features.length > 0) params.set("features", currentPrefs.features.join(","));

    const queryString = params.toString();
    const url = queryString ? `/api/mansions?${queryString}` : "/api/mansions";

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("データの取得に失敗しました");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setMansions(data);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchMansions();
    // 既に条件設定済みなら結果表示
    const saved = loadPreferences();
    if (hasPreferences(saved)) {
      setHasSearched(true);
      setMobileView("results");
    }
  }, [fetchMansions]);

  useEffect(() => {
    if (mobileView === "search") {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [mobileView]);

  function applySearch() {
    savePreferences(searchPrefs);
    setMobileView("results");
    setMobileFilterTab(null);
    setHasSearched(true);
    setPage(1);
    fetchMansions();
  }

  function resetSearch() {
    setSearchPrefs({
      areas: [], layouts: [], rentMax: null, rentMin: null,
      walkingMax: null, sizeMin: null, features: [],
    });
  }

  function toggleSearchArea(area: string) {
    setSearchPrefs((prev) => ({
      ...prev,
      areas: prev.areas.includes(area) ? prev.areas.filter((a) => a !== area) : [...prev.areas, area],
    }));
  }

  function toggleSearchLayout(layout: string) {
    setSearchPrefs((prev) => ({
      ...prev,
      layouts: prev.layouts.includes(layout) ? prev.layouts.filter((l) => l !== layout) : [...prev.layouts, layout],
    }));
  }

  function toggleSearchFeature(feature: string) {
    setSearchPrefs((prev) => ({
      ...prev,
      features: prev.features.includes(feature) ? prev.features.filter((f) => f !== feature) : [...prev.features, feature],
    }));
  }

  const scores = useMemo(() => {
    if (!prefs || !hasPreferences(prefs)) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const m of mansions) map.set(m.id, calculateMatchScore(m, prefs));
    return map;
  }, [mansions, prefs]);

  const filtered = useMemo(() => {
    let result = [...mansions];
    // フリーテキスト検索
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.address.toLowerCase().includes(q) ||
        m.nearest_station.toLowerCase().includes(q) ||
        (m.second_nearest_station && m.second_nearest_station.toLowerCase().includes(q)) ||
        (m.brand_type && m.brand_type.toLowerCase().includes(q))
      );
    }
    if (filter === "watched") result = result.filter((m) => watchedIds.includes(m.id));
    if (filter === "active") result = result.filter((m) => m.active_listings_count > 0);
    result.sort((a, b) => {
      switch (sortKey) {
        case "match": {
          const sa = scores.get(a.id) ?? -1;
          const sb = scores.get(b.id) ?? -1;
          if (sb !== sa) return sb - sa;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }
        case "name": return a.name.localeCompare(b.name, "ja");
        case "active_listings_count": return b.active_listings_count - a.active_listings_count;
        case "walking_minutes": return a.walking_minutes - b.walking_minutes;
        default: return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });
    return result;
  }, [mansions, sortKey, filter, scores, watchedIds]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  function handleToggleWatch(e: React.MouseEvent, mansionId: string) {
    e.preventDefault();
    e.stopPropagation();
    const nowWatched = toggleWatchlist(mansionId);
    setWatchedIds(nowWatched ? [...watchedIds, mansionId] : watchedIds.filter((id) => id !== mansionId));
  }

  function toggleCompare(e: React.MouseEvent, mansionId: string) {
    e.preventDefault();
    e.stopPropagation();
    setCompareIds((prev) =>
      prev.includes(mansionId)
        ? prev.filter((id) => id !== mansionId)
        : prev.length < 4
          ? [...prev, mansionId]
          : prev
    );
  }

  async function handleAddMansion(data: MansionFormData) {
    const res = await fetch("/api/mansions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await fetch("/api/mansions").then((r) => r.json());
      if (Array.isArray(updated)) setMansions(updated);
    }
  }

  const activeConditionCount =
    searchPrefs.areas.length + searchPrefs.layouts.length + searchPrefs.features.length +
    (searchPrefs.rentMin !== null ? 1 : 0) + (searchPrefs.rentMax !== null ? 1 : 0) +
    (searchPrefs.walkingMax !== null ? 1 : 0) + (searchPrefs.sizeMin !== null ? 1 : 0);

  /* ====================================================================
     モバイル検索条件画面（nifty iOS「検索条件」完全再現）
     ==================================================================== */
  const mobileSearchScreen = (
    <div className="fixed inset-0 z-[100] flex flex-col lg:hidden" style={{ fontFamily: NIFTY.font, background: NIFTY.bg }}>
      {/* ヘッダー: キャンセル | 検索条件 | 完了 */}
      <div className="flex items-center justify-between border-b border-[#c6c6c8] bg-[#f9f9f9] px-4 pb-2 pt-[max(env(safe-area-inset-top),12px)]">
        {hasSearched ? (
          <button onClick={() => setMobileView("results")} className="text-[17px] text-[#007aff]">キャンセル</button>
        ) : (
          <div className="w-20" />
        )}
        <span className="text-[17px] font-semibold text-[#000]">検索条件</span>
        <button onClick={applySearch} className="text-[17px] font-semibold text-[#007aff]">完了</button>
      </div>

      {/* スクロールエリア */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* エリア */}
        <div className="px-4 pt-6 pb-1">
          <p className="mb-2 pl-1 text-[13px] font-normal uppercase text-[#8e8e93]">エリア</p>
          <div className="rounded-[12px] bg-white overflow-hidden">
            {AREA_OPTIONS.map((area, i) => (
              <button key={area} onClick={() => toggleSearchArea(area)}
                className={`flex w-full items-center justify-between px-4 py-[14px] active:bg-[#e5e5ea]/50 ${i > 0 ? "border-t border-[#e5e5ea]/70" : ""}`}>
                <span className="text-[17px] text-[#000]">{area}</span>
                {searchPrefs.areas.includes(area) && (
                  <svg className="h-[20px] w-[20px] text-[#007aff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 駅からの距離 */}
        <div className="px-4 pt-6 pb-1">
          <p className="mb-2 pl-1 text-[13px] font-normal text-[#8e8e93]">駅からの距離</p>
          <div className="rounded-[12px] bg-white overflow-hidden">
            <div className="relative px-4 py-[14px]">
              <select value={searchPrefs.walkingMax ?? ""} onChange={(e) => setSearchPrefs((prev) => ({ ...prev, walkingMax: e.target.value === "" ? null : Number(e.target.value) }))}
                className="w-full appearance-none bg-transparent text-[17px] text-[#000] outline-none">
                {WALKING_OPTIONS.map((o) => <option key={o.value} value={o.value ?? ""}>{o.label === "指定なし" ? "こだわらない" : o.label}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#c7c7cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* 賃料 */}
        <div className="px-4 pt-6 pb-1">
          <p className="mb-2 pl-1 text-[13px] font-normal text-[#8e8e93]">賃料</p>
          <div className="rounded-[12px] bg-white overflow-hidden">
            <div className="flex items-center px-4 py-[14px]">
              <div className="relative flex-1">
                <select value={searchPrefs.rentMin ?? ""} onChange={(e) => setSearchPrefs((prev) => ({ ...prev, rentMin: e.target.value === "" ? null : Number(e.target.value) }))}
                  className="w-full appearance-none bg-transparent pr-6 text-[17px] text-[#000] outline-none">
                  {RENT_OPTIONS.map((o) => <option key={`min-${o.value}`} value={o.value ?? ""}>{o.value === null ? "下限なし" : o.label}</option>)}
                </select>
                <svg className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c7c7cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <span className="mx-4 text-[17px] text-[#8e8e93]">〜</span>
              <div className="relative flex-1">
                <select value={searchPrefs.rentMax ?? ""} onChange={(e) => setSearchPrefs((prev) => ({ ...prev, rentMax: e.target.value === "" ? null : Number(e.target.value) }))}
                  className="w-full appearance-none bg-transparent pr-6 text-[17px] text-[#000] outline-none">
                  {RENT_OPTIONS.map((o) => <option key={`max-${o.value}`} value={o.value ?? ""}>{o.value === null ? "上限なし" : o.label}</option>)}
                </select>
                <svg className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c7c7cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 間取り */}
        <div className="px-4 pt-6 pb-1">
          <p className="mb-2 pl-1 text-[13px] font-normal text-[#8e8e93]">間取り</p>
          <div className="grid grid-cols-4 gap-[8px]">
            {LAYOUT_OPTIONS.map((layout) => (
              <button key={layout} onClick={() => toggleSearchLayout(layout)}
                className={`rounded-[10px] py-[12px] text-center text-[15px] transition-colors ${
                  searchPrefs.layouts.includes(layout)
                    ? "bg-[#007aff] font-semibold text-white shadow-sm"
                    : "bg-white text-[#000]"
                }`}>
                {layout}
              </button>
            ))}
          </div>
        </div>

        {/* 専有面積 */}
        <div className="px-4 pt-6 pb-1">
          <p className="mb-2 pl-1 text-[13px] font-normal text-[#8e8e93]">専有面積</p>
          <div className="rounded-[12px] bg-white overflow-hidden">
            <div className="relative px-4 py-[14px]">
              <select value={searchPrefs.sizeMin ?? ""} onChange={(e) => setSearchPrefs((prev) => ({ ...prev, sizeMin: e.target.value === "" ? null : Number(e.target.value) }))}
                className="w-full appearance-none bg-transparent text-[17px] text-[#000] outline-none">
                {SIZE_OPTIONS.map((o) => <option key={o.value} value={o.value ?? ""}>{o.value === null ? "こだわらない" : `${o.label}以上`}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#c7c7cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* こだわり条件 */}
        <div className="px-4 pt-6 pb-1">
          <div className="mb-2 flex items-center justify-between pl-1">
            <p className="text-[13px] font-normal text-[#8e8e93]">
              こだわり条件{searchPrefs.features.length > 0 && ` (${searchPrefs.features.length})`}
            </p>
            {searchPrefs.features.length > 0 && (
              <button onClick={() => setSearchPrefs(prev => ({ ...prev, features: [] }))} className="text-[13px] text-[#007aff]">すべて解除</button>
            )}
          </div>
          <p className="mb-2 pl-1 text-[13px] text-[#8e8e93]">人気の条件</p>
          <div className="flex flex-wrap gap-[8px]">
            {POPULAR_FEATURES.map((feature) => (
              <button key={feature} onClick={() => toggleSearchFeature(feature)}
                className={`rounded-full px-[16px] py-[9px] text-[14px] transition-colors ${
                  searchPrefs.features.includes(feature)
                    ? "bg-[#007aff] font-semibold text-white shadow-sm"
                    : "bg-white text-[#000]"
                }`}>
                {feature}
              </button>
            ))}
          </div>
          {/* カテゴリ別展開 */}
          <button onClick={() => setShowAllFeatures(!showAllFeatures)}
            className="mt-4 w-full rounded-[12px] bg-white px-4 py-[14px] text-left text-[15px] text-[#007aff] active:bg-[#e5e5ea]/50">
            {showAllFeatures ? "カテゴリを閉じる" : "すべてのこだわり条件を見る"}
          </button>
          {showAllFeatures && (
            <div className="mt-2 space-y-[8px]">
              {FEATURE_CATEGORIES.map((cat) => {
                const open = expandedCategory === cat.label;
                const cnt = cat.options.filter((o) => searchPrefs.features.includes(o)).length;
                return (
                  <div key={cat.label} className="rounded-[12px] bg-white overflow-hidden">
                    <button onClick={() => setExpandedCategory(open ? null : cat.label)}
                      className="flex w-full items-center justify-between px-4 py-[14px] active:bg-[#e5e5ea]/50">
                      <span className="text-[16px] text-[#000]">{cat.icon} {cat.label}{cnt > 0 && <span className="ml-1 text-[14px] text-[#007aff]">({cnt})</span>}</span>
                      <svg className={`h-5 w-5 text-[#c7c7cc] transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {open && (
                      <div className="border-t border-[#e5e5ea]/70">
                        {cat.options.map((opt, i) => (
                          <button key={opt} onClick={() => toggleSearchFeature(opt)}
                            className={`flex w-full items-center justify-between px-4 py-[13px] active:bg-[#e5e5ea]/50 ${i > 0 ? "border-t border-[#e5e5ea]/50" : ""}`}>
                            <span className="text-[15px] text-[#000]">{opt}</span>
                            {searchPrefs.features.includes(opt) && (
                              <svg className="h-5 w-5 text-[#007aff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* リセットボタン */}
        <div className="px-4 pt-6 pb-4">
          <button onClick={resetSearch}
            className="w-full rounded-[12px] bg-white px-4 py-[14px] text-center text-[15px] text-[#ff3b30] active:bg-[#e5e5ea]/50">
            条件をリセット
          </button>
        </div>

        {/* 下部余白（フッター分） */}
        <div className="h-[100px]" />
      </div>

      {/* フッター: XX件 | 該当する物件を表示 */}
      <div className="border-t border-[#c6c6c8] bg-white px-5 pb-[max(env(safe-area-inset-bottom),8px)] pt-3">
        <div className="flex items-center justify-between">
          <p className="tabular-nums">
            <span className="text-[24px] font-bold text-[#000]">{filtered.length.toLocaleString()}</span>
            <span className="text-[15px] text-[#000]"> 件</span>
          </p>
          <button onClick={applySearch}
            className="rounded-[12px] bg-[#007aff] px-6 py-[12px] text-[16px] font-semibold text-white active:bg-[#0056d6] shadow-sm">
            該当する物件を表示
          </button>
        </div>
      </div>
    </div>
  );

  /* ====================================================================
     モバイル結果画面（nifty iOS物件一覧 完全再現）
     ==================================================================== */
  const FILTER_TABS = [
    { key: "area", label: "場所" },
    { key: "walking", label: "駅徒歩" },
    { key: "rent", label: "賃料" },
    { key: "layout", label: "間取り" },
    { key: "size", label: "専有面積" },
  ];

  const mobileResultsScreen = (
    <div className="flex flex-col min-h-screen lg:hidden" style={{ fontFamily: NIFTY.font, background: NIFTY.bg }}>
      {/* ヘッダー: < 条件 | 新着お知らせ | ソート */}
      <div className="sticky top-0 z-20 border-b border-[#c6c6c8] bg-[#f9f9f9]/95 backdrop-blur-md pt-[max(env(safe-area-inset-top),0px)]">
        <div className="flex items-center justify-between px-3 py-[10px]">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="text-[#007aff]">
              <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <button onClick={() => setMobileView("search")}
              className="flex items-center gap-1.5 rounded-full border border-[#007aff]/30 bg-white px-3 py-[6px] active:bg-[#007aff]/10">
              <svg className="h-[14px] w-[14px] text-[#007aff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <span className="text-[14px] font-medium text-[#007aff]">条件</span>
              {activeConditionCount > 0 && (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff3b30] px-1 text-[11px] font-bold text-white">{activeConditionCount}</span>
              )}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/notifications" className="flex items-center gap-1 rounded-full bg-white px-3 py-[6px] border border-[#e5e5ea]">
              <svg className="h-[14px] w-[14px] text-[#007aff]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="text-[13px] text-[#000]">新着お知らせ</span>
            </Link>
            <button onClick={() => setShowAddModal(true)}
              className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#007aff] shadow-sm active:bg-[#0056d6]">
              <svg className="h-[16px] w-[16px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* テキスト検索バー */}
      <div className="px-3 pt-2">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-[#8e8e93]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder="建物名・住所・駅名で検索"
            className="w-full rounded-[10px] bg-[#e5e5ea]/60 py-[9px] pl-9 pr-8 text-[15px] text-[#000] placeholder-[#8e8e93] outline-none focus:bg-white focus:ring-2 focus:ring-[#007aff]/30"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#8e8e93] p-0.5">
              <svg className="h-[12px] w-[12px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 件数 + フィルタ */}
      <div className="px-4 pt-3">
        <p className="text-[32px] font-bold tracking-tight text-[#000] tabular-nums leading-none">
          {filtered.length.toLocaleString()}<span className="text-[20px] font-bold">件</span>
        </p>
        <div className="mt-2 flex items-center gap-[6px]">
          {([
            { key: "all" as const, label: "すべて" },
            { key: "active" as const, label: "募集中" },
            { key: "watched" as const, label: "お気に入り" },
          ]).map((f) => (
            <button key={f.key} onClick={() => { setFilter(f.key); setPage(1); }}
              className={`rounded-full px-[14px] py-[6px] text-[13px] font-medium transition-colors ${
                filter === f.key
                  ? "bg-[#007aff] text-white shadow-sm"
                  : "bg-white text-[#000] border border-[#e5e5ea]"
              }`}>
              {f.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-full border border-[#e5e5ea] overflow-hidden">
              <button onClick={() => setViewType("list")} className={`px-2.5 py-[4px] text-[11px] font-medium ${viewType === "list" ? "bg-[#007aff] text-white" : "bg-white text-[#8e8e93]"}`}>
                リスト
              </button>
              <button onClick={() => setViewType("map")} className={`px-2.5 py-[4px] text-[11px] font-medium ${viewType === "map" ? "bg-[#007aff] text-white" : "bg-white text-[#8e8e93]"}`}>
                地図
              </button>
            </div>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="appearance-none bg-transparent text-[13px] text-[#007aff] outline-none pr-1">
              {prefs && hasPreferences(prefs) && <option value="match">おすすめ</option>}
              <option value="updated_at">新着順</option>
              <option value="walking_minutes">駅近順</option>
              <option value="active_listings_count">募集数順</option>
            </select>
          </div>
        </div>
      </div>

      {/* 物件リスト / 地図表示 */}
      <div className="flex-1 px-3 pt-3 pb-[120px]">
        {viewType === "map" ? (
          <div className="rounded-[16px] bg-white overflow-hidden shadow-sm" style={{ height: "60vh" }}>
            <Suspense fallback={<div className="flex items-center justify-center h-full text-[#8e8e93]">地図を読み込み中...</div>}>
              <MansionMap
                mansions={filtered.filter((m) => m.latitude && m.longitude)}
                watchedIds={watchedIds}
                onMansionClick={(id) => window.location.href = `/mansions/${id}`}
              />
            </Suspense>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[200px] animate-pulse rounded-[16px] bg-white" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 text-center">
            <p className="text-[17px] font-semibold text-[#000]">物件が見つかりませんでした</p>
            <p className="mt-1 text-[14px] text-[#8e8e93]">検索条件を変更してお試しください</p>
            <button onClick={() => setMobileView("search")}
              className="mt-4 rounded-[12px] bg-[#007aff] px-6 py-3 text-[16px] font-semibold text-white">
              条件を変更する
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {paginated.map((mansion) => {
              const score = scores.get(mansion.id) ?? -1;
              const badge = getMatchBadge(score);
              const isWatched = watchedIds.includes(mansion.id);
              const displayImages = (mansion.images && mansion.images.length > 0)
                ? mansion.images
                : mansion.exterior_image_url
                  ? [{ url: mansion.exterior_image_url, type: "exterior", caption: "外観" }]
                  : [];

              return (
                <div key={mansion.id} className="overflow-hidden rounded-[16px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
                  <Link href={`/mansions/${mansion.id}`} className="block">
                    <div className="flex">
                      {/* 画像 */}
                      <div className="relative w-[130px] shrink-0 bg-[#f2f2f7]">
                        {displayImages.length > 0 ? (
                          <ImageSlideshow images={displayImages} alt={mansion.name} className="h-full w-full" />
                        ) : (
                          <div className="flex h-full min-h-[170px] items-center justify-center">
                            <svg className="h-10 w-10 text-[#c7c7cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                            </svg>
                          </div>
                        )}
                        {mansion.recent_listings_count > 0 && (
                          <div className="absolute left-[8px] top-[8px] flex items-center gap-[4px]">
                            <span className="h-[9px] w-[9px] rounded-full bg-[#007aff] shadow-sm" />
                            <span className="rounded-[5px] bg-[#34c759] px-[6px] py-[3px] text-[10px] font-bold leading-[1] text-white shadow-sm">NEW</span>
                          </div>
                        )}
                      </div>

                      {/* 情報 */}
                      <div className="flex-1 min-w-0 px-[14px] py-[12px]">
                        {/* 募集数 + ハート */}
                        <div className="flex items-start justify-between">
                          {mansion.active_listings_count > 0 ? (
                            <p>
                              <span className="text-[26px] font-bold tabular-nums" style={{ color: NIFTY.rent }}>{mansion.active_listings_count}</span>
                              <span className="text-[13px] text-[#000] ml-0.5">件募集中</span>
                            </p>
                          ) : (
                            <p className="pt-1 text-[14px] text-[#8e8e93]">現在募集なし</p>
                          )}
                          <button onClick={(e) => handleToggleWatch(e, mansion.id)} className="shrink-0 p-1 -mr-1 -mt-0.5">
                            <svg className={`h-[28px] w-[28px] ${isWatched ? "text-[#ff3b30] fill-[#ff3b30]" : "text-[#c7c7cc] fill-none"}`}
                              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                            </svg>
                          </button>
                        </div>

                        {/* スペック（nifty完全再現: 略語+値 2列グリッド） */}
                        <div className="mt-[6px] grid grid-cols-2 gap-x-[6px] text-[12px] leading-[1.9]">
                          <p><span className="text-[#8e8e93]">間</span> <span className="font-bold text-[#000]">{mansion.known_unit_types_count}タイプ</span></p>
                          <p><span className="text-[#8e8e93]">階</span> <span className="text-[#000]">{mansion.floors ? `${mansion.floors}階建` : "-"}</span></p>
                          <p><span className="text-[#8e8e93]">築</span> <span className="text-[#000]">{mansion.construction_date || "-"}</span></p>
                          <p><span className="text-[#8e8e93]">戸</span> <span className="text-[#000]">{mansion.total_units ? `${mansion.total_units}戸` : "-"}</span></p>
                        </div>

                        {/* 住所 */}
                        <p className="mt-[6px] truncate text-[13px] font-bold text-[#000]">{mansion.address}</p>

                        {/* 駅（nifty: 駅名 歩XX分 (路線) + chevron） */}
                        <div className="mt-[4px] flex items-start justify-between">
                          <div className="text-[12px] text-[#000] leading-[1.7] min-w-0">
                            <p>{mansion.nearest_station} 歩<strong>{mansion.walking_minutes}</strong>分{mansion.brand_type && <span className="text-[#8e8e93]"> ({mansion.brand_type})</span>}</p>
                            {mansion.second_nearest_station && (
                              <p className="text-[#8e8e93]">{mansion.second_nearest_station} 歩<strong className="text-[#000]">{mansion.second_walking_minutes}</strong>分</p>
                            )}
                          </div>
                          <svg className="ml-1 mt-0.5 h-[18px] w-[18px] shrink-0 text-[#c7c7cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* バッジ + 更新日 */}
                    <div className="flex items-center gap-2 border-t border-[#f2f2f7] px-[14px] py-[8px]">
                      {badge && (
                        <span className={`rounded-full px-[8px] py-[3px] text-[11px] font-semibold ${
                          score >= 90 ? "bg-[#34c759]/15 text-[#248a3d]" :
                          score >= 70 ? "bg-[#007aff]/10 text-[#0055d4]" :
                          "bg-[#ff9500]/15 text-[#c93400]"
                        }`}>{badge.label}</span>
                      )}
                      <span className="text-[11px] text-[#c7c7cc]">更新 {new Date(mansion.updated_at).toLocaleDateString("ja-JP")}</span>
                    </div>
                  </Link>

                  {/* 物件名 + 比較 */}
                  <div className="border-t border-[#f2f2f7] px-[14px] py-[8px] flex items-center justify-between">
                    <p className="truncate text-[13px] font-bold text-[#007aff]">{mansion.name}</p>
                    <button onClick={(e) => toggleCompare(e, mansion.id)}
                      className={`shrink-0 ml-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border transition-colors ${
                        compareIds.includes(mansion.id)
                          ? "border-[#007aff] bg-[#007aff]/10 text-[#007aff]"
                          : "border-[#e5e5ea] text-[#8e8e93]"
                      }`}>
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h18M3 18h18" />
                      </svg>
                      比較
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-center gap-[6px]">
            <button onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo(0, 0); }} disabled={page === 1}
              className="rounded-[10px] bg-white px-4 py-[10px] text-[14px] text-[#007aff] disabled:text-[#c7c7cc]">前へ</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | "...")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] ?? 0) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`d-${i}`} className="text-[#c7c7cc]">...</span>
                ) : (
                  <button key={p} onClick={() => { setPage(p); window.scrollTo(0, 0); }}
                    className={`h-[38px] min-w-[38px] rounded-[10px] text-[14px] font-medium ${
                      page === p ? "bg-[#007aff] text-white" : "bg-white text-[#007aff]"
                    }`}>{p}</button>
                )
            )}
            <button onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo(0, 0); }} disabled={page === totalPages}
              className="rounded-[10px] bg-white px-4 py-[10px] text-[14px] text-[#007aff] disabled:text-[#c7c7cc]">次へ</button>
          </div>
        )}
      </div>

      {/* ボトムフィルタータブ（niftyの画面下部フィルター） */}
      <div className="fixed bottom-0 left-0 right-0 z-30">
        {/* 展開パネル */}
        {mobileFilterTab && (
          <div className="border-t border-[#e5e5ea] bg-white px-4 pb-2 pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]" style={{ fontFamily: NIFTY.font }}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] text-[#8e8e93]">{FILTER_TABS.find(t => t.key === mobileFilterTab)?.label}</p>
              <button onClick={() => {
                if (mobileFilterTab === "area") setSearchPrefs(p => ({ ...p, areas: [] }));
                if (mobileFilterTab === "walking") setSearchPrefs(p => ({ ...p, walkingMax: null }));
                if (mobileFilterTab === "rent") setSearchPrefs(p => ({ ...p, rentMin: null, rentMax: null }));
                if (mobileFilterTab === "layout") setSearchPrefs(p => ({ ...p, layouts: [] }));
                if (mobileFilterTab === "size") setSearchPrefs(p => ({ ...p, sizeMin: null }));
              }} className="text-[13px] text-[#007aff]">こだわらない</button>
            </div>

            {mobileFilterTab === "area" && (
              <div className="flex flex-wrap gap-[6px]">
                {AREA_OPTIONS.map((area) => (
                  <button key={area} onClick={() => toggleSearchArea(area)}
                    className={`rounded-full px-[14px] py-[8px] text-[14px] ${searchPrefs.areas.includes(area) ? "bg-[#007aff] text-white font-semibold" : "bg-[#f2f2f7] text-[#000]"}`}>
                    {area}
                  </button>
                ))}
              </div>
            )}
            {mobileFilterTab === "walking" && (
              <div className="rounded-[10px] bg-[#f2f2f7]">
                <div className="relative px-4 py-3">
                  <select value={searchPrefs.walkingMax ?? ""} onChange={(e) => setSearchPrefs((prev) => ({ ...prev, walkingMax: e.target.value === "" ? null : Number(e.target.value) }))}
                    className="w-full appearance-none bg-transparent text-[17px] text-[#000] outline-none">
                    {WALKING_OPTIONS.map((o) => <option key={o.value} value={o.value ?? ""}>{o.label === "指定なし" ? "こだわらない" : o.label}</option>)}
                  </select>
                  <svg className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c7c7cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            )}
            {mobileFilterTab === "rent" && (
              <div className="rounded-[10px] bg-[#f2f2f7]">
                <div className="flex items-center px-4 py-3">
                  <select value={searchPrefs.rentMin ?? ""} onChange={(e) => setSearchPrefs((prev) => ({ ...prev, rentMin: e.target.value === "" ? null : Number(e.target.value) }))}
                    className="flex-1 appearance-none bg-transparent text-[16px] text-[#000] outline-none">
                    {RENT_OPTIONS.map((o) => <option key={`m-${o.value}`} value={o.value ?? ""}>{o.value === null ? "下限なし" : o.label}</option>)}
                  </select>
                  <span className="mx-2 text-[#8e8e93]">〜</span>
                  <select value={searchPrefs.rentMax ?? ""} onChange={(e) => setSearchPrefs((prev) => ({ ...prev, rentMax: e.target.value === "" ? null : Number(e.target.value) }))}
                    className="flex-1 appearance-none bg-transparent text-[16px] text-[#000] outline-none">
                    {RENT_OPTIONS.map((o) => <option key={`x-${o.value}`} value={o.value ?? ""}>{o.value === null ? "上限なし" : o.label}</option>)}
                  </select>
                </div>
              </div>
            )}
            {mobileFilterTab === "layout" && (
              <div className="grid grid-cols-4 gap-[6px]">
                {LAYOUT_OPTIONS.map((layout) => (
                  <button key={layout} onClick={() => toggleSearchLayout(layout)}
                    className={`rounded-[8px] py-[10px] text-center text-[14px] ${searchPrefs.layouts.includes(layout) ? "bg-[#007aff] text-white font-semibold" : "bg-[#f2f2f7] text-[#000]"}`}>
                    {layout}
                  </button>
                ))}
              </div>
            )}
            {mobileFilterTab === "size" && (
              <div className="rounded-[10px] bg-[#f2f2f7]">
                <div className="relative px-4 py-3">
                  <select value={searchPrefs.sizeMin ?? ""} onChange={(e) => setSearchPrefs((prev) => ({ ...prev, sizeMin: e.target.value === "" ? null : Number(e.target.value) }))}
                    className="w-full appearance-none bg-transparent text-[17px] text-[#000] outline-none">
                    {SIZE_OPTIONS.map((o) => <option key={o.value} value={o.value ?? ""}>{o.value === null ? "こだわらない" : `${o.label}以上`}</option>)}
                  </select>
                  <svg className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c7c7cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            )}

            <button onClick={applySearch}
              className="mt-3 w-full rounded-[10px] bg-[#007aff] py-[12px] text-center text-[15px] font-semibold text-white active:bg-[#0056d6]">
              この条件で検索
            </button>
          </div>
        )}

        {/* タブバー */}
        <div className="flex border-t border-[#c6c6c8] bg-[#f9f9f9]/95 backdrop-blur-md pb-[max(env(safe-area-inset-bottom),0px)]">
          {FILTER_TABS.map((tab) => (
            <button key={tab.key} onClick={() => setMobileFilterTab(mobileFilterTab === tab.key ? null : tab.key)}
              className={`flex-1 py-[10px] text-center text-[11px] font-medium transition-colors ${
                mobileFilterTab === tab.key
                  ? "text-[#007aff] border-b-[2px] border-[#007aff]"
                  : "text-[#8e8e93]"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  /* ====================================================================
     デスクトップ用サイドバー（既存のniftyウェブ風）
     ==================================================================== */
  const selectClass = "w-full rounded-[2px] border border-[#bbb] bg-white px-[6px] py-[5px] text-[12px] text-[#333] focus:border-[#0066cc] focus:outline-none";

  const desktopSidebar = (
    <div style={{ fontFamily: '"Hiragino Kaku Gothic ProN", "Hiragino Sans", sans-serif' }}>
      <div className="bg-[#0066cc] px-3 py-2"><span className="text-[13px] font-bold text-white">検索条件の変更</span></div>
      <div className="border-b border-[#ddd] px-3 py-2.5">
        <p className="mb-1.5 text-[12px] font-bold text-[#333]">エリア</p>
        <div className="grid grid-cols-2 gap-x-1">
          {AREA_OPTIONS.map((area) => (
            <label key={area} className="flex cursor-pointer items-center gap-1.5 py-1">
              <input type="checkbox" checked={searchPrefs.areas.includes(area)} onChange={() => toggleSearchArea(area)} className="h-[14px] w-[14px] shrink-0 rounded-[2px] border-[#bbb] text-[#0066cc]" />
              <span className="text-[12px] text-[#333]">{area}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="border-b border-[#ddd] px-3 py-2.5">
        <p className="mb-1.5 text-[12px] font-bold text-[#333]">賃料</p>
        <div className="flex items-center gap-1">
          <select value={searchPrefs.rentMin ?? ""} onChange={(e) => setSearchPrefs((prev) => ({ ...prev, rentMin: e.target.value === "" ? null : Number(e.target.value) }))} className={selectClass}>
            {RENT_OPTIONS.map((o) => <option key={`min-${o.value}`} value={o.value ?? ""}>{o.value === null ? "下限なし" : `${o.label}以上`}</option>)}
          </select>
          <span className="shrink-0 text-[12px] text-[#999]">〜</span>
          <select value={searchPrefs.rentMax ?? ""} onChange={(e) => setSearchPrefs((prev) => ({ ...prev, rentMax: e.target.value === "" ? null : Number(e.target.value) }))} className={selectClass}>
            {RENT_OPTIONS.map((o) => <option key={`max-${o.value}`} value={o.value ?? ""}>{o.value === null ? "上限なし" : `${o.label}以下`}</option>)}
          </select>
        </div>
      </div>
      <div className="border-b border-[#ddd] px-3 py-2.5">
        <p className="mb-1.5 text-[12px] font-bold text-[#333]">間取り</p>
        <div className="grid grid-cols-4 gap-[3px]">
          {LAYOUT_OPTIONS.map((layout) => (
            <label key={layout} className={`flex h-[26px] cursor-pointer items-center justify-center rounded-[2px] border text-[11px] font-medium ${searchPrefs.layouts.includes(layout) ? "border-[#0066cc] bg-[#0066cc] text-white" : "border-[#bbb] bg-white text-[#333]"}`}>
              <input type="checkbox" checked={searchPrefs.layouts.includes(layout)} onChange={() => toggleSearchLayout(layout)} className="sr-only" />{layout}
            </label>
          ))}
        </div>
      </div>
      <div className="border-b border-[#ddd] px-3 py-2.5">
        <p className="mb-1.5 text-[12px] font-bold text-[#333]">専有面積</p>
        <select value={searchPrefs.sizeMin ?? ""} onChange={(e) => setSearchPrefs((prev) => ({ ...prev, sizeMin: e.target.value === "" ? null : Number(e.target.value) }))} className={selectClass}>
          {SIZE_OPTIONS.map((o) => <option key={o.value} value={o.value ?? ""}>{o.value === null ? "指定なし" : `${o.label}以上`}</option>)}
        </select>
      </div>
      <div className="border-b border-[#ddd] px-3 py-2.5">
        <p className="mb-1.5 text-[12px] font-bold text-[#333]">駅徒歩</p>
        <select value={searchPrefs.walkingMax ?? ""} onChange={(e) => setSearchPrefs((prev) => ({ ...prev, walkingMax: e.target.value === "" ? null : Number(e.target.value) }))} className={selectClass}>
          {WALKING_OPTIONS.map((o) => <option key={o.value} value={o.value ?? ""}>{o.label}</option>)}
        </select>
      </div>
      <div className="border-b border-[#ddd] px-3 py-2.5">
        <p className="mb-1.5 text-[12px] font-bold text-[#333]">こだわり条件{searchPrefs.features.length > 0 && <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-[2px] bg-[#e5004f] px-1 text-[10px] font-bold text-white">{searchPrefs.features.length}</span>}</p>
        {POPULAR_FEATURES.map((f) => (
          <label key={f} className="flex cursor-pointer items-center gap-1.5 py-1">
            <input type="checkbox" checked={searchPrefs.features.includes(f)} onChange={() => toggleSearchFeature(f)} className="h-[14px] w-[14px] shrink-0 rounded-[2px] border-[#bbb] text-[#0066cc]" />
            <span className="text-[12px] text-[#333]">{f}</span>
          </label>
        ))}
      </div>
      <div className="sticky bottom-0 border-t border-[#ddd] bg-white px-3 py-2.5">
        <button onClick={applySearch} className="flex h-10 w-full items-center justify-center rounded-[3px] bg-[#0066cc] text-[14px] font-bold text-white hover:bg-[#0055b3]">この条件で検索する</button>
        <div className="mt-1.5 flex justify-center"><button onClick={resetSearch} className="text-[11px] text-[#0066cc] underline">条件をリセット</button></div>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-sm text-[#cc0000]">{error}</p>
        <button onClick={fetchMansions} className="rounded-[10px] bg-[#007aff] px-6 py-2.5 text-sm font-medium text-white">再試行</button>
      </div>
    );
  }

  /* ====================================================================
     レンダリング
     ==================================================================== */
  return (
    <>
      {/* === モバイル === */}
      <div className="lg:hidden">
        {mobileView === "search" ? mobileSearchScreen : mobileResultsScreen}
      </div>

      {/* === デスクトップ === */}
      <div className="hidden lg:flex -m-8 h-[calc(100vh-56px)] bg-white">
        <aside className="w-[260px] shrink-0 border-r border-[#e0e0e0] bg-white overflow-y-auto">
          {desktopSidebar}
        </aside>
        <div className="flex-1 min-w-0 bg-[#f5f5f5] overflow-y-auto">
          {/* デスクトップヘッダー */}
          <div className="sticky top-0 z-10 bg-white border-b border-[#ddd]">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#eee]">
              <div className="flex items-center gap-3">
                <h1 className="text-[15px] font-bold text-[#333] shrink-0">賃貸物件一覧</h1>
                <div className="relative flex-1 max-w-[320px]">
                  <svg className="absolute left-2.5 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[#999]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    placeholder="建物名・住所・駅名で検索"
                    className="w-full rounded-[4px] border border-[#ccc] bg-white py-[5px] pl-8 pr-6 text-[12px] text-[#333] placeholder-[#999] outline-none focus:border-[#0066cc]"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#333]">
                      <svg className="h-[12px] w-[12px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <span className="text-xs text-[#999] shrink-0">{filtered.length}件</span>
              </div>
              <div className="flex items-center gap-2">
                {/* 地図/リスト切り替え */}
                <div className="flex rounded-sm border border-[#ccc] overflow-hidden">
                  <button onClick={() => setViewType("list")} className={`px-2.5 py-1 text-[11px] font-medium ${viewType === "list" ? "bg-[#0066cc] text-white" : "bg-white text-[#666]"}`}>
                    リスト
                  </button>
                  <button onClick={() => setViewType("map")} className={`px-2.5 py-1 text-[11px] font-medium ${viewType === "map" ? "bg-[#0066cc] text-white" : "bg-white text-[#666]"}`}>
                    地図
                  </button>
                </div>
                <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 rounded bg-[#0066cc] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0055aa]">
                  <span className="text-sm leading-none">+</span> 建物を登録
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#f9f9f9]">
              <div className="flex items-center gap-1">
                {([{ key: "all" as const, label: "すべて", count: mansions.length }, { key: "active" as const, label: "募集中あり", count: mansions.filter(m => m.active_listings_count > 0).length }, { key: "watched" as const, label: "お気に入り", count: watchedIds.length }]).map((f) => (
                  <button key={f.key} onClick={() => { setFilter(f.key); setPage(1); }} className={`rounded-sm px-2.5 py-1 text-[11px] font-medium border ${filter === f.key ? "border-[#0066cc] bg-[#0066cc] text-white" : "border-[#ccc] bg-white text-[#666]"}`}>{f.label} ({f.count})</button>
                ))}
              </div>
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="rounded-sm border border-[#ccc] bg-white px-2 py-1 text-[11px] text-[#333]">
                {prefs && hasPreferences(prefs) && <option value="match">おすすめ順</option>}
                <option value="updated_at">新着順</option>
                <option value="walking_minutes">駅から近い順</option>
                <option value="active_listings_count">募集数が多い順</option>
                <option value="name">名前順</option>
              </select>
            </div>
          </div>
          {/* 件数 */}
          <div className="px-4 py-2 text-[11px] text-[#666] border-b border-[#eee] bg-white">
            <strong className="text-[#333]">{filtered.length}件</strong>中 {Math.min((page - 1) * ITEMS_PER_PAGE + 1, filtered.length)}〜{Math.min(page * ITEMS_PER_PAGE, filtered.length)}件を表示
          </div>
          {/* 物件リスト / 地図表示 */}
          <div className="px-4 py-3">
            {viewType === "map" ? (
              <div className="rounded-lg border border-[#ddd] bg-white overflow-hidden" style={{ height: "calc(100vh - 160px)" }}>
                <Suspense fallback={<div className="flex items-center justify-center h-full text-[#999]">地図を読み込み中...</div>}>
                  <MansionMap
                    mansions={filtered.filter((m) => m.latitude && m.longitude)}
                    watchedIds={watchedIds}
                    onMansionClick={(id) => window.location.href = `/mansions/${id}`}
                  />
                </Suspense>
              </div>
            ) : loading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-[160px] animate-pulse rounded bg-white border border-[#ddd]" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="rounded border border-[#ddd] bg-white px-6 py-16 text-center"><p className="text-sm text-[#666]">条件に一致する物件が見つかりませんでした</p></div>
            ) : (
              <div className="space-y-3">
                {paginated.map((mansion) => {
                  const score = scores.get(mansion.id) ?? -1;
                  const badge = getMatchBadge(score);
                  const isWatched = watchedIds.includes(mansion.id);
                  const displayImages = (mansion.images && mansion.images.length > 0)
                    ? mansion.images
                    : mansion.exterior_image_url
                      ? [{ url: mansion.exterior_image_url, type: "exterior", caption: "外観" }]
                      : [];
                  return (
                    <div key={mansion.id} className="rounded-[8px] border border-[#e8e8e8] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden hover:shadow-[0_2px_12px_rgba(0,0,0,0.1)] transition-shadow">
                      <Link href={`/mansions/${mansion.id}`} className="block">
                        <div className="flex">
                          <div className="relative w-[160px] shrink-0 bg-[#f0f0f0]">
                            {displayImages.length > 0 ? <ImageSlideshow images={displayImages} alt={mansion.name} className="h-full w-full" /> : (
                              <div className="flex h-full min-h-[140px] items-center justify-center"><svg className="h-8 w-8 text-[#ccc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" /></svg></div>
                            )}
                            {mansion.recent_listings_count > 0 && (<div className="absolute left-[6px] top-[6px] flex items-center gap-[3px]"><span className="h-[8px] w-[8px] rounded-full bg-[#007aff]" /><span className="rounded-[3px] bg-[#34c759] px-[5px] py-[2px] text-[10px] font-bold leading-[1] text-white">NEW</span></div>)}
                          </div>
                          <div className="flex-1 min-w-0 px-3 py-2.5">
                            <div className="flex items-start justify-between">
                              {mansion.active_listings_count > 0 ? (
                                <p><span className="text-[22px] font-bold text-[#e5004f] tabular-nums">{mansion.active_listings_count}</span><span className="text-[12px] text-[#333]">件募集中</span></p>
                              ) : (<p className="text-[13px] text-[#999]">現在募集なし</p>)}
                              <button onClick={(e) => handleToggleWatch(e, mansion.id)} className="shrink-0 ml-1">
                                <svg className={`h-[24px] w-[24px] ${isWatched ? "text-[#e5004f] fill-[#e5004f]" : "text-[#ccc] fill-none"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                              </button>
                            </div>
                            <div className="mt-1 grid grid-cols-3 gap-x-2 text-[11px] leading-[1.6]">
                              <p><span className="text-[#999] font-bold">間</span> <span className="font-bold text-[#333]">{mansion.known_unit_types_count}タイプ</span></p>
                              <p><span className="text-[#999] font-bold">階</span> <span className="text-[#333]">{mansion.floors ? `${mansion.floors}階建` : "-"}</span></p>
                              <p><span className="text-[#999] font-bold">築</span> <span className="text-[#333]">{mansion.construction_date || "-"}</span></p>
                              <p><span className="text-[#999] font-bold">戸</span> <span className="text-[#333]">{mansion.total_units ? `${mansion.total_units}戸` : "-"}</span></p>
                              <p className="col-span-2"><span className="text-[#999] font-bold">構</span> <span className="text-[#333] truncate">{mansion.structure || "-"}</span></p>
                            </div>
                            <p className="mt-1 truncate text-[12px] font-bold text-[#333]">{mansion.address}</p>
                            <div className="mt-0.5 text-[12px] text-[#333] leading-[1.5]">
                              <p>{mansion.nearest_station} 歩<strong>{mansion.walking_minutes}</strong>分{mansion.brand_type && <span className="text-[#999]"> ({mansion.brand_type})</span>}</p>
                              {mansion.second_nearest_station && <p className="text-[#666]">{mansion.second_nearest_station} 歩<strong>{mansion.second_walking_minutes}</strong>分</p>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-[#eee] px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            {badge && <span className={`rounded-[3px] px-1.5 py-0.5 text-[10px] font-bold ${score >= 90 ? "bg-[#e8f5e9] text-[#2e7d32]" : score >= 70 ? "bg-[#e3f2fd] text-[#1565c0]" : "bg-[#fff3e0] text-[#e65100]"}`}>{badge.label}</span>}
                            <span className="text-[10px] text-[#999]">更新 {new Date(mansion.updated_at).toLocaleDateString("ja-JP")}</span>
                          </div>
                          <span className="text-[11px] font-bold text-[#0066cc]">詳細を見る &gt;</span>
                        </div>
                      </Link>
                      <div className="border-t border-[#eee] bg-[#fafafa] px-3 py-1.5 flex items-center justify-between">
                        <p className="truncate text-[13px] font-bold text-[#0066cc]">{mansion.name}</p>
                        <button onClick={(e) => toggleCompare(e, mansion.id)}
                          className={`shrink-0 ml-2 flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-medium border transition-colors ${
                            compareIds.includes(mansion.id)
                              ? "border-[#0066cc] bg-[#0066cc]/10 text-[#0066cc]"
                              : "border-[#ccc] text-[#999]"
                          }`}>
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h18M3 18h18" />
                          </svg>
                          比較
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-0.5 text-[13px]">
                <button onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo(0, 0); }} disabled={page === 1} className="rounded-sm border border-[#ccc] bg-white px-3 py-1.5 text-[#0066cc] disabled:text-[#ccc]">&lt; 前へ</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2).reduce<(number | "...")[]>((a, p, i, arr) => { if (i > 0 && p - (arr[i-1] ?? 0) > 1) a.push("..."); a.push(p); return a; }, []).map((p, i) => p === "..." ? <span key={`d-${i}`} className="px-1.5 text-[#999]">...</span> : <button key={p} onClick={() => { setPage(p); window.scrollTo(0, 0); }} className={`rounded-sm border px-3 py-1.5 font-medium ${page === p ? "border-[#0066cc] bg-[#0066cc] text-white" : "border-[#ccc] bg-white text-[#0066cc]"}`}>{p}</button>)}
                <button onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo(0, 0); }} disabled={page === totalPages} className="rounded-sm border border-[#ccc] bg-white px-3 py-1.5 text-[#0066cc] disabled:text-[#ccc]">次へ &gt;</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddMansionModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleAddMansion} />

      {/* 比較フローティングバー */}
      {compareIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-[150] -translate-x-1/2 flex items-center gap-3 rounded-full bg-[#333] px-5 py-3 shadow-2xl lg:bottom-6">
          <span className="text-[13px] font-medium text-white">{compareIds.length}件選択中</span>
          <button
            onClick={() => setShowCompare(true)}
            className="rounded-full bg-[#007aff] px-4 py-1.5 text-[13px] font-bold text-white active:bg-[#0056d6]"
          >
            比較する
          </button>
          <button
            onClick={() => setCompareIds([])}
            className="rounded-full bg-white/20 px-3 py-1.5 text-[12px] text-white"
          >
            クリア
          </button>
        </div>
      )}

      {/* 比較モーダル */}
      <CompareModal
        isOpen={showCompare}
        onClose={() => setShowCompare(false)}
        mansions={mansions.filter((m) => compareIds.includes(m.id))}
        onRemove={(id) => {
          setCompareIds((prev) => prev.filter((cid) => cid !== id));
          if (compareIds.length <= 1) setShowCompare(false);
        }}
      />
    </>
  );
}
