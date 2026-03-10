"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatusTag } from "@/components/ui/status-tag";
import { ListSkeleton } from "@/components/ui/skeleton";
import { WatchConditionsModal } from "@/components/watch/watch-conditions-modal";
import type { MansionWithStats } from "@/types";
import {
  getWatchedMansionIds,
  getWatchEntry,
  addToWatchlist,
  removeFromWatchlist,
  type WatchConditions,
  DEFAULT_CONDITIONS,
} from "@/lib/watchlist";
import { getMemo, saveMemo } from "@/lib/memo";

function ConditionsSummary({ conditions }: { conditions: WatchConditions }) {
  const parts: string[] = [];
  if (conditions.rentMin || conditions.rentMax) {
    const min = conditions.rentMin ? `${conditions.rentMin}万` : "";
    const max = conditions.rentMax ? `${conditions.rentMax}万` : "";
    parts.push(`賃料: ${min}${min && max ? "〜" : ""}${max}`);
  }
  if (conditions.layouts.length > 0) {
    parts.push(`間取り: ${conditions.layouts.join(", ")}`);
  }
  if (conditions.sizeMin) {
    parts.push(`${conditions.sizeMin}㎡以上`);
  }
  if (conditions.walkingMax) {
    parts.push(`徒歩${conditions.walkingMax}分以内`);
  }
  if (parts.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {parts.map((part) => (
        <span
          key={part}
          className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700"
        >
          {part}
        </span>
      ))}
    </div>
  );
}

