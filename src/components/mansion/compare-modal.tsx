"use client";

import type { MansionWithStats } from "@/types";
import Link from "next/link";

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  mansions: MansionWithStats[];
  onRemove: (id: string) => void;
}

export function CompareModal({ isOpen, onClose, mansions, onRemove }: CompareModalProps) {
  if (!isOpen || mansions.length === 0) return null;

  const rows: { label: string; getValue: (m: MansionWithStats) => string }[] = [
    { label: "住所", getValue: (m) => m.address },
    { label: "最寄駅", getValue: (m) => `${m.nearest_station} 徒歩${m.walking_minutes}分` },
    { label: "2番目の駅", getValue: (m) => m.second_nearest_station ? `${m.second_nearest_station} 徒歩${m.second_walking_minutes}分` : "-" },
    { label: "築年月", getValue: (m) => m.construction_date || "-" },
    { label: "構造", getValue: (m) => m.structure || "-" },
    { label: "階数", getValue: (m) => m.floors ? `${m.floors}階建` : "-" },
    { label: "総戸数", getValue: (m) => m.total_units ? `${m.total_units}戸` : "-" },
    { label: "ブランド", getValue: (m) => m.brand_type || "-" },
    { label: "管理会社", getValue: (m) => m.management_company || "-" },
    { label: "ペット可", getValue: (m) => m.pet_allowed ? "可" : "不可" },
    { label: "駐車場", getValue: (m) => m.parking_available ? "あり" : "なし" },
    { label: "募集中", getValue: (m) => m.active_listings_count > 0 ? `${m.active_listings_count}件` : "なし" },
    { label: "間取りタイプ数", getValue: (m) => `${m.known_unit_types_count}タイプ` },
    { label: "直近30日新着", getValue: (m) => `${m.recent_listings_count}件` },
    { label: "最終更新", getValue: (m) => m.last_listing_date || "-" },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-[900px] overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#eee] bg-white px-4 py-3">
          <h2 className="text-[16px] font-bold text-[#333]">物件比較 ({mansions.length}件)</h2>
          <button onClick={onClose} className="rounded-full bg-[#f2f2f7] p-2">
            <svg className="h-4 w-4 text-[#666]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 比較テーブル */}
        <div className="overflow-auto max-h-[calc(90vh-60px)]">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-[#eee]">
                <th className="w-[100px] shrink-0 bg-[#f9f9f9] px-3 py-2 text-left text-[11px] font-bold text-[#999]">項目</th>
                {mansions.map((m) => (
                  <th key={m.id} className="min-w-[180px] px-3 py-2 text-left">
                    <div className="flex items-start justify-between">
                      <Link href={`/mansions/${m.id}`} className="text-[13px] font-bold text-[#0066cc] hover:underline line-clamp-2">{m.name}</Link>
                      <button onClick={() => onRemove(m.id)} className="shrink-0 ml-1 rounded-full bg-[#f2f2f7] p-0.5">
                        <svg className="h-3 w-3 text-[#999]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? "bg-white" : "bg-[#fafafa]"}>
                  <td className="px-3 py-2 text-[11px] font-bold text-[#999] whitespace-nowrap bg-[#f9f9f9] border-r border-[#eee]">{row.label}</td>
                  {mansions.map((m) => {
                    const val = row.getValue(m);
                    const isHighlight = row.label === "募集中" && m.active_listings_count > 0;
                    return (
                      <td key={m.id} className={`px-3 py-2 text-[12px] ${isHighlight ? "font-bold text-[#e5004f]" : "text-[#333]"}`}>
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
