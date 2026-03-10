"use client";

import { useEffect, useRef, useState } from "react";
import type { MansionWithStats } from "@/types";

interface MansionMapProps {
  mansions: MansionWithStats[];
  watchedIds: string[];
  onMansionClick: (id: string) => void;
}

export function MansionMap({ mansions, watchedIds, onMansionClick }: MansionMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<unknown>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance) return;

    // Dynamic import to avoid SSR issues
    import("leaflet").then((L) => {
      // Fix default icon paths
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [35.6595, 139.7004], // 渋谷区付近
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // マーカー追加
      const markers: L.Marker[] = [];
      const bounds: L.LatLngTuple[] = [];

      for (const m of mansions) {
        if (!m.latitude || !m.longitude) continue;
        const isWatched = watchedIds.includes(m.id);
        const hasActive = m.active_listings_count > 0;

        const color = hasActive ? "#e5004f" : isWatched ? "#007aff" : "#8e8e93";

        const icon = L.divIcon({
          className: "custom-marker",
          html: `<div style="
            width: 28px; height: 28px; border-radius: 50%; background: ${color};
            border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 11px; font-weight: bold;
          ">${hasActive ? m.active_listings_count : ""}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([m.latitude, m.longitude], { icon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: -apple-system, sans-serif; min-width: 180px;">
            <p style="font-size: 13px; font-weight: bold; color: #333; margin: 0 0 4px;">${m.name}</p>
            <p style="font-size: 11px; color: #666; margin: 0 0 2px;">${m.address}</p>
            <p style="font-size: 11px; color: #666; margin: 0 0 6px;">${m.nearest_station} 徒歩${m.walking_minutes}分</p>
            ${hasActive
              ? `<p style="font-size: 14px; font-weight: bold; color: #e5004f; margin: 0 0 4px;">${m.active_listings_count}件募集中</p>`
              : `<p style="font-size: 12px; color: #999; margin: 0 0 4px;">現在募集なし</p>`
            }
            <a href="/mansions/${m.id}" style="font-size: 12px; color: #0066cc; text-decoration: none;">詳細を見る →</a>
          </div>
        `);

        marker.on("click", () => setSelectedId(m.id));
        markers.push(marker);
        bounds.push([m.latitude, m.longitude]);
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }

      setMapInstance(map);

      return () => {
        map.remove();
      };
    });
  }, [mansions, watchedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <div ref={mapRef} className="h-full w-full rounded-lg" style={{ minHeight: "500px" }} />
    </>
  );
}
