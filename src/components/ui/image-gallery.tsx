"use client";

import { useState } from "react";

interface GalleryImage {
  image_url: string;
  image_type: string;
  caption: string | null;
}

const IMAGE_TYPE_LABELS: Record<string, string> = {
  exterior: "外観",
  interior: "内装",
  floorplan: "間取り図",
  entrance: "エントランス",
  kitchen: "キッチン",
  bathroom: "浴室",
  view: "眺望",
  other: "その他",
};

export function ImageGallery({ images }: { images: GalleryImage[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-400">画像がありません</p>
        </div>
      </div>
    );
  }

  const current = images[selectedIndex];

  return (
    <div className="space-y-3">
      {/* メイン画像 */}
      <div className="relative overflow-hidden rounded-xl bg-gray-100">
        <img
          src={current.image_url}
          alt={current.caption || IMAGE_TYPE_LABELS[current.image_type] || "物件画像"}
          className="h-80 w-full object-cover"
        />
        {/* タイプラベル */}
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
          {IMAGE_TYPE_LABELS[current.image_type] || current.image_type}
        </span>
        {/* キャプション */}
        {current.caption && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-8">
            <p className="text-sm text-white">{current.caption}</p>
          </div>
        )}
        {/* カウンター */}
        {images.length > 1 && (
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            {selectedIndex + 1} / {images.length}
          </span>
        )}
      </div>

      {/* サムネイル一覧 */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={`relative flex-shrink-0 overflow-hidden rounded-lg transition-all ${
                idx === selectedIndex
                  ? "ring-2 ring-blue-500 ring-offset-1"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              <img
                src={img.image_url}
                alt={img.caption || IMAGE_TYPE_LABELS[img.image_type] || ""}
                className="h-16 w-20 object-cover"
              />
              <span className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 text-center text-[10px] text-white">
                {IMAGE_TYPE_LABELS[img.image_type] || img.image_type}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
