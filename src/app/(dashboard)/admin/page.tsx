"use client";

import { useState, useEffect, FormEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Tab = "mansion" | "unit" | "listing" | "images" | "scrape";

interface Mansion {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  mansion_id: string;
  room_number: string | null;
  layout_type: string;
  size_sqm: number;
}

// --- 共通スタイル ---
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all duration-200";
const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5";
const sectionTitle = "text-lg font-bold text-slate-800 tracking-tight";
const sectionDesc = "text-sm text-slate-500 leading-relaxed";

// --- タブアイコン ---
function TabIcon({ tab }: { tab: Tab }) {
  const icons: Record<Tab, string> = {
    mansion: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    unit: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
    listing: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    images: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
    scrape: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
  };
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={icons[tab]} />
    </svg>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("mansion");
  const [mansions, setMansions] = useState<Mansion[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/mansions")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setMansions(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/units")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setUnits(data); })
      .catch(() => {});
  }, []);

  function showMessage(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  const [scrapingId, setScrapingId] = useState<string | null>(null);

  async function handleScrapeImages(mansionId: string) {
    setScrapingId(mansionId);
    try {
      const res = await fetch("/api/images/auto-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mansionId }),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage("success", `${data.saved || 0}枚の画像を自動取得しました (${data.source || ""})`);
      } else {
        showMessage("error", data.error || "画像取得に失敗しました");
      }
    } catch {
      showMessage("error", "画像取得中にエラーが発生しました");
    } finally {
      setScrapingId(null);
    }
  }

  async function handleScrapeAllImages() {
    setScrapingId("all");
    try {
      const res = await fetch("/api/images/auto-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50 }),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage("success", `完了: ${data.processed}件処理 / ${data.totalFetched}枚取得`);
      } else {
        showMessage("error", data.error || "一括取得に失敗しました");
      }
    } catch {
      showMessage("error", "一括取得中にエラーが発生しました");
    } finally {
      setScrapingId(null);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "mansion", label: "建物" },
    { key: "unit", label: "間取り" },
    { key: "listing", label: "募集" },
    { key: "images", label: "画像" },
    { key: "scrape", label: "取得" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          管理画面
        </h1>
        <p className="mt-1 text-sm text-slate-500">建物・間取り・募集データの管理とスクレイピング</p>
      </div>

      {/* メッセージ */}
      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium backdrop-blur-sm transition-all duration-300 animate-fade-in ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
              : "bg-red-50 text-red-700 border border-red-200/60"
          }`}
        >
          <span className="mr-2">{message.type === "success" ? "\u2713" : "\u2717"}</span>
          {message.text}
        </div>
      )}

      {/* タブ */}
      <div className="flex gap-1 rounded-2xl bg-slate-100/80 p-1.5 backdrop-blur-sm">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-white text-slate-900 shadow-sm shadow-slate-200/50"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
            }`}
          >
            <TabIcon tab={tab.key} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      {activeTab === "mansion" && (
        <MansionForm
          onSuccess={(mansion) => {
            setMansions((prev) => [...prev, mansion]);
            showMessage("success", `建物「${mansion.name}」を登録しました`);
          }}
          onError={(msg) => showMessage("error", msg)}
        />
      )}

      {activeTab === "unit" && (
        <UnitForm
          mansions={mansions}
          onSuccess={(unit) => {
            setUnits((prev) => [...prev, unit]);
            showMessage("success", "間取りを登録しました");
          }}
          onError={(msg) => showMessage("error", msg)}
        />
      )}

      {activeTab === "listing" && (
        <ListingForm
          mansions={mansions}
          units={units}
          onSuccess={() => showMessage("success", "募集情報を登録しました")}
          onError={(msg) => showMessage("error", msg)}
        />
      )}

      {activeTab === "images" && (
        <ImagesPanel
          mansions={mansions}
          scrapingId={scrapingId}
          setScrapingId={setScrapingId}
          onScrapeImages={handleScrapeImages}
          onScrapeAll={handleScrapeAllImages}
          onMessage={showMessage}
        />
      )}

      {activeTab === "scrape" && (
        <ScrapePanel mansions={mansions} onMessage={showMessage} />
      )}
    </div>
  );
}

// ─── 画像管理パネル ──────────────────────────────────

