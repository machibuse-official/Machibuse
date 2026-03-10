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
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          ダッシュボード
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          あなたの物件トラッキング状況
        </p>
      </div>

      {/* 希望条件パネル */}
      <PreferencePanel />

      {/* サマリカード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 監視中の建物 */}
        <Card className="overflow-hidden">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  監視中の建物
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
                  {watchedMansions.length}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
                <svg
                  className="h-6 w-6 text-indigo-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 未読通知 */}
        <Card className="overflow-hidden">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">未読通知</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
                  {unreadNotifications.length}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
                <svg
                  className="h-6 w-6 text-amber-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 現在募集中 */}
        <Card className="overflow-hidden">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  現在募集中
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
                  {totalActiveListings}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                <svg
                  className="h-6 w-6 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 募集中の建物 */}
        <Card className="overflow-hidden">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  募集中の建物
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
                  {activeMansions.length}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                <svg
                  className="h-6 w-6 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M2.25 21h19.5M3.75 3v18m4.5-18v18m4.5-18v18m4.5-18v18M5.25 3h13.5M5.25 21h13.5M8.25 6h.008v.008H8.25V6zm0 3h.008v.008H8.25V9zm0 3h.008v.008H8.25V12zm3-6h.008v.008h-.008V6zm0 3h.008v.008h-.008V9zm0 3h.008v.008h-.008V12zm3-6h.008v.008h-.008V6zm0 3h.008v.008h-.008V9zm0 3h.008v.008h-.008V12z"
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 監視中の建物 */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                監視中の建物
              </h2>
              <Link
                href="/mansions"
                className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-800"
              >
                すべて見る &rarr;
              </Link>
            </div>
            <div className="mt-4 space-y-2">
              {watchedMansions.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 py-10 text-center">
                  <svg
                    className="h-10 w-10 text-slate-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M2.25 21h19.5M3.75 3v18m4.5-18v18m4.5-18v18m4.5-18v18"
                    />
                  </svg>
                  <p className="mt-3 text-sm font-medium text-slate-500">
                    監視中の建物はまだありません
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    建物を追加して空室情報を自動トラッキングしましょう
                  </p>
                </div>
              ) : (
                watchedMansions.map((mansion) => (
                  <Link
                    key={mansion.id}
                    href={`/mansions/${mansion.id}`}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-4 transition-all hover:bg-slate-50/80 hover:shadow-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {mansion.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {mansion.nearest_station} 徒歩
                        {mansion.walking_minutes}分
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {mansion.active_listings_count > 0 && (
                        <StatusTag status="active" />
                      )}
                      <svg
                        className="h-4 w-4 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
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
              <h2 className="text-lg font-semibold text-slate-900">
                新着通知
              </h2>
              <Link
                href="/notifications"
                className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-800"
              >
                すべて見る &rarr;
              </Link>
            </div>
            <div className="mt-4 space-y-2">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 py-10 text-center">
                  <svg
                    className="h-10 w-10 text-slate-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                    />
                  </svg>
                  <p className="mt-3 text-sm font-medium text-slate-500">
                    新しい通知はありません
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    空室が見つかると自動でお知らせします
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={
                      notification.listing_id
                        ? `/listings/${notification.listing_id}`
                        : "#"
                    }
                    className={`block rounded-xl border p-4 transition-all hover:shadow-sm ${
                      !notification.is_read
                        ? "border-l-4 border-l-indigo-400 border-t-slate-100 border-r-slate-100 border-b-slate-100 bg-indigo-50/30"
                        : "border-slate-100 hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          !notification.is_read
                            ? "bg-indigo-500"
                            : "bg-slate-200"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {notification.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {notification.message}
                        </p>
                        <p className="mt-1.5 text-xs text-slate-400">
                          {new Date(
                            notification.created_at
                          ).toLocaleString("ja-JP")}
                        </p>
                      </div>
                    </div>
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
