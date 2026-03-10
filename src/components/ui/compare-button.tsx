"use client";

import { useState, useEffect } from "react";
import { isInCompare, toggleCompare } from "@/lib/compare";

interface Props {
  mansionId: string;
  size?: "sm" | "md";
  onToggle?: (added: boolean) => void;
}

export function CompareButton({ mansionId, size = "sm", onToggle }: Props) {
  const [inCompare, setInCompare] = useState(false);

  useEffect(() => {
    setInCompare(isInCompare(mansionId));
  }, [mansionId]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = toggleCompare(mansionId);
    if (result.full) {
      alert("比較は最大4件までです");
      return;
    }
    setInCompare(result.added);
    onToggle?.(result.added);
  };

  const sizeClass = size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm";

  return (
    <button
      onClick={handleClick}
      className={`${sizeClass} rounded-lg font-medium transition-colors ${
        inCompare
          ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
      title={inCompare ? "比較から外す" : "比較に追加"}
    >
      {inCompare ? "比較中" : "比較"}
    </button>
  );
}
