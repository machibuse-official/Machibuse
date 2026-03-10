"use client";

interface PropertyMapProps {
  latitude?: number | null;
  longitude?: number | null;
  address: string;
}

export function PropertyMap({ latitude, longitude, address }: PropertyMapProps) {
  // lat/lngがある場合はそれで表示、なければaddressで検索
  const query =
    latitude && longitude
      ? `${latitude},${longitude}`
      : encodeURIComponent(address);

  const src =
    latitude && longitude
      ? `https://maps.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`
      : `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=16&output=embed`;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <iframe
        src={src}
        width="100%"
        height="300"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`${address} の地図`}
        className="rounded-xl"
      />
    </div>
  );
}
