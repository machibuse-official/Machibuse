"use client";

import { useState, useEffect, FormEvent } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Tab = "mansion" | "unit" | "listing" | "images";

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

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("mansion");
  const [mansions, setMansions] = useState<Mansion[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 建物一覧取得
  useEffect(() => {
    fetch("/api/mansions")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMansions(data);
      })
      .catch(() => {});
  }, []);

  // 間取り一覧取得
  useEffect(() => {
    fetch("/api/units")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setUnits(data);
      })
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
      const res = await fetch(`/api/mansions/${mansionId}/scrape-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage("success", data.message || "画像を取得しました");
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
    let success = 0;
    let failed = 0;
    for (const m of mansions) {
      try {
        const res = await fetch(`/api/mansions/${m.id}/scrape-images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.count > 0) success++;
          else failed++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }
    showMessage("success", `完了: ${success}件成功 / ${failed}件失敗`);
    setScrapingId(null);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "mansion", label: "建物登録" },
    { key: "unit", label: "間取り登録" },
    { key: "listing", label: "募集登録" },
    { key: "images", label: "画像管理" },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">管理画面</h1>

      {/* メッセージ */}
      {message && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* タブ */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
        <Card>
          <CardContent>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              画像一括取得
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              各建物の名前でSUUMOを検索し、外観・エントランス等の写真を自動取得します。
            </p>
            <Button
              onClick={handleScrapeAllImages}
              disabled={scrapingId === "all"}
            >
              {scrapingId === "all" ? "取得中..." : "全建物の画像を一括取得"}
            </Button>

            <div className="mt-6 space-y-2">
              <h3 className="text-sm font-medium text-gray-700">個別取得</h3>
              {mansions.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                  <span className="text-sm font-medium text-gray-900">{m.name}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleScrapeImages(m.id)}
                    disabled={scrapingId !== null}
                  >
                    {scrapingId === m.id ? "取得中..." : "画像取得"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
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
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">建物登録</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                建物名 <span className="text-red-500">*</span>
              </label>
              <input name="name" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>
                住所 <span className="text-red-500">*</span>
              </label>
              <input name="address" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>
                最寄り駅 <span className="text-red-500">*</span>
              </label>
              <input name="nearest_station" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>
                徒歩分 <span className="text-red-500">*</span>
              </label>
              <input
                name="walking_minutes"
                type="number"
                min="0"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>ブランド/施工主</label>
              <input name="brand_type" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>総戸数</label>
              <input
                name="total_units"
                type="number"
                min="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>階数</label>
              <input
                name="floors"
                type="number"
                min="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>築年</label>
              <input
                name="construction_date"
                placeholder="例: 2020"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>特徴</label>
            <input name="features" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>備考</label>
            <textarea name="memo" rows={2} className={inputClass} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "登録中..." : "建物を登録"}
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
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">間取り登録</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>
                建物 <span className="text-red-500">*</span>
              </label>
              <select name="mansion_id" required className={inputClass}>
                <option value="">選択してください</option>
                {mansions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>部屋番号</label>
              <input name="room_number" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>階層範囲</label>
              <input
                name="floor_range"
                placeholder="例: 3-5"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                面積(m2) <span className="text-red-500">*</span>
              </label>
              <input
                name="size_sqm"
                type="number"
                step="0.01"
                min="0"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                間取りタイプ <span className="text-red-500">*</span>
              </label>
              <select name="layout_type" required className={inputClass}>
                <option value="">選択してください</option>
                {["1K", "1DK", "1LDK", "2K", "2DK", "2LDK", "3LDK", "4LDK"].map(
                  (t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className={labelClass}>方角</label>
              <select name="direction" className={inputClass}>
                <option value="">選択してください</option>
                {["北", "北東", "東", "南東", "南", "南西", "西", "北西"].map(
                  (d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className={labelClass}>過去賃料</label>
              <input
                name="last_rent"
                type="number"
                min="0"
                className={inputClass}
                placeholder="例: 150000"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>備考</label>
            <textarea name="memo" rows={2} className={inputClass} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "登録中..." : "間取りを登録"}
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

  const filteredUnits = units.filter(
    (u) => u.mansion_id === selectedMansionId
  );

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
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">募集登録</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 2段階ドロップダウン */}
            <div>
              <label className={labelClass}>
                建物 <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedMansionId}
                onChange={(e) => setSelectedMansionId(e.target.value)}
                required
                className={inputClass}
              >
                <option value="">選択してください</option>
                {mansions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                間取り <span className="text-red-500">*</span>
              </label>
              <select
                name="unit_id"
                required
                disabled={!selectedMansionId}
                className={inputClass}
              >
                <option value="">
                  {selectedMansionId
                    ? "選択してください"
                    : "先に建物を選択"}
                </option>
                {filteredUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.layout_type} {u.size_sqm}m2
                    {u.room_number ? ` (${u.room_number})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                ステータス <span className="text-red-500">*</span>
              </label>
              <select name="status" required className={inputClass}>
                <option value="active">active</option>
                <option value="past">past</option>
                <option value="ended">ended</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>
                賃料 <span className="text-red-500">*</span>
              </label>
              <input
                name="current_rent"
                type="number"
                min="0"
                required
                className={inputClass}
                placeholder="例: 200000"
              />
            </div>
            <div>
              <label className={labelClass}>管理費</label>
              <input
                name="management_fee"
                type="number"
                min="0"
                className={inputClass}
                placeholder="例: 15000"
              />
            </div>
            <div>
              <label className={labelClass}>階数</label>
              <input
                name="floor"
                type="number"
                min="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>掲載元</label>
              <select name="source_site" className={inputClass}>
                <option value="">選択してください</option>
                {["SUUMO", "KENCORP", "HOMES", "その他"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>検出日時</label>
              <input
                name="detected_at"
                type="datetime-local"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>掲載元URL</label>
            <input
              name="source_url"
              type="url"
              className={inputClass}
              placeholder="https://..."
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "登録中..." : "募集を登録"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
