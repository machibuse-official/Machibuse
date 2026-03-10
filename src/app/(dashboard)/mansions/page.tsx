"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatusTag } from "@/components/ui/status-tag";
import { AddMansionModal, type MansionFormData } from "@/components/mansion/add-mansion-modal";
import { CardSkeleton } from "@/components/ui/skeleton";
import type { MansionWithStats } from "@/types";
import {
  type UserPreferences,
  loadPreferences,
  hasPreferences,
  calculateMatchScore,
  getMatchBadge,
} from "@/lib/preferences";

type SortKey = "updated_at" | "name" | "active_listings_count" | "walking_minutes" | "match";
type FilterKey = "all" | "watched" | "active";

const ITEMS_PER_PAGE = 9;

export default function MansionsPage() {
  const [mansions, setMansions] = useState<MansionWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);

  const fetchMansions = useCallback(() => {
    setLoading(true);
    setError(null);

    // 希望条件をlocalStorageから読み込み
    const currentPrefs = loadPreferences();
    setPrefs(currentPrefs);

    // 希望条件がある場合、デフォルトソートを「おすすめ順」に
    if (hasPreferences(currentPrefs)) {
      setSortKey("match");
    }

    // フィルタ用クエリパラメータを構築
    const params = new URLSearchParams();
    if (currentPrefs.layouts.length > 0) {
      params.set("layouts", currentPrefs.layouts.join(","));
    }
    if (currentPrefs.rentMin !== null) {
      params.set("rent_min", String(currentPrefs.rentMin));
    }
    if (currentPrefs.rentMax !== null) {
      params.set("rent_max", String(currentPrefs.rentMax));
    }
    if (currentPrefs.sizeMin !== null) {
      params.set("size_min", String(currentPrefs.sizeMin));
    }

    const queryString = params.toString();
    const url = queryString ? `/api/mansions?${queryString}` : "/api/mansions";

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("データの取得に失敗しました");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setMansions(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchMansions();
  }, [fetchMansions]);

  // スコアキャッシュ
  const scores = useMemo(() => {
    if (!prefs || !hasPreferences(prefs)) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const m of mansions) {
      map.set(m.id, calculateMatchScore(m, prefs));
    }
    return map;
  }, [mansions, prefs]);

  const filtered = useMemo(() => {
    let result = [...mansions];

    if (filter === "watched") result = result.filter((m) => m.is_watched);
    if (filter === "active") result = result.filter((m) => m.active_listings_count > 0);

    result.sort((a, b) => {
      switch (sortKey) {
        case "match": {
          const sa = scores.get(a.id) ?? -1;
          const sb = scores.get(b.id) ?? -1;
          if (sb !== sa) return sb - sa;
          // 同スコアの場合は更新日順
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }
        case "name":
          return a.name.localeCompare(b.name, "ja");
        case "active_listings_count":
          return b.active_listings_count - a.active_listings_count;
        case "walking_minutes":
          return a.walking_minutes - b.walking_minutes;
        case "updated_at":
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

    return result;
  }, [mansions, sortKey, filter, scores]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  async function handleAddMansion(data: MansionFormData) {
    const res = await fetch("/api/mansions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      // リロードして最新データ取得
      const updated = await fetch("/api/mansions").then((r) => r.json());
      if (Array.isArray(updated)) setMansions(updated);
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={fetchMansions}
          className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          再試行
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-10 w-32 animate-pulse rounded-lg bg-slate-200" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">建物一覧</h1>
          <p className="mt-0.5 text-sm text-slate-500">トラッキング中の全物件</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          + 建物を登録
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 text-sm">
          {(
            [
              { key: "all", label: "すべて" },
              { key: "watched", label: "監視中のみ" },
              { key: "active", label: "募集中あり" },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setPage(1); }}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">並び替え:</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400/20"
          >
            {prefs && hasPreferences(prefs) && (
              <option value="match">おすすめ順</option>
            )}
            <option value="updated_at">更新日順</option>
            <option value="name">名前順</option>
            <option value="active_listings_count">募集数順</option>
            <option value="walking_minutes">駅近順</option>
          </select>
        </div>
      </div>

      <p className="text-sm tabular-nums text-slate-500">
        {filtered.length}件中 {Math.min((page - 1) * ITEMS_PER_PAGE + 1, filtered.length)}-{Math.min(page * ITEMS_PER_PAGE, filtered.length)}件を表示
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {paginated.map((mansion) => {
          const score = scores.get(mansion.id) ?? -1;
          const badge = getMatchBadge(score);
          return (
          <Link key={mansion.id} href={`/mansions/${mansion.id}`}>
            <Card className="transition-all hover:shadow-md">
              <CardContent>
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-slate-900">
                      {mansion.name}
                    </h3>
                    <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                      <svg className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      {mansion.nearest_station} 徒歩{mansion.walking_minutes}分
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {mansion.construction_date} / {mansion.floors}階建 /{" "}
                      {mansion.total_units}戸
                    </p>
                  </div>
                  <div className="ml-2 flex flex-shrink-0 flex-col items-end gap-1.5">
                    {badge && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                        {badge.label} {score}%
                      </span>
                    )}
                    {mansion.is_watched && (
                      <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        監視中
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {mansion.active_listings_count > 0 && <StatusTag status="active" />}
                  {mansion.active_listings_count === 0 && mansion.last_listing_date && <StatusTag status="past" />}
                  {!mansion.last_listing_date && <StatusTag status="unknown" />}
                  {mansion.recent_listings_count > 0 && <StatusTag status="new" />}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                  <div>
                    <p className="text-lg font-bold tabular-nums text-slate-900">{mansion.active_listings_count}</p>
                    <p className="text-xs text-slate-500">募集中</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold tabular-nums text-slate-900">{mansion.known_unit_types_count}</p>
                    <p className="text-xs text-slate-500">確認タイプ</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold tabular-nums text-slate-900">{mansion.recent_listings_count}</p>
                    <p className="text-xs text-slate-500">30日新着</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            前へ
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                page === p
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            次へ
          </button>
        </div>
      )}

      <AddMansionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddMansion}
      />
    </div>
  );
}
