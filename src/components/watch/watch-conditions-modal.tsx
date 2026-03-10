"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  type WatchConditions,
  DEFAULT_CONDITIONS,
  updateWatchConditions,
} from "@/lib/watchlist";
import {
  LAYOUT_OPTIONS,
  RENT_OPTIONS,
  SIZE_OPTIONS,
  WALKING_OPTIONS,
} from "@/lib/preferences";

interface Props {
  mansionId: string;
  mansionName: string;
  initialConditions: WatchConditions;
  isOpen: boolean;
  onClose: () => void;
  onSave: (conditions: WatchConditions) => void;
}

export function WatchConditionsModal({
  mansionId,
  mansionName,
  initialConditions,
  isOpen,
  onClose,
  onSave,
}: Props) {
  const [conditions, setConditions] = useState<WatchConditions>(initialConditions);

  const handleSave = () => {
    updateWatchConditions(mansionId, conditions);
    onSave(conditions);
    onClose();
  };

  const handleReset = () => {
    setConditions({ ...DEFAULT_CONDITIONS });
  };

  const toggleLayout = (layout: string) => {
    setConditions((prev) => ({
      ...prev,
      layouts: prev.layouts.includes(layout)
        ? prev.layouts.filter((l) => l !== layout)
        : [...prev.layouts, layout],
    }));
  };

  const hasConditions =
    conditions.rentMin !== null ||
    conditions.rentMax !== null ||
    conditions.sizeMin !== null ||
    conditions.layouts.length > 0 ||
    conditions.walkingMax !== null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`監視条件 - ${mansionName}`}>
      <div className="space-y-5">
        {/* 賃料範囲 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            賃料範囲
          </label>
          <div className="flex items-center gap-2">
            <select
              value={conditions.rentMin ?? ""}
              onChange={(e) =>
                setConditions((prev) => ({
                  ...prev,
                  rentMin: e.target.value ? Number(e.target.value) : null,
                }))
              }
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              {RENT_OPTIONS.map((opt) => (
                <option key={`min-${opt.value}`} value={opt.value ?? ""}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="text-sm text-slate-400">〜</span>
            <select
              value={conditions.rentMax ?? ""}
              onChange={(e) =>
                setConditions((prev) => ({
                  ...prev,
                  rentMax: e.target.value ? Number(e.target.value) : null,
                }))
              }
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              {RENT_OPTIONS.map((opt) => (
                <option key={`max-${opt.value}`} value={opt.value ?? ""}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 間取り */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            間取りタイプ
          </label>
          <div className="flex flex-wrap gap-2">
            {LAYOUT_OPTIONS.map((layout) => (
              <button
                key={layout}
                onClick={() => toggleLayout(layout)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  conditions.layouts.includes(layout)
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {layout}
              </button>
            ))}
          </div>
        </div>

        {/* 面積下限 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            面積下限
          </label>
          <select
            value={conditions.sizeMin ?? ""}
            onChange={(e) =>
              setConditions((prev) => ({
                ...prev,
                sizeMin: e.target.value ? Number(e.target.value) : null,
              }))
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          >
            {SIZE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value ?? ""}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 駅徒歩上限 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            駅徒歩上限
          </label>
          <select
            value={conditions.walkingMax ?? ""}
            onChange={(e) =>
              setConditions((prev) => ({
                ...prev,
                walkingMax: e.target.value ? Number(e.target.value) : null,
              }))
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          >
            {WALKING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value ?? ""}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* アクション */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleReset}
            className="text-sm text-slate-500 hover:text-slate-700"
            disabled={!hasConditions}
          >
            条件をリセット
          </button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