export default function WatchlistPage() {
  const [mansions, setMansions] = useState<MansionWithStats[]>([]);
  const [watchedIds, setWatchedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMemo, setEditingMemo] = useState<string | null>(null);
  const [memoText, setMemoText] = useState("");
  const [memos, setMemos] = useState<Record<string, string>>({});
  const [conditionsModal, setConditionsModal] = useState<string | null>(null);
  const [watchConditions, setWatchConditions] = useState<Record<string, WatchConditions>>({});

  useEffect(() => {
    setWatchedIds(getWatchedMansionIds());

    // 条件読み込み
    const ids = getWatchedMansionIds();
    const condMap: Record<string, WatchConditions> = {};
    for (const id of ids) {
      const entry = getWatchEntry(id);
      if (entry) condMap[id] = entry.conditions;
    }
    setWatchConditions(condMap);

    fetch("/api/mansions")
      .then((res) => {
        if (!res.ok) throw new Error("データの取得に失敗しました");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setMansions(data);
          const memoMap: Record<string, string> = {};
          for (const m of data) {
            const memo = getMemo(m.id);
            if (memo) memoMap[m.id] = memo;
          }
          setMemos(memoMap);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const watchedMansions = useMemo(
    () => mansions.filter((m) => watchedIds.includes(m.id)),
    [mansions, watchedIds]
  );

  const handleUnwatch = (mansionId: string) => {
    removeFromWatchlist(mansionId);
    setWatchedIds((prev) => prev.filter((id) => id !== mansionId));
  };

  const handleWatch = (mansionId: string) => {
    addToWatchlist(mansionId);
    setWatchedIds((prev) => [...prev, mansionId]);
  };

  const handleSaveMemo = (mansionId: string) => {
    saveMemo(mansionId, memoText);
    setMemos((prev) => {
      const next = { ...prev };
      if (memoText.trim()) {
        next[mansionId] = memoText.trim();
      } else {
        delete next[mansionId];
      }
      return next;
    });
    setEditingMemo(null);
    setMemoText("");
  };

  const handleConditionsSave = (mansionId: string, conditions: WatchConditions) => {
    setWatchConditions((prev) => ({ ...prev, [mansionId]: conditions }));
  };

  const unwatchedMansions = useMemo(
    () => mansions.filter((m) => !watchedIds.includes(m.id)),
    [mansions, watchedIds]
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          再試行
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
        <ListSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ウォッチリスト</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {watchedMansions.length}件の建物を監視中
          </p>
        </div>
        <Link
          href="/mansions"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          物件一覧から追加
        </Link>
      </div>

      {/* 監視中 */}
      {watchedMansions.length === 0 ? (
        <Card>
          <CardContent>
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-slate-500">
                監視中の建物はまだありません
              </p>
              <p className="mt-2 text-sm text-slate-400">
                物件一覧から気になる建物をウォッチリストに追加しましょう
              </p>
              <Link
                href="/mansions"
                className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                建物一覧を見る
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {watchedMansions.map((mansion, index) => (
            <Card
              key={mansion.id}
              className="animate-fade-in-up hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <CardContent>
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/mansions/${mansion.id}`} className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900">{mansion.name}</h3>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {mansion.nearest_station} 徒歩{mansion.walking_minutes}分 / {mansion.address}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      {mansion.active_listings_count > 0 ? (
                        <StatusTag status="active" />
                      ) : mansion.last_listing_date ? (
                        <StatusTag status="past" />
                      ) : (
                        <StatusTag status="unknown" />
                      )}
                      <span className="text-xs text-slate-400">
                        募集中: {mansion.active_listings_count}件
                      </span>
                    </div>
                  </Link>
                  <div className="flex flex-shrink-0 gap-2">
                    <button
                      onClick={() => setConditionsModal(mansion.id)}
                      className="rounded-lg border border-blue-200/60 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50/80"
                      title="監視条件を設定"
                    >
                      条件設定
                    </button>
                    <button
                      onClick={() => {
                        setEditingMemo(editingMemo === mansion.id ? null : mansion.id);
                        setMemoText(memos[mansion.id] || "");
                      }}
                      className="rounded-lg border border-slate-200/60 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      title="メモ"
                    >
                      {memos[mansion.id] ? "メモ編集" : "メモ追加"}
                    </button>
                    <button
                      onClick={() => handleUnwatch(mansion.id)}
                      className="rounded-lg border border-red-200/60 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50/80"
                    >
                      解除
                    </button>
                  </div>
                </div>

                {/* 条件サマリー */}
                {watchConditions[mansion.id] && (
                  <ConditionsSummary conditions={watchConditions[mansion.id]} />
                )}

                {/* メモ表示 */}
                {memos[mansion.id] && editingMemo !== mansion.id && (
                  <div className="mt-3 rounded-xl bg-amber-50/80 border border-amber-100/60 px-4 py-3 text-sm text-amber-800">
                    {memos[mansion.id]}
                  </div>
                )}

                {/* メモ編集 */}
                {editingMemo === mansion.id && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={memoText}
                      onChange={(e) => setMemoText(e.target.value)}
                      placeholder="この物件についてのメモ..."
                      className="w-full border-slate-200/60 focus:border-slate-400 focus:ring-2 focus:ring-slate-500/10 rounded-xl border px-3 py-2 text-sm focus:outline-none"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveMemo(mansion.id)}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => {
                          setEditingMemo(null);
                          setMemoText("");
                        }}
                        className="rounded-lg border border-slate-200/60 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 未監視の建物 */}
      {unwatchedMansions.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            その他の建物
          </h2>
          <div className="space-y-3">
            {unwatchedMansions.slice(0, 10).map((mansion, index) => (
              <Card
                key={mansion.id}
                className="animate-fade-in-up hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Link href={`/mansions/${mansion.id}`} className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900">{mansion.name}</h3>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {mansion.nearest_station} 徒歩{mansion.walking_minutes}分
                      </p>
                    </Link>
                    <button
                      onClick={() => handleWatch(mansion.id)}
                      className="ml-4 flex-shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      監視する
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {unwatchedMansions.length > 10 && (
              <p className="text-center text-sm text-slate-400">
                他 {unwatchedMansions.length - 10} 件 →{" "}
                <Link href="/mansions" className="text-blue-600 hover:underline">
                  建物一覧で確認
                </Link>
              </p>
            )}
          </div>
        </div>
      )}

      {/* 条件設定モーダル */}
      {conditionsModal && (
        <WatchConditionsModal
          mansionId={conditionsModal}
          mansionName={mansions.find((m) => m.id === conditionsModal)?.name || ""}
          initialConditions={watchConditions[conditionsModal] || { ...DEFAULT_CONDITIONS }}
          isOpen={true}
          onClose={() => setConditionsModal(null)}
          onSave={(conditions) => handleConditionsSave(conditionsModal, conditions)}
        />
      )}
    </div>
  );
}
