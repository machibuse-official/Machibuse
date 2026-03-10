"use client";

import { useState, useEffect } from "react";
import { isFavorite, toggleFavorite, type FavoriteEntry } from "@/lib/favorites";

interface Props {
  type: FavoriteEntry["type"];
  id: string;
  size?: "sm" | "md";
}

export function FavoriteButton({ type, id, size = "md" }: Props) {
  const [faved, setFaved] = useState(false);

  useEffect(() => {
    setFaved(isFavorite(type, id));
  }, [type, id]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowFaved = toggleFavorite(type, id);
    setFaved(nowFaved);
  };

  const sizeClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const btnClass = size === "sm" ? "p-1" : "p-1.5";

  return (
    <button
      onClick={handleClick}
      className={`${btnClass} rounded-full transition-colors hover:bg-rose-50`}
      title={faved ? "お気に入り解除" : "お気に入り追加"}
    >
      <svg
        className={`${sizeClass} transition-colors ${faved ? "fill-rose-500 text-rose-500" : "fill-none text-slate-400 hover:text-rose-400"}`}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    </button>
  );
}
