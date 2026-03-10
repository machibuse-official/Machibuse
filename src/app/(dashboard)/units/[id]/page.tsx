import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { StatusTag } from "@/components/ui/status-tag";
import { WatchUnitButton } from "@/components/unit/watch-unit-button";
import { AddListingSection } from "@/components/listing/add-listing-section";
import { RentHistoryChart } from "@/components/chart/rent-history-chart";
import { FeatureTags } from "@/components/ui/feature-tags";
import {
  getUnitById,
  getMansionById,
  getListingsByUnitId,
  getUnitsByMansionId,
} from "@/lib/queries";

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const unit = await getUnitById(id);
  if (!unit) notFound();

  const mansion = await getMansionById(unit.mansion_id);
  const listings = await getListingsByUnitId(unit.id);
  const activeListings = listings.filter((l) => l.status === "active");
  const pastListings = listings.filter((l) => l.status !== "active");

  // 類似住戸
  const allUnits = await getUnitsByMansionId(unit.mansion_id);
  const similarUnits = allUnits.filter(
    (u) =>
      u.id !== unit.id &&
      (u.layout_type === unit.layout_type ||
        Math.abs(u.size_sqm - unit.size_sqm) < 15)
  );

  return (
    <div className="space-y-6">
      {/* パンくず */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/mansions" className="hover:text-gray-700">
          建物一覧
        </Link>
        <span>/</span>
        <Link
          href={`/mansions/${unit.mansion_id}`}
          className="hover:text-gray-700"
        >
          {mansion?.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900">
          {unit.layout_type} {unit.size_sqm}㎡
        </span>
      </div>

      {/* タイプ要約ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {unit.layout_type} / {unit.size_sqm}㎡ / {unit.direction}向き /{" "}
            {unit.floor_range}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{mansion?.name}</p>
          <div className="mt-2 flex gap-2">
            <StatusTag status={unit.status} />
          </div>
        </div>
        <WatchUnitButton unitId={unit.id} initialIsWatched={unit.is_watched} />
      </div>

      {/* 間取り図 */}
      <Card>
        <CardContent>
          {unit.floorplan_image_url ? (
            <div className="flex items-center justify-center">
              <img src={unit.floorplan_image_url} alt="間取り図" className="max-h-96 rounded-lg object-contain" />
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
              <p className="text-gray-400">間取り図（未登録）</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 住戸詳細情報 */}
      {(unit.balcony_sqm || unit.bath_toilet_separate !== undefined || unit.storage || unit.direction || unit.balcony || unit.room_number) && (
        <Card>
          <CardContent>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              住戸詳細
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              {unit.room_number && (
                <div>
                  <p className="text-gray-500">部屋番号</p>
                  <p className="font-bold text-gray-900">{unit.room_number}</p>
                </div>
              )}
              {unit.direction && (
                <div>
                  <p className="text-gray-500">向き</p>
                  <p className="font-bold text-gray-900">{unit.direction}</p>
                </div>
              )}
              {unit.balcony_sqm && (
                <div>
                  <p className="text-gray-500">バルコニー面積</p>
                  <p className="font-bold text-gray-900">{unit.balcony_sqm}㎡</p>
                </div>
              )}
              {unit.balcony && (
                <div>
                  <p className="text-gray-500">バルコニー</p>
                  <p className="font-bold text-gray-900">{unit.balcony}</p>
                </div>
              )}
              {unit.bath_toilet_separate !== undefined && unit.bath_toilet_separate !== null && (
                <div>
                  <p className="text-gray-500">バス・トイレ別</p>
                  <p className="font-bold text-gray-900">{unit.bath_toilet_separate ? "別" : "一体型"}</p>
                </div>
              )}
              {unit.storage && (
                <div>
                  <p className="text-gray-500">収納</p>
                  <p className="font-bold text-gray-900">{unit.storage}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 設備・特徴タグ */}
      {(() => {
        const first = activeListings[0];
        if (!first) return null;
        const intFeats = first.interior_features ?? [];
        const bldFeats = first.building_features ?? [];
        if (intFeats.length === 0 && bldFeats.length === 0) return null;
        return (
        <Card>
          <CardContent>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              設備・特徴
            </h2>
            <div className="space-y-4">
              {intFeats.length > 0 && (
                <FeatureTags features={intFeats} label="室内設備" />
              )}
              {bldFeats.length > 0 && (
                <FeatureTags features={bldFeats} label="建物設備" />
              )}
            </div>
          </CardContent>
        </Card>
        );
      })()}

      {/* 現在の状態 */}
      <Card>
        <CardContent>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            現在の状態
          </h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">ステータス</p>
              <StatusTag status={unit.status} className="mt-1" />
            </div>
            <div>
              <p className="text-gray-500">直近掲載日</p>
              <p className="font-bold text-gray-900">
                {unit.last_listing_date || "-"}
              </p>
            </div>
            <div>
              <p className="text-gray-500">直近賃料</p>
              <p className="font-bold text-gray-900">
                {unit.last_rent_amount
                  ? `${(unit.last_rent_amount / 10000).toFixed(1)}万円`
                  : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 募集登録 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">現在募集中</h2>
        <AddListingSection unitId={unit.id} />
      </div>

      {/* 現在募集中 */}
      {activeListings.length > 0 && (
        <div>
          <div className="space-y-3">
            {activeListings.map((listing) => (
              <Link key={listing.id} href={`/listings/${listing.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold text-blue-600">
                          {(listing.current_rent / 10000).toFixed(1)}万円
                          <span className="ml-1 text-sm font-normal text-gray-500">
                            + 管理費
                            {listing.management_fee
                              ? `${(listing.management_fee / 10000).toFixed(1)}万円`
                              : "-"}
                          </span>
                        </p>
                        <p className="text-sm text-gray-500">
                          {listing.floor}F / 掲載元: {listing.source_site}
                        </p>
                        <p className="text-xs text-gray-400">
                          検知:{" "}
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

      {/* 賃料推移グラフ */}
      <RentHistoryChart listings={listings} />

      {/* 過去募集履歴 */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          過去募集履歴
        </h2>
        {pastListings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-gray-500">
                <tr>
                  <th className="pb-2 font-medium">掲載日</th>
                  <th className="pb-2 font-medium">賃料</th>
                  <th className="pb-2 font-medium">管理費</th>
                  <th className="pb-2 font-medium">階</th>
                  <th className="pb-2 font-medium">掲載元</th>
                  <th className="pb-2 font-medium">終了日</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pastListings.map((listing) => (
                  <tr key={listing.id}>
                    <td className="py-2">
                      {new Date(listing.detected_at).toLocaleDateString(
                        "ja-JP"
                      )}
                    </td>
                    <td className="py-2 font-medium">
                      {(listing.current_rent / 10000).toFixed(1)}万円
                    </td>
                    <td className="py-2">
                      {listing.management_fee
                        ? `${(listing.management_fee / 10000).toFixed(1)}万円`
                        : "-"}
                    </td>
                    <td className="py-2">{listing.floor || "-"}F</td>
                    <td className="py-2">{listing.source_site || "-"}</td>
                    <td className="py-2">
                      {listing.ended_at
                        ? new Date(listing.ended_at).toLocaleDateString("ja-JP")
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">過去の募集履歴はありません</p>
        )}
      </div>

      {/* 類似住戸 */}
      {similarUnits.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            類似住戸タイプ
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {similarUnits.map((su) => (
              <Link key={su.id} href={`/units/${su.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent>
                    <p className="font-semibold text-gray-900">
                      {su.layout_type} / {su.size_sqm}㎡ / {su.direction}向き
                    </p>
                    <div className="mt-1 flex gap-1.5">
                      <StatusTag status={su.status} />
                    </div>
                    {su.last_rent_amount && (
                      <p className="mt-1 text-sm text-gray-500">
                        直近賃料:{" "}
                        {(su.last_rent_amount / 10000).toFixed(1)}万円
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
