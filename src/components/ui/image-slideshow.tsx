"use client";

import { useState, useCallback } from "react";

interface ImageData {
  url: string;
  type: string;
  caption: string | null;
}

interface ImageSlideshowProps {
  images: ImageData[];
  alt: string;
  className?: string;
  /** カテゴリタブを表示するか（詳細ページ用） */
  showCategories?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  exterior: "外観",
  entrance: "エントランス",
  common: "共用部分",
  interior: "室内",
  kitchen: "キッチン",
  bathroom: "バス・トイレ",
  view: "眺望",
  floorplan: "間取り",
  other: "その他",
};

const CATEGORY_ORDER = ["exterior", "entrance", "common", "interior", "kitchen", "bathroom", "view", "floorplan", "other"];

export function ImageSlideshow({ images, alt, className = "", showCategories = false }: ImageSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imgError, setImgError] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // カテゴリ別にグループ化
  const categories = CATEGORY_ORDER
    .map((type) => ({
      type,
      label: CATEGORY_LABELS[type] || type,
      images: images.filter((img) => img.type === type),
    }))
    .filter((cat) => cat.images.length > 0);

  // 表示する画像リスト（カテゴリ選択時はそのカテゴリのみ）
  const displayImages = activeCategory
    ? images.filter((img) => img.type === activeCategory)
    : images;

  const validImages = displayImages.filter((img) => !imgError.has(img.url));

  const safeIndex = Math.min(currentIndex, Math.max(0, validImages.length - 1));

  const goTo = useCallback((idx: number) => {
    setCurrentIndex(idx);
  }, []);

  const goPrev = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev <= 0 ? validImages.length - 1 : prev - 1));
  }, [validImages.length]);

  const goNext = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev >= validImages.length - 1 ? 0 : prev + 1));
  }, [validImages.length]);

  if (validImages.length === 0) return null;

  // コンパクトモード（一覧カードなど）
  if (!showCategories) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        {validImages.map((img, i) => (
          <img
            key={img.url}
            src={img.url}
            alt={i === 0 ? alt : `${alt} - ${img.caption || img.type}`}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
              i === safeIndex ? "opacity-100" : "opacity-0"
            }`}
            loading={i === 0 ? "eager" : "lazy"}
            onError={() => setImgError((prev) => new Set(prev).add(img.url))}
          />
        ))}

        {/* 左右ボタン */}
        {validImages.length > 1 && (
          <>
            <button onClick={goPrev} className="absolute left-1 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/30 text-white opacity-0 transition-opacity hover:bg-black/50 group-hover:opacity-100 [div:hover>&]:opacity-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <button onClick={goNext} className="absolute right-1 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/30 text-white opacity-0 transition-opacity hover:bg-black/50 group-hover:opacity-100 [div:hover>&]:opacity-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          </>
        )}

        {/* ドットインジケーター */}
        {validImages.length > 1 && (
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
            {validImages.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo(i); }}
                className={`h-1.5 rounded-full transition-all ${
                  i === safeIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        )}

        {/* キャプション */}
        {validImages[safeIndex]?.caption && (
          <div className="absolute bottom-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
            {validImages[safeIndex].caption}
          </div>
        )}
      </div>
    );
  }

  // カテゴリ付きモード（建物詳細ページ用）
  return (
    <div className={`overflow-hidden ${className}`}>
      {/* カテゴリタブ */}
      {categories.length > 1 && (
        <div className="flex gap-1 overflow-x-auto px-1 pb-2 scrollbar-hide">
          <button
            onClick={() => { setActiveCategory(null); setCurrentIndex(0); }}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
              activeCategory === null
                ? "bg-[#007aff] text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            すべて ({images.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.type}
              onClick={() => { setActiveCategory(cat.type); setCurrentIndex(0); }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                activeCategory === cat.type
                  ? "bg-[#007aff] text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.label} ({cat.images.length})
            </button>
          ))}
        </div>
      )}

      {/* メイン画像エリア */}
      <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-gray-100">
        {validImages.map((img, i) => (
          <img
            key={img.url}
            src={img.url}
            alt={i === 0 ? alt : `${alt} - ${img.caption || CATEGORY_LABELS[img.type] || img.type}`}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
              i === safeIndex ? "opacity-100" : "opacity-0"
            }`}
            loading={i === 0 ? "eager" : "lazy"}
            onError={() => setImgError((prev) => new Set(prev).add(img.url))}
          />
        ))}

        {/* 左右ナビ */}
        {validImages.length > 1 && (
          <>
            <button onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <button onClick={goNext} className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          </>
        )}

        {/* カテゴリラベル + カウンター */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-8">
          <span className="rounded bg-white/20 px-2 py-0.5 text-[12px] font-medium text-white backdrop-blur-sm">
            {CATEGORY_LABELS[validImages[safeIndex]?.type] || validImages[safeIndex]?.caption || ""}
          </span>
          <span className="text-[12px] tabular-nums text-white/80">
            {safeIndex + 1} / {validImages.length}
          </span>
        </div>
      </div>

      {/* サムネイルストリップ */}
      {validImages.length > 1 && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {validImages.map((img, i) => (
            <button
              key={img.url}
              onClick={() => goTo(i)}
              className={`relative shrink-0 overflow-hidden rounded-md transition-all ${
                i === safeIndex
                  ? "ring-2 ring-[#007aff] ring-offset-1"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              <img
                src={img.url}
                alt={img.caption || CATEGORY_LABELS[img.type] || ""}
                className="h-14 w-20 object-cover"
                loading="lazy"
                onError={() => setImgError((prev) => new Set(prev).add(img.url))}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-px text-center text-[9px] text-white">
                {CATEGORY_LABELS[img.type] || img.type}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
