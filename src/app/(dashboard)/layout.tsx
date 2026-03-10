"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isMansions = pathname === "/mansions";

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      {/* モバイルで物件ページの場合、サイドバー非表示 */}
      <div className={isMansions ? "hidden lg:contents" : "contents"}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
      <div className="flex flex-1 flex-col min-h-0">
        {/* モバイルで物件ページの場合、ヘッダー非表示 */}
        <div className={isMansions ? "hidden lg:block" : ""}>
          <Header onMenuToggle={() => setSidebarOpen(true)} />
        </div>
        <main className={`flex-1 overflow-y-auto ${isMansions ? "p-0 lg:p-8" : "p-6 lg:p-8"}`}>{children}</main>
      </div>
    </div>
  );
}
