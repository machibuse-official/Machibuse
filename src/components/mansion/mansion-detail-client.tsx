"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatusTag } from "@/components/ui/status-tag";
import { Button } from "@/components/ui/button";
import { PropertyMap } from "@/components/ui/property-map";
import { AddUnitModal, type UnitFormData } from "@/components/mansion/add-unit-modal";
import { ImageSlideshow } from "@/components/ui/image-slideshow";
import { isWatched as checkWatched, toggleWatchlist } from "@/lib/watchlist";
import type { MansionWithStats, UnitWithStats, Listing } from "@/types";

interface MansionDetailClientProps {
  mansion: MansionWithStats;
  initialUnits: UnitWithStats[];
  activeListings: (Listing & { unit?: UnitWithStats })[];
}

export function MansionDetailClient({
  mansion,
  initialUnits,
  activeListings,
}: MansionDetailClientProps) {
  const [units, setUnits] = useState(initialUnits);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [watched, setWatched] = useState(false);
  const [dbImages, setDbImages] = useState<{ url: string; type: string; caption: string | null }[]>([]);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    setWatched(checkWatched(mansion.id));
    // DB画像を取得
    fetch(`/api/mansions/${mansion.id}/images`)
      .then((res) => res.ok ? res.json() : [])
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDbImages(data.map((img: { image_url: string; image_type: string; caption: string | null }) => ({
            url: img.image_url,
            type: img.image_type,
            caption: img.caption,
          })));
        }
      })
      .catch(() => {})
      .finally(() => setImageLoading(false));
  }, [mansion.id]);

  async function handleAddUnit(data: UnitFormData) {
    const res = await fetch("/api/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const newUnit = await res.json();
      setUnits((prev) => [...prev, {
        ...newUnit,
        active_listings_count: 0,
        last_listing_date: null,
        last_rent_amount: null,
        is_watched: false,
        status: "unknown" as const,
      }]);
    }
  }

  function handleToggleWatch() {
    const nowWatched = toggleWatchlist(mansion.id);
    setWatched(nowWatched);
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/mansions"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; 建物一覧に戻る
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {mansion.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {mansion.address} / {mansion.nearest_station} 徒歩
            {mansion.walking_minutes}分
          </p>
          <p className="text-sm text-gray-400">
            {mansion.construction_date} / {mansion.floors}階建 /{" "}
            {mansion.total_units}戸 / {mansion.brand_type}
          </p>
        </div>
        <Button
          variant={watched ? "secondary" : "primary"}
          onClick={handleToggleWatch}
        >
          {watched ? "監視中" : "この建物を監視する"}
        </Button>
      </div>

      {/* 状況サマリ */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {mansion.active_listings_count}
            </p>
            <p className="text-xs text-gray-500">現在募集中</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {units.length}
            </p>
            <p className="text-xs text-gray-500">確認済タイプ</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {mansion.recent_listings_count}
            </p>
            <p className="text-xs text-gray-500">直近30日新着</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-sm font-bold text-gray-900">
              {mansion.last_listing_date || "-"}
            </p>
            <p className="text-xs text-gray-500">最終更新</p>
          </CardContent>
        </Card>
      </div>

      {/* 建物画像 */}
      {(() => {
        const displayImages = dbImages.length > 0
          ? dbImages
          : mansion.exterior_image_url
            ? [{ url: mansion.exterior_image_url, type: "exterior", caption: "外観" }]
            : [];
        if (imageLoading) {
          return <div className="h-72 animate-pulse rounded-lg bg-gray-200" />;
        }
        if (displayImages.length === 0) {
          return (
            <div className="flex h-48 items-center justify-center rounded-lg bg-gray-100">
              <div className="text-center">
                <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                </svg>
                <p className="mt-2 text-xs text-gray-400">画像を自動取得中...</p>
              </div>
            </div>
          );
        }
        return (
          <ImageSlideshow
            images={displayImages}
            alt={mansion.name}
            showThumbnails
          />
        );
      })()}

      {/* 建物詳細情報 */}
      <Card>
        <CardContent>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            建物詳細
          </h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {mansion.structure && (
              <div className="flex justify-between border-b border-gray-100 py-1.5">
                <dt className="text-sm text-gray-500">構造</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {mansion.structure}
                </dd>
              </div>
            )}
            {mansion.construction_date && (
              <div className="flex justify-between border-b border-gray-100 py-1.5">
                <dt className="text-sm text-gray-500">築年月</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {mansion.construction_date}
                </dd>
              </div>
            )}
            {mansion.total_units != null && (
              <div className="flex justify-between border-b border-gray-100 py-1.5">
                <dt className="text-sm text-gray-500">総戸数</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {mansion.total_units}戸
                </dd>
              </div>
            )}
            {mansion.floors != null && (
              <div className="flex justify-between border-b border-gray-100 py-1.5">
                <dt className="text-sm text-gray-500">階数</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {mansion.floors}階建
                </dd>
              </div>
            )}
            {mansion.management_company && (
              <div className="flex justify-between border-b border-gray-100 py-1.5">
                <dt className="text-sm text-gray-500">管理会社</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {mansion.management_company}
                </dd>
              </div>
            )}
            {mansion.pet_allowed != null && (
              <div className="flex justify-between border-b border-gray-100 py-1.5">
                <dt className="text-sm text-gray-500">ペット可</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {mansion.pet_allowed ? "可" : "不可"}
                </dd>
              </div>
            )}
            {mansion.parking_available != null && (
              <div className="flex justify-between border-b border-gray-100 py-1.5">
                <dt className="text-sm text-gray-500">駐車場</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {mansion.parking_available ? "あり" : "なし"}
                </dd>
              </div>
            )}
            {mansion.second_nearest_station && (
              <div className="flex justify-between border-b border-gray-100 py-1.5">
                <dt className="text-sm text-gray-500">2番目の最寄り駅</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {mansion.second_nearest_station}
                  {mansion.second_walking_minutes != null &&
                    ` 徒歩${mansion.second_walking_minutes}分`}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* 地図 */}
      {mansion.address && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">地図</h2>
          <PropertyMap
            latitude={mansion.latitude}
            longitude={mansion.longitude}
            address={mansion.address}
          />
        </div>
      )}

      {/* アクションバー */}
      <div className="flex gap-3">
        <Button
          variant={watched ? "secondary" : "primary"}
          onClick={handleToggleWatch}
        >
          {watched ? "監視中" : "建物を監視する"}
        </Button>
        <Button variant="outline" onClick={() => setShowAddUnit(true)}>
          + 間取りタイプを追加
        </Button>
      </div>

      {/* 間取りタイプ一覧 */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          間取りタイプ一覧
        </h2>
        <div className="space-y-3">
          {[...units]
            .sort((a, b) => {
              if (a.status === "active" && b.status !== "active") return -1;
              if (a.status !== "active" && b.status === "active") return 1;
              if (a.status === "past" && b.status === "unknown") return -1;
              if (a.status === "unknown" && b.status === "past") return 1;
              return b.size_sqm - a.size_sqm;
            })
            .map((unit) => (
              <Link key={unit.id} href={`/units/${unit.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {unit.layout_type} / {unit.size_sqm}㎡ /{" "}
                          {unit.direction}向き / {unit.floor_range}
                        </p>
                        <div className="mt-1 flex gap-1.5">
                          <StatusTag status={unit.status} />
                          {unit.last_listing_date && (
                            <span className="text-xs text-gray-400">
                              直近掲載: {unit.last_listing_date}
                            </span>
                          )}
                        </div>
                        {unit.last_rent_amount && (
                          <p className="mt-1 text-sm text-gray-500">
                            直近賃料:{" "}
                            {(unit.last_rent_amount / 10000).toFixed(1)}万円
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">&rarr;</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
        </div>
      </div>

      {/* 現在募集中住戸 */}
      {activeListings.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            現在募集中の住戸
          </h2>
          <div className="space-y-3">
            {activeListings.slice(0, 3).map((listing) => (
              <Link key={listing.id} href={`/listings/${listing.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {listing.unit?.layout_type} / {listing.unit?.size_sqm}㎡ /{" "}
                          {listing.floor}F
                        </p>
                        <p className="text-lg font-bold text-blue-600">
                          {(listing.current_rent / 10000).toFixed(1)}万円
                          <span className="ml-1 text-sm font-normal text-gray-500">
                            + 管理費
                            {listing.management_fee
                              ? `${(listing.management_fee / 10000).toFixed(1)}万円`
                              : "-"}
                          </span>
                        </p>
                        <p className="text-xs text-gray-400">
                          掲載元: {listing.source_site} / 検知:{" "}
                          {new Date(listing.detected_at).toLocaleDateString(
                            "ja-JP"
                          )}
                        </p>
                      </div>
                      <span className="text-gray-400">&rarr;</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 備考 */}
      {mansion.memo && (
        <Card>
          <CardContent>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">備考</h2>
            <p className="text-sm text-gray-600">{mansion.memo}</p>
          </CardContent>
        </Card>
      )}

      {/* 間取りタイプ追加モーダル */}
      <AddUnitModal
        isOpen={showAddUnit}
        onClose={() => setShowAddUnit(false)}
        mansionId={mansion.id}
        onSubmit={handleAddUnit}
      />
    </div>
  );
}
