"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";

const pageTitles: Record<string, string> = {
  "/dashboard": "ダッシュボード",
  "/mansions": "物件リスト",
  "/watchlist": "ウォッチリスト",
  "/notifications": "通知",
  "/settings/notifications": "設定",
  "/admin": "データ管理",
};

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const pathname = usePathname();
  const { unreadCount } = useRealtimeNotifications();

  const currentPage = Object.entries(pageTitles).find(
    ([path]) => pathname === path || pathname.startsWith(path + "/")
  );

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200/40 bg-white/70 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        {/* モバイルメニューボタン */}
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-1.5 text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* ブレッドクラム */}
        {currentPage && (
          <div className="hidden items-center gap-2.5 text-sm sm:flex animate-fade-in">
            <span className="text-slate-200">&#8260;</span>
            <span className="font-semibold text-slate-800">{currentPage[1]}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* 希望条件の再設定 */}
        <Link
          href="/onboarding"
          className="rounded-lg border border-slate-200/60 px-3.5 py-1.5 text-xs font-semibold text-slate-500 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 hover:shadow-sm"
          title="希望条件を変更"
        >
          条件変更
        </Link>

        {/* 通知ベル */}
        <Link
          href="/notifications"
          className="relative rounded-lg p-2 text-slate-400 transition-all duration-200 hover:bg-slate-100/80 hover:text-slate-600 hover:shadow-sm"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <>
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
              <span className="absolute right-1.5 top-1.5 h-4 w-4 rounded-full bg-blue-400 animate-ping opacity-75" />
            </>
          )}
        </Link>

        {/* 設定 */}
        <Link
          href="/settings/notifications"
          className="relative rounded-lg p-2 text-slate-400 transition-all duration-200 hover:bg-slate-100/80 hover:text-slate-600 hover:shadow-sm"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
