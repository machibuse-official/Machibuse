"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusTag } from "@/components/ui/status-tag";
import { getCompareIds, removeFromCompare, clearCompare } from "@/lib/compare";
import type { MansionWithStats } from "@/types";

interface MansionDetail extends MansionWithStats {
  units: {
    id: string;
    layout_type: string;
    size_sqm: number;
    last_rent: number | null;
  }[];
}

export default function ComparePage() {
  const [mansions, setMansions] = useState<MansionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    const ids = getCompareIds();
    setCompareIds(ids);

    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    Promise.all([
      fetch("/api/mansions").then((r) => r.json()),
      ...ids.map((id) =>
        fetch(`/api/units?mansion_id=${id}`)
          .then((r) => r.json())
          .catch(() => [])
      ),
    ]).then(([allMansions, ...unitResults]) => {
      const mansionMap = new Map<string, MansionWithStats>();
      if (Array.isArray(allMansions)) {
        for (const m of allMansions) mansionMap.set(m.id, m);
      }

      const details: MansionDetail[] = ids
        .map((id, i) => {
          const mansion = mansionMap.get(id);
          if (!mansion) return null;
          return {
            ...mansion,
            units: Array.isArray(unitResults[i]) ? unitResults[i] : [],
          };
        })
        .filter(Boolean) as MansionDetail[];

      setMansions(details);
      setLoading(false);
    });
  }, []);

  const handleRemove = (id: string) => {
    removeFromCompare(id);
    setCompareIds((prev) => prev.filter((cid) => cid !== id));
    setMansions((prev) => prev.filter((m) => m.id !== id));
  };

  const handleClear = () => {
    clearCompare();
    setCompareIds([]);
    setMansions([]);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (compareIds.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">物件比較</h1>
        <Card>
          <CardContent>
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                <svg className="h-8 w-8 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <p className="text-lg font-medium text-slate-500">
                比較する物件を選んでください
              </p>
              <p className="mt-2 text-sm text-slate-400">
                物件一覧の「比較」ボタンから最大4件まで追加できます
              </p>
              <Link
                href="/mansions"
                className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                物件を探す
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 比較項目
  const compareRows: { label: string; getValue: (m: MansionDetail) => string }[] = [
    { label: "住所", getValue: (m) => m.address },
    { label: "最寄駅", getValue: (m) => `${m.nearest_station} 徒歩${m.walking_minutes}分` },
    {
      label: "2路線目",
      getValue: (m) =>
        m.second_nearest_station
          ? `${m.second_nearest_station} 徒歩${m.second_walking_minutes}分`
          : "-",
    },
    { label: "構造", getValue: (m) => m.structure || "-" },
    { label: "総戸数", getValue: (m) => (m.total_units ? `${m.total_units}戸` : "-") },
    { label: "築年", getValue: (m) => m.construction_date || "-" },
    { label: "ペット", getValue: (m) => (m.pet_allowed ? "可" : "不可") },
    { label: "駐車場", getValue: (m) => (m.parking_available ? "あり" : "なし") },
    { label: "管理会社", getValue: (m) => m.management_company || "-" },
    {
      label: "募集中",
      getValue: (m) => `${m.active_listings_count}件`,
    },
    {
      label: "間取りタイプ",
      getValue: (m) =>
        m.units.length > 0
          ? [...new Set(m.units.map((u) => u.layout_type))].join(", ")
          : "-",
    },
    {
      label: "賃料帯",
      getValue: (m) => {
        const rents = m.units
          .map((u) => u.last_rent)
          .filter((r): r is number => r !== null);
        if (rents.length === 0) return "-";
        const min = Math.min(...rents);
        const max = Math.max(...rents);
        if (min === max) return `${(min / 10000).toFixed(1)}万円`;
        return `${(min / 10000).toFixed(1)}〜${(max / 10000).toFixed(1)}万円`;
      },
    },
    {
      label: "面積帯",
      getValue: (m) => {
        const sizes = m.units.map((u) => u.size_sqm);
        if (sizes.length === 0) return "-";
        const min = Math.min(...sizes);
        const max = Math.max(...sizes);
        if (min === max) return `${min}㎡`;
        return `${min}〜${max}㎡`;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">物件比較</h1>
          <p className="mt-0.5 text-sm text-slate-500">{mansions.length}件を比較中</p>
        </div>
        <div className="flex gap-2">
          <Link href="/mansions">
            <Button variant="outline" size="sm">
              物件を追加
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            クリア
          </Button>
        </div>
      </div>

      {/* 比較テーブル */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          {/* ヘッダー: 物件名 */}
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-28 bg-slate-50 p-3 text-left text-xs font-medium text-slate-500">
                項目
              </th>
              {mansions.map((m) => (
                <th key={m.id} className="min-w-[200px] border-l border-slate-100 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/mansions/${m.id}`} className="text-left">
                      <p className="font-semibold text-slate-900 hover:text-blue-600">
                        {m.name}
                      </p>
                      <div className="mt-1">
                        <StatusTag
                          status={m.active_listings_count > 0 ? "active" : m.last_listing_date ? "past" : "unknown"}
                        />
                      </div>
                    </Link>
                    <button
                      onClick={() => handleRemove(m.id)}
                      className="flex-shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="比較から外す"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {compareRows.map((row, i) => (
              <tr key={row.label} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                <td className="sticky left-0 z-10 bg-inherit p-3 text-xs font-medium text-slate-500">
                  {row.label}
                </td>
                {mansions.map((m) => (
                  <td key={m.id} className="border-l border-slate-100 p-3 text-slate-900">
                    {row.getValue(m)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
