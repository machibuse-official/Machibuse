import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatusTag } from "@/components/ui/status-tag";
import { getDashboardData } from "@/lib/queries";
import { PreferencePanel } from "@/components/preferences/preference-panel";

export default async function DashboardPage() {
  const {
    watchedMansions,
    unreadNotifications,
    activeMansions,
    totalActiveListings,
    notifications,
  } = await getDashboardData();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>

      {/* 希望条件パネル */}
      <PreferencePanel />

      {/* サマリカード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">監視中の建物</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {watchedMansions.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">未読通知</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {unreadNotifications.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">現在募集中</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {totalActiveListings}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">募集中の建物</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {activeMansions.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 監視中の建物 */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                監視中の建物
              </h2>
              <Link
                href="/mansions"
                className="text-sm text-blue-600 hover:underline"
              >
                すべて見る
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {watchedMansions.length === 0 ? (
                <p className="text-sm text-gray-500">
                  監視中の建物はまだありません
                </p>
              ) : (
                watchedMansions.map((mansion) => (
                  <Link
                    key={mansion.id}
                    href={`/mansions/${mansion.id}`}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {mansion.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {mansion.nearest_station} 徒歩
                        {mansion.walking_minutes}分
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {mansion.active_listings_count > 0 && (
                        <StatusTag status="active" />
                      )}
                      <span className="text-gray-400">&rarr;</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 新着通知 */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                新着通知
              </h2>
              <Link
                href="/notifications"
                className="text-sm text-blue-600 hover:underline"
              >
                すべて見る
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-500">
                  新しい通知はありません
                </p>
              ) : (
                notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={
                      notification.listing_id
                        ? `/listings/${notification.listing_id}`
                        : "#"
                    }
                    className={`block rounded-lg border p-3 transition-colors hover:bg-gray-50 ${!notification.is_read ? "border-blue-200 bg-blue-50/50" : "border-gray-100"}`}
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-600">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(
                        notification.created_at
                      ).toLocaleString("ja-JP")}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
