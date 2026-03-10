"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  type UserPreferences,
  DEFAULT_PREFERENCES,
  savePreferences,
  loadPreferences,
  hasPreferences,
  AREA_OPTIONS,
  LAYOUT_OPTIONS,
} from "@/lib/preferences";

export function PreferencePanel() {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isOpen, setIsOpen] = useState(true);
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loaded = loadPreferences();
    setPrefs(loaded);
    // 条件設定済みなら閉じた状態で表示
    if (hasPreferences(loaded)) {
      setIsOpen(false);
    }
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const hasPref = hasPreferences(prefs);

  function toggleArea(area: string) {
    setPrefs((prev) => ({
      ...prev,
      areas: prev.areas.includes(area)
        ? prev.areas.filter((a) => a !== area)
        : [...prev.areas, area],
    }));
    setSaved(false);
  }

  function toggleLayout(layout: string) {
    setPrefs((prev) => ({
      ...prev,
      layouts: prev.layouts.includes(layout)
        ? prev.layouts.filter((l) => l !== layout)
        : [...prev.layouts, layout],
    }));
    setSaved(false);
  }

  function handleNumberChange(
    field: "rentMax" | "rentMin" | "walkingMax" | "sizeMin",
    value: string
  ) {
    setPrefs((prev) => ({
      ...prev,
      [field]: value === "" ? null : Number(value),
    }));
    setSaved(false);
  }

  function handleSave() {
    savePreferences(prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    setPrefs({ ...DEFAULT_PREFERENCES });
    savePreferences(DEFAULT_PREFERENCES);
    setSaved(false);
  }

  // サマリテキスト生成
  function getSummary(): string {
    const parts: string[] = [];
    if (prefs.areas.length > 0) parts.push(prefs.areas.join("・"));
    if (prefs.layouts.length > 0) parts.push(prefs.layouts.join("/"));
    if (prefs.rentMin !== null || prefs.rentMax !== null) {
      const min = prefs.rentMin !== null ? `${prefs.rentMin}万` : "";
      const max = prefs.rentMax !== null ? `${prefs.rentMax}万` : "";
      if (min && max) parts.push(`${min}〜${max}`);
      else if (min) parts.push(`${min}以上`);
      else parts.push(`${max}以下`);
    }
    if (prefs.walkingMax !== null) parts.push(`徒歩${prefs.walkingMax}分以内`);
    if (prefs.sizeMin !== null) parts.push(`${prefs.sizeMin}㎡以上`);
    return parts.join(" / ");
  }

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardContent>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-blue-900">
            希望条件
          </h2>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-sm text-blue-600 hover:underline"
          >
            {isOpen ? "閉じる" : "編集する"}
          </button>
        </div>

        {/* サマリ（閉じた状態） */}
        {!isOpen && hasPref && (
          <p className="mt-2 text-sm text-blue-700">{getSummary()}</p>
        )}
        {!isOpen && !hasPref && (
          <p className="mt-2 text-sm text-gray-500">
            条件を設定すると、おすすめ順で建物を表示できます
          </p>
        )}

        {/* 入力フォーム（開いた状態） */}
        {isOpen && (
          <div className="mt-4 space-y-5">
            {/* エリア */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                エリア
              </label>
              <div className="flex flex-wrap gap-2">
                {AREA_OPTIONS.map((area) => (
                  <button
                    key={area}
                    onClick={() => toggleArea(area)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      prefs.areas.includes(area)
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>

            {/* 間取り */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                間取り
              </label>
              <div className="flex flex-wrap gap-2">
                {LAYOUT_OPTIONS.map((layout) => (
                  <button
                    key={layout}
                    onClick={() => toggleLayout(layout)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      prefs.layouts.includes(layout)
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {layout}
                  </button>
                ))}
              </div>
            </div>

            {/* 数値入力群 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  家賃下限（万円）
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="例: 10"
                  value={prefs.rentMin ?? ""}
                  onChange={(e) => handleNumberChange("rentMin", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  家賃上限（万円）
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="例: 50"
                  value={prefs.rentMax ?? ""}
                  onChange={(e) => handleNumberChange("rentMax", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  徒歩（分以内）
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="例: 10"
                  value={prefs.walkingMax ?? ""}
                  onChange={(e) =>
                    handleNumberChange("walkingMax", e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  広さ下限（㎡）
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="例: 40"
                  value={prefs.sizeMin ?? ""}
                  onChange={(e) =>
                    handleNumberChange("sizeMin", e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* ボタン */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                条件を保存
              </button>
              <button
                onClick={handleReset}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                条件をリセット
              </button>
              {saved && (
                <span className="text-sm text-green-600">保存しました</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
