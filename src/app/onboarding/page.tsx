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
  FEATURE_CATEGORIES,
} from "@/lib/preferences";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [mounted, setMounted] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    const loaded = loadPreferences();
    // 条件変更からのアクセス（referrerチェック）or 直接アクセスの場合は既存条件をロード
    if (hasPreferences(loaded)) {
      setPrefs(loaded);
      setIsEdit(true);
    }
    setMounted(true);
  }, []);

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

  function toggleFeature(feature: string) {
    setPrefs((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  }

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

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
              className={`rounded-full px-5 py-2.5 text-base font-medium transition-all duration-200 ${
                prefs.areas.includes(area)
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/25 scale-105 ring-2 ring-slate-900/10 ring-offset-2"
                  : "bg-white/80 text-slate-600 border border-slate-200/60 hover:border-slate-300 hover:bg-white hover:shadow-sm"
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
              className={`rounded-full px-5 py-2.5 text-base font-medium transition-all duration-200 ${
                prefs.layouts.includes(layout)
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/25 scale-105 ring-2 ring-slate-900/10 ring-offset-2"
                  : "bg-white/80 text-slate-600 border border-slate-200/60 hover:border-slate-300 hover:bg-white hover:shadow-sm"
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
            <label className="mb-1 block text-sm font-medium text-slate-500">
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
              className="w-full rounded-xl border border-slate-200/60 bg-white/80 px-4 py-3.5 text-lg shadow-sm focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-500/10 transition-all duration-200 placeholder:text-slate-300"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-500">
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
              className="w-full rounded-xl border border-slate-200/60 bg-white/80 px-4 py-3.5 text-lg shadow-sm focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-500/10 transition-all duration-200 placeholder:text-slate-300"
            />
          </div>
        </div>
      ),
    },
    {
      title: "こだわり条件",
      subtitle: "譲れないポイントを選んでください（複数選択可）",
      content: (
        <div className="mx-auto max-w-md space-y-3 max-h-[340px] overflow-y-auto pr-1">
          {FEATURE_CATEGORIES.map((category) => {
            const isExpanded = expandedCategory === category.label;
            const selectedCount = category.options.filter((o) =>
              prefs.features.includes(o)
            ).length;
            return (
              <div
                key={category.label}
                className="rounded-xl border border-slate-200/60 bg-white/80 overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() =>
                    setExpandedCategory(isExpanded ? null : category.label)
                  }
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50/80"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{category.icon}</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {category.label}
                    </span>
                    {selectedCount > 0 && (
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                        {selectedCount}
                      </span>
                    )}
                  </div>
                  <svg
                    className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isExpanded && (
                  <div className="flex flex-wrap gap-2 px-4 pb-3 animate-fade-in">
                    {category.options.map((option) => (
                      <button
                        key={option}
                        onClick={() => toggleFeature(option)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                          prefs.features.includes(option)
                            ? "bg-slate-900 text-white shadow-md scale-105"
                            : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80"
                        }`}
                      >
                        {prefs.features.includes(option) && (
                          <span className="mr-1">✓</span>
                        )}
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {prefs.features.length > 0 && (
            <div className="pt-2 text-center">
              <span className="text-xs text-slate-400">
                {prefs.features.length}件選択中
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "その他の条件",
      subtitle: "最後に駅徒歩と広さの条件を設定できます",
      content: (
        <div className="mx-auto max-w-sm space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-500">
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
              className="w-full rounded-xl border border-slate-200/60 bg-white/80 px-4 py-3.5 text-lg shadow-sm focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-500/10 transition-all duration-200 placeholder:text-slate-300"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-500">
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
              className="w-full rounded-xl border border-slate-200/60 bg-white/80 px-4 py-3.5 text-lg shadow-sm focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-500/10 transition-all duration-200 placeholder:text-slate-300"
            />
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      {/* Animated background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>

      {/* Subtle grid pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#0f172a08_1px,transparent_1px),linear-gradient(to_bottom,#0f172a08_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Glass card */}
      <div className="relative w-full max-w-lg rounded-2xl border border-white/40 bg-white/60 p-8 shadow-xl backdrop-blur-xl">
        {/* ロゴ */}
        <div className="mb-12 text-center">
          <h1 className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            MACHIBUSE
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            理想の住まいを、誰よりも早く。
          </p>
        </div>

        {/* プログレスバー */}
        <div className="mb-8 flex gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-700 ease-out ${
                i <= step ? "bg-gradient-to-r from-slate-800 to-slate-600" : "bg-slate-200/60"
              }`}
            />
          ))}
        </div>

        {/* ステップ番号 */}
        <p className="mb-2 text-center text-xs font-medium tracking-widest text-slate-400 uppercase">
          Step {step + 1} / {steps.length}
        </p>

        {/* ステップ内容 (animated on step change) */}
        <div key={step} className="animate-fade-in-up">
          <div className="mb-8 text-center">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              {currentStep.title}
            </h2>
            <p className="mt-2 text-sm text-slate-500">{currentStep.subtitle}</p>
          </div>

          <div className="mb-10">{currentStep.content}</div>
        </div>

        {/* ボタン */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors duration-200"
          >
            スキップ
          </button>
          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="rounded-xl border border-slate-200/60 bg-white/80 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-white hover:shadow-sm transition-all duration-200"
              >
                戻る
              </button>
            )}
            <button
              onClick={handleNext}
              className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/25 hover:shadow-xl hover:shadow-slate-900/30 hover:-translate-y-0.5 transition-all duration-200"
            >
              {isLast ? "はじめる" : "次へ →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
