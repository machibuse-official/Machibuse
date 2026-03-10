"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  type UserPreferences,
  DEFAULT_PREFERENCES,
  savePreferences,
  loadPreferences,
  hasPreferences,
  AREA_OPTIONS,
  LAYOUT_OPTIONS,
} from "@/lib/preferences";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loaded = loadPreferences();
    if (hasPreferences(loaded)) {
      router.replace("/mansions");
      return;
    }
    setMounted(true);
  }, [router]);

  if (!mounted) return null;

  function toggleArea(area: string) {
    setPrefs((prev) => ({
      ...prev,
      areas: prev.areas.includes(area)
        ? prev.areas.filter((a) => a !== area)
        : [...prev.areas, area],
    }));
  }

  function toggleLayout(layout: string) {
    setPrefs((prev) => ({
      ...prev,
      layouts: prev.layouts.includes(layout)
        ? prev.layouts.filter((l) => l !== layout)
        : [...prev.layouts, layout],
    }));
  }

  function handleNext() {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      savePreferences(prefs);
      router.push("/mansions");
    }
  }

  function handleSkip() {
    savePreferences(DEFAULT_PREFERENCES);
    router.push("/mansions");
  }

  const steps = [
    {
      title: "どのエリアで探していますか？",
      subtitle: "気になるエリアを選んでください（複数選択可）",
      content: (
        <div className="flex flex-wrap justify-center gap-3">
          {AREA_OPTIONS.map((area) => (
            <button
              key={area}
              onClick={() => toggleArea(area)}
              className={`rounded-full px-5 py-2.5 text-base font-medium transition-all ${
                prefs.areas.includes(area)
                  ? "bg-blue-600 text-white shadow-md scale-105"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "希望の間取りは？",
      subtitle: "気になる間取りを選んでください（複数選択可）",
      content: (
        <div className="flex flex-wrap justify-center gap-3">
          {LAYOUT_OPTIONS.map((layout) => (
            <button
              key={layout}
              onClick={() => toggleLayout(layout)}
              className={`rounded-full px-5 py-2.5 text-base font-medium transition-all ${
                prefs.layouts.includes(layout)
                  ? "bg-blue-600 text-white shadow-md scale-105"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              {layout}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "家賃の予算は？",
      subtitle: "月額の予算感を教えてください",
      content: (
        <div className="mx-auto max-w-sm space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              下限（万円）
            </label>
            <input
              type="number"
              min={0}
              placeholder="例: 15"
              value={prefs.rentMin ?? ""}
              onChange={(e) =>
                setPrefs((prev) => ({
                  ...prev,
                  rentMin: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              上限（万円）
            </label>
            <input
              type="number"
              min={0}
              placeholder="例: 40"
              value={prefs.rentMax ?? ""}
              onChange={(e) =>
                setPrefs((prev) => ({
                  ...prev,
                  rentMax: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      ),
    },
    {
      title: "その他の条件",
      subtitle: "こだわりがあれば設定してください",
      content: (
        <div className="mx-auto max-w-sm space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              駅徒歩（分以内）
            </label>
            <input
              type="number"
              min={0}
              placeholder="例: 10"
              value={prefs.walkingMax ?? ""}
              onChange={(e) =>
                setPrefs((prev) => ({
                  ...prev,
                  walkingMax:
                    e.target.value === "" ? null : Number(e.target.value),
                }))
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              広さ下限（㎡）
            </label>
            <input
              type="number"
              min={0}
              placeholder="例: 40"
              value={prefs.sizeMin ?? ""}
              onChange={(e) =>
                setPrefs((prev) => ({
                  ...prev,
                  sizeMin:
                    e.target.value === "" ? null : Number(e.target.value),
                }))
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-lg">
        {/* ロゴ / タイトル */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900">待ち伏せ</h1>
          <p className="mt-1 text-sm text-gray-500">
            狙ったマンションを逃さない
          </p>
        </div>

        {/* プログレスバー */}
        <div className="mb-8 flex gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-blue-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* ステップ内容 */}
        <div className="mb-8 text-center">
          <h2 className="text-xl font-bold text-gray-900">
            {currentStep.title}
          </h2>
          <p className="mt-2 text-sm text-gray-500">{currentStep.subtitle}</p>
        </div>

        <div className="mb-10">{currentStep.content}</div>

        {/* ボタン */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            スキップして始める
          </button>
          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                戻る
              </button>
            )}
            <button
              onClick={handleNext}
              className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              {isLast ? "物件を見る" : "次へ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
