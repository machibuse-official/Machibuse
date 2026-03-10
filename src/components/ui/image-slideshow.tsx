"use client";

import { useState, useEffect, useCallback } from "react";

interface ImageSlideshowProps {
  images: { url: string; type: string; caption: string | null }[];
  alt: string;
  className?: string;
}

export function ImageSlideshow({ images, alt, className = "" }: ImageSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const nextImage = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  // 自動切り替え（3秒、ホバー時は1.5秒）
  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(nextImage, isHovered ? 1500 : 3000);
    return () => clearInterval(interval);
  }, [images.length, isHovered, nextImage]);

  if (images.length === 0) return null;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 画像 */}
      {images.map((img, i) => (
        <img
          key={img.url}
          src={img.url}
          alt={i === 0 ? alt : `${alt} - ${img.caption || img.type}`}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            i === currentIndex ? "opacity-100" : "opacity-0"
          }`}
          loading={i === 0 ? "eager" : "lazy"}
        />
      ))}

      {/* インジケーター（2枚以上の場合） */}
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrentIndex(i);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === currentIndex
                  ? "w-4 bg-white"
                  : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}

      {/* 画像タイプキャプション */}
      {images[currentIndex]?.caption && (
        <div className="absolute bottom-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
          {images[currentIndex].caption}
        </div>
      )}
    </div>
  );
}