function ImagesPanel({
  mansions,
  scrapingId,
  setScrapingId,
  onScrapeImages,
  onScrapeAll,
  onMessage,
}: {
  mansions: Mansion[];
  scrapingId: string | null;
  setScrapingId: (id: string | null) => void;
  onScrapeImages: (id: string) => void;
  onScrapeAll: () => void;
  onMessage: (type: "success" | "error", text: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50">
              <svg className="h-5 w-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className={sectionTitle}>画像自動追跡</h2>
              <p className={`mt-1 ${sectionDesc}`}>
                SUUMO・LIFULL等を横断検索し、外観・エントランス・室内写真を自動取得
              </p>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setScrapingId("seed");
                try {
                  const res = await fetch("/api/images/seed-static", { method: "POST" });
                  const data = await res.json();
                  onMessage("success", data.message);
                } catch { onMessage("error", "シードに失敗しました"); }
                finally { setScrapingId(null); }
              }}
              disabled={scrapingId === "seed"}
            >
              {scrapingId === "seed" ? (
                <><Spinner /> 移行中...</>
              ) : "静的画像をDBに移行"}
            </Button>
            <Button
              onClick={onScrapeAll}
              disabled={scrapingId === "all"}
            >
              {scrapingId === "all" ? (
                <><Spinner /> 一括取得中...</>
              ) : "画像不足を一括取得"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 個別取得リスト */}
      <Card>
        <CardContent>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">個別取得</h3>
          <div className="space-y-1.5">
            {mansions.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">登録済みの建物がありません</p>
            )}
            {mansions.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm font-medium text-slate-700">{m.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onScrapeImages(m.id)}
                  disabled={scrapingId !== null}
                >
                  {scrapingId === m.id ? <Spinner /> : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── スクレイプパネル ──────────────────────────────────

interface ScrapeResult {
  raw_count?: number;
  scrape_time_ms?: number;
  message?: string;
  error?: string;
  results?: {
    created: number;
    updated: number;
    skipped: number;
  };
  listings_preview?: Array<{
    name: string;
    layout: string;
    size: number;
    rent: number;
    station?: string;
  }>;
}

function ScrapePanel({
  mansions,
  onMessage,
}: {
  mansions: Mansion[];
  onMessage: (type: "success" | "error", text: string) => void;
}) {
  const [scraping, setScraping] = useState(false);
  const [buildingName, setBuildingName] = useState("");
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [results, setResults] = useState<ScrapeResult | null>(null);
  const [scrapingMansionId, setScrapingMansionId] = useState<string | null>(null);

  async function handleManualScrape() {
    if (!buildingName && !scrapeUrl) {
      onMessage("error", "建物名またはURLを入力してください");
      return;
    }
    setScraping(true);
    setResults(null);
    try {
      const res = await fetch("/api/scrape/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          building_name: buildingName || undefined,
          url: scrapeUrl || undefined,
        }),
      });
      const data = await res.json();
      setResults(data);
      if (res.ok) {
        onMessage("success", data.message || "スクレイプ完了");
      } else {
        onMessage("error", data.error || "スクレイプ失敗");
      }
    } catch {
      onMessage("error", "スクレイプ中にエラーが発生しました");
    } finally {
      setScraping(false);
    }
  }

  async function handleScrapeMansion(mansionId: string, mansionName: string) {
    setScrapingMansionId(mansionId);
    try {
      const res = await fetch("/api/scrape/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ building_name: mansionName }),
      });
      const data = await res.json();
      if (res.ok) {
        onMessage("success", `${mansionName}: ${data.message}`);
      } else {
        onMessage("error", `${mansionName}: ${data.error || "失敗"}`);
      }
    } catch {
      onMessage("error", `${mansionName}: スクレイプ失敗`);
    } finally {
      setScrapingMansionId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* 手動スクレイプ */}
      <Card>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className={sectionTitle}>SUUMOスクレイプ</h2>
              <p className={`mt-1 ${sectionDesc}`}>
                建物名でSUUMOを検索し、最新の賃貸情報を自動取得・登録
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className={labelClass}>建物名で検索</label>
              <input
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
                placeholder="例: パークコート渋谷"
                className={inputClass}
                onKeyDown={(e) => e.key === "Enter" && handleManualScrape()}
              />
            </div>
            <div>
              <label className={labelClass}>SUUMO URL を直接指定</label>
              <input
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                placeholder="https://suumo.jp/jj/chintai/..."
                className={inputClass}
              />
            </div>
            <Button onClick={handleManualScrape} disabled={scraping}>
              {scraping ? (
                <><Spinner /> 取得中...</>
              ) : (
                <>
                  <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  スクレイプ実行
                </>
              )}
            </Button>
          </div>

          {/* 結果表示 */}
          {results && (
            <div className="mt-5 rounded-xl border border-slate-200/60 bg-gradient-to-b from-slate-50 to-white p-4">
              {/* サマリー */}
              <div className="flex items-center gap-6 text-sm">
                <StatBadge label="取得" value={`${results.raw_count || 0}件`} color="blue" />
                <StatBadge label="処理時間" value={`${results.scrape_time_ms || 0}ms`} color="slate" />
                {results.results && (
                  <>
                    <StatBadge label="新規" value={`${results.results.created}件`} color="emerald" />
                    <StatBadge label="更新" value={`${results.results.updated}件`} color="amber" />
                  </>
                )}
              </div>

              {/* プレビュー */}
              {results.listings_preview && results.listings_preview.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">プレビュー</h4>
                  <div className="space-y-2">
                    {results.listings_preview.map((l, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-white p-3 border border-slate-100 hover:border-slate-200 transition-colors">
                        <div>
                          <span className="text-sm font-semibold text-slate-800">{l.name}</span>
                          <span className="ml-2 text-xs text-slate-500">
                            {l.layout} / {l.size}m\u00B2
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-blue-600">
                            {(l.rent / 10000).toFixed(1)}万円
                          </span>
                          {l.station ? (
                            <span className="ml-2 text-xs text-slate-400">{l.station}</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 登録済み建物のスクレイプ */}
      <Card>
        <CardContent>
          <h2 className="text-sm font-semibold text-slate-700 mb-1">登録済み建物</h2>
          <p className="text-xs text-slate-400 mb-4">建物名でSUUMOを検索し最新募集情報を取得</p>
          <div className="space-y-1.5">
            {mansions.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">建物がありません</p>
            )}
            {mansions.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-slate-50 transition-colors group"
              >
                <span className="text-sm font-medium text-slate-700">{m.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleScrapeMansion(m.id, m.name)}
                  disabled={scrapingMansionId !== null}
                  className="opacity-60 group-hover:opacity-100 transition-opacity"
                >
                  {scrapingMansionId === m.id ? (
                    <Spinner />
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 統計バッジ ──────────────────────────────────

function StatBadge({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors[color] || colors.slate}`}>
        {value}
      </span>
    </div>
  );
}

// ─── スピナー ──────────────────────────────────

function Spinner() {
  return (
    <svg className="mr-1.5 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── 建物登録フォーム ──────────────────────────────────

function MansionForm({
  onSuccess,
  onError,
}: {
  onSuccess: (mansion: Mansion) => void;
  onError: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name"),
      address: fd.get("address"),
      nearest_station: fd.get("nearest_station"),
      walking_minutes: Number(fd.get("walking_minutes")) || null,
      brand_type: fd.get("brand_type") || null,
      total_units: Number(fd.get("total_units")) || null,
      floors: Number(fd.get("floors")) || null,
      construction_date: fd.get("construction_date") || null,
      features: fd.get("features") || null,
      memo: fd.get("memo") || null,
    };

    try {
      const res = await fetch("/api/mansions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "登録に失敗しました");
      onSuccess(data);
      e.currentTarget.reset();
    } catch (err) {
      onError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
            <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <div>
            <h2 className={sectionTitle}>建物登録</h2>
            <p className={`mt-1 ${sectionDesc}`}>新しい建物の基本情報を登録</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>建物名 <span className="text-red-400">*</span></label>
              <input name="name" required className={inputClass} placeholder="パークコート渋谷" />
            </div>
            <div>
              <label className={labelClass}>住所 <span className="text-red-400">*</span></label>
              <input name="address" required className={inputClass} placeholder="東京都渋谷区..." />
            </div>
            <div>
              <label className={labelClass}>最寄り駅 <span className="text-red-400">*</span></label>
              <input name="nearest_station" required className={inputClass} placeholder="渋谷駅" />
            </div>
            <div>
              <label className={labelClass}>徒歩分 <span className="text-red-400">*</span></label>
              <input name="walking_minutes" type="number" min="0" required className={inputClass} placeholder="5" />
            </div>
            <div>
              <label className={labelClass}>ブランド / 施工主</label>
              <input name="brand_type" className={inputClass} placeholder="三井不動産" />
            </div>
            <div>
              <label className={labelClass}>総戸数</label>
              <input name="total_units" type="number" min="0" className={inputClass} placeholder="120" />
            </div>
            <div>
              <label className={labelClass}>階数</label>
              <input name="floors" type="number" min="0" className={inputClass} placeholder="15" />
            </div>
            <div>
              <label className={labelClass}>築年</label>
              <input name="construction_date" className={inputClass} placeholder="2020" />
            </div>
          </div>
          <div>
            <label className={labelClass}>特徴</label>
            <input name="features" className={inputClass} placeholder="オートロック, 宅配BOX, ジム" />
          </div>
          <div>
            <label className={labelClass}>備考</label>
            <textarea name="memo" rows={2} className={inputClass} placeholder="自由記述..." />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? <><Spinner /> 登録中...</> : "建物を登録"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── 間取り登録フォーム ──────────────────────────────────

function UnitForm({
  mansions,
  onSuccess,
  onError,
}: {
  mansions: Mansion[];
  onSuccess: (unit: Unit) => void;
  onError: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      mansion_id: fd.get("mansion_id"),
      room_number: fd.get("room_number") || null,
      floor_range: fd.get("floor_range") || null,
      size_sqm: Number(fd.get("size_sqm")),
      layout_type: fd.get("layout_type"),
      direction: fd.get("direction") || null,
      last_rent: Number(fd.get("last_rent")) || null,
      memo: fd.get("memo") || null,
    };

    try {
      const res = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "登録に失敗しました");
      onSuccess(data);
      e.currentTarget.reset();
    } catch (err) {
      onError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50">
            <svg className="h-5 w-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <div>
            <h2 className={sectionTitle}>間取り登録</h2>
            <p className={`mt-1 ${sectionDesc}`}>建物内の間取り・部屋タイプを登録</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>建物 <span className="text-red-400">*</span></label>
              <select name="mansion_id" required className={inputClass}>
                <option value="">選択してください</option>
                {mansions.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>部屋番号</label>
              <input name="room_number" className={inputClass} placeholder="501" />
            </div>
            <div>
              <label className={labelClass}>階層範囲</label>
              <input name="floor_range" className={inputClass} placeholder="3-5" />
            </div>
            <div>
              <label className={labelClass}>面積 (m\u00B2) <span className="text-red-400">*</span></label>
              <input name="size_sqm" type="number" step="0.01" min="0" required className={inputClass} placeholder="45.5" />
            </div>
            <div>
              <label className={labelClass}>間取り <span className="text-red-400">*</span></label>
              <select name="layout_type" required className={inputClass}>
                <option value="">選択</option>
                {["1K", "1DK", "1LDK", "2K", "2DK", "2LDK", "3LDK", "4LDK"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>方角</label>
              <select name="direction" className={inputClass}>
                <option value="">選択</option>
                {["北", "北東", "東", "南東", "南", "南西", "西", "北西"].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>過去賃料</label>
              <input name="last_rent" type="number" min="0" className={inputClass} placeholder="150000" />
            </div>
          </div>
          <div>
            <label className={labelClass}>備考</label>
            <textarea name="memo" rows={2} className={inputClass} placeholder="自由記述..." />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? <><Spinner /> 登録中...</> : "間取りを登録"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── 募集登録フォーム ──────────────────────────────────

function ListingForm({
  mansions,
  units,
  onSuccess,
  onError,
}: {
  mansions: Mansion[];
  units: Unit[];
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [selectedMansionId, setSelectedMansionId] = useState("");

  const filteredUnits = units.filter((u) => u.mansion_id === selectedMansionId);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      unit_id: fd.get("unit_id"),
      status: fd.get("status"),
      current_rent: Number(fd.get("current_rent")),
      management_fee: Number(fd.get("management_fee")) || null,
      floor: Number(fd.get("floor")) || null,
      source_site: fd.get("source_site") || null,
      source_url: fd.get("source_url") || null,
      detected_at: fd.get("detected_at") || null,
    };

    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "登録に失敗しました");
      onSuccess();
      e.currentTarget.reset();
      setSelectedMansionId("");
    } catch (err) {
      onError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
            <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div>
            <h2 className={sectionTitle}>募集登録</h2>
            <p className={`mt-1 ${sectionDesc}`}>新しい賃貸募集情報を登録</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>建物 <span className="text-red-400">*</span></label>
              <select
                value={selectedMansionId}
                onChange={(e) => setSelectedMansionId(e.target.value)}
                required
                className={inputClass}
              >
                <option value="">選択してください</option>
                {mansions.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>間取り <span className="text-red-400">*</span></label>
              <select name="unit_id" required disabled={!selectedMansionId} className={inputClass}>
                <option value="">{selectedMansionId ? "選択してください" : "先に建物を選択"}</option>
                {filteredUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.layout_type} {u.size_sqm}m\u00B2{u.room_number ? ` (${u.room_number})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>ステータス <span className="text-red-400">*</span></label>
              <select name="status" required className={inputClass}>
                <option value="active">募集中</option>
                <option value="past">過去</option>
                <option value="ended">終了</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>賃料 <span className="text-red-400">*</span></label>
              <input name="current_rent" type="number" min="0" required className={inputClass} placeholder="200000" />
            </div>
            <div>
              <label className={labelClass}>管理費</label>
              <input name="management_fee" type="number" min="0" className={inputClass} placeholder="15000" />
            </div>
            <div>
              <label className={labelClass}>階数</label>
              <input name="floor" type="number" min="0" className={inputClass} placeholder="5" />
            </div>
            <div>
              <label className={labelClass}>掲載元</label>
              <select name="source_site" className={inputClass}>
                <option value="">選択</option>
                {["SUUMO", "KENCORP", "HOMES", "その他"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>検出日時</label>
              <input name="detected_at" type="datetime-local" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>掲載元URL</label>
            <input name="source_url" type="url" className={inputClass} placeholder="https://..." />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? <><Spinner /> 登録中...</> : "募集を登録"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
