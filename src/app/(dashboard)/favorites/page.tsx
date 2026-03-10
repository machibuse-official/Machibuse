"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatusTag } from "@/components/ui/status-tag";
import { ListSkeleton } from "@/components/ui/skeleton";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { getFavorites } from "@/lib/favorites";
import type { MansionWithStats } from "@/types";

export default function FavoritesPage() {
  const [mansions, setMansions] = useState<MansionWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [favIds, setFavIds] = useState<string[]>([]);

  useEffect(() => {
    const favs = getFavorites("mansion");
    setFavIds(favs.map((f) => f.id));

    fetch("/api/mansions")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setMansions(data);
      })
      .finally(() => setLoading(false));
  }, []);

  // リアクティブに更新するために定期チェック
  useEffect(() => {
    const interval = setInterval(() => {
      const favs = getFavorites("mansion");
      setFavIds(favs.map((f) => f.id));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const favMansions = useMemo(
    () => mansions.filter((m) => favIds.includes(m.id)),
    [mansions, favIds]
  );

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
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-slate-900">お気に入り</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {favMansions.length}件の物件をお気に入り登録中
        </p>
      </div>

      {favMansions.length === 0 ? (
        <Card>
          <CardContent>
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50">
                <svg className="h-8 w-8 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-slate-500">
                お気に入りはまだありません
              </p>
              <p className="mt-2 text-sm text-slate-400">
                物件カードのハートマークをタップして追加しましょう
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
      ) : (
        <div className="space-y-3">
          {favMansions.map((mansion, index) => (
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
                  <FavoriteButton type="mansion" id={mansion.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
