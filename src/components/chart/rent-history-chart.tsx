"use client";

import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  Bar,
} from "recharts";

type Listing = {
  detected_at: string;
  current_rent: number;
  ended_at: string | null;
  status: string;
};

type Props = {
  listings: Listing[];
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

function formatFullDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ja-JP");
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86400000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

type TooltipPayloadItem = {
  value: number;
  dataKey: string;
  payload: {
    fullDate: string;
    status: string;
    endedAt: string | null;
    durationDays: number | null;
    priceChange: number | null;
  };
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const rentItem = payload.find((p) => p.dataKey === "rent");
  if (!rentItem) return null;

  const data = rentItem;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md">
      <p className="text-sm font-semibold text-gray-900">
        {data.value.toFixed(1)}万円
      </p>
      {data.payload.priceChange !== null && data.payload.priceChange !== 0 && (
        <p className={`text-xs font-medium ${data.payload.priceChange < 0 ? "text-green-600" : "text-red-600"}`}>
          {data.payload.priceChange > 0 ? "+" : ""}{data.payload.priceChange.toFixed(1)}万円
        </p>
      )}
      <p className="text-xs text-gray-500">
        検知日: {data.payload.fullDate}
      </p>
      <p className="text-xs text-gray-500">
        状態: {data.payload.status === "active" ? "募集中" : "終了"}
      </p>
      {data.payload.durationDays !== null && (
        <p className="text-xs text-gray-500">
          掲載期間: {data.payload.durationDays}日間
        </p>
      )}
      {data.payload.endedAt && (
        <p className="text-xs text-gray-500">
          終了日: {formatFullDate(data.payload.endedAt)}
        </p>
      )}
    </div>
  );
}

export function RentHistoryChart({ listings }: Props) {
  if (listings.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
        <p className="text-sm text-gray-400">賃料推移データなし</p>
      </div>
    );
  }

  const sorted = [...listings].sort(
    (a, b) => new Date(a.detected_at).getTime() - new Date(b.detected_at).getTime()
  );

  const chartData = sorted.map((l, i) => {
    const rent = Number((l.current_rent / 10000).toFixed(1));
    const prevRent = i > 0 ? Number((sorted[i - 1].current_rent / 10000).toFixed(1)) : null;
    const priceChange = prevRent !== null ? Number((rent - prevRent).toFixed(1)) : null;
    const durationDays = l.ended_at ? daysBetween(l.detected_at, l.ended_at) : null;

    return {
      date: formatDate(l.detected_at),
      fullDate: formatFullDate(l.detected_at),
      rent,
      status: l.status,
      endedAt: l.ended_at,
      durationDays,
      priceChange,
      // 掲載期間バー表示用
      duration: durationDays || (l.status === "active" ? daysBetween(l.detected_at, new Date().toISOString()) : 0),
    };
  });

  const rents = chartData.map((d) => d.rent);
  const minRent = Math.floor(Math.min(...rents) - 1);
  const maxRent = Math.ceil(Math.max(...rents) + 1);
  const avgRent = Number((rents.reduce((a, b) => a + b, 0) / rents.length).toFixed(1));

  // 統計情報
  const priceChanges = chartData
    .map((d) => d.priceChange)
    .filter((c): c is number => c !== null && c !== 0);
  const totalChange = rents.length >= 2 ? Number((rents[rents.length - 1] - rents[0]).toFixed(1)) : 0;
  const avgDuration = chartData
    .filter((d) => d.durationDays !== null)
    .reduce((sum, d) => sum + (d.durationDays || 0), 0);
  const durationCount = chartData.filter((d) => d.durationDays !== null).length;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">賃料推移</h3>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>平均: {avgRent}万円</span>
          <span>{chartData.length}件</span>
          {totalChange !== 0 && (
            <span className={totalChange < 0 ? "text-green-600" : "text-red-600"}>
              {totalChange > 0 ? "+" : ""}{totalChange}万円
            </span>
          )}
        </div>
      </div>

      {/* 統計サマリー */}
      {(priceChanges.length > 0 || durationCount > 0) && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-2.5">
            <p className="text-[11px] text-gray-500">最安値</p>
            <p className="text-sm font-bold text-gray-900">{Math.min(...rents)}万円</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-2.5">
            <p className="text-[11px] text-gray-500">最高値</p>
            <p className="text-sm font-bold text-gray-900">{Math.max(...rents)}万円</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-2.5">
            <p className="text-[11px] text-gray-500">変動回数</p>
            <p className="text-sm font-bold text-gray-900">{priceChanges.length}回</p>
          </div>
          {durationCount > 0 && (
            <div className="rounded-lg bg-gray-50 p-2.5">
              <p className="text-[11px] text-gray-500">平均掲載期間</p>
              <p className="text-sm font-bold text-gray-900">
                {Math.round(avgDuration / durationCount)}日
              </p>
            </div>
          )}
        </div>
      )}

      {/* メインチャート */}
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <defs>
            <linearGradient id="rentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
          />
          <YAxis
            yAxisId="rent"
            domain={[minRent, maxRent]}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            tickFormatter={(v: number) => `${v}万`}
          />
          <YAxis
            yAxisId="duration"
            orientation="right"
            tick={{ fontSize: 11, fill: "#d1d5db" }}
            tickLine={false}
            tickFormatter={(v: number) => `${v}日`}
            hide={durationCount === 0}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            yAxisId="rent"
            y={avgRent}
            stroke="#d1d5db"
            strokeDasharray="4 4"
            label={{
              value: `平均 ${avgRent}万`,
              position: "right",
              fontSize: 10,
              fill: "#9ca3af",
            }}
          />
          {durationCount > 0 && (
            <Bar
              yAxisId="duration"
              dataKey="duration"
              fill="#e5e7eb"
              opacity={0.5}
              barSize={16}
              radius={[2, 2, 0, 0]}
            />
          )}
          <Area
            yAxisId="rent"
            type="monotone"
            dataKey="rent"
            stroke="none"
            fill="url(#rentGradient)"
          />
          <Line
            yAxisId="rent"
            type="monotone"
            dataKey="rent"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={(props: Record<string, unknown>) => {
              const { cx, cy, payload } = props as { cx: number; cy: number; payload: { status: string; priceChange: number | null } };
              const isActive = payload.status === "active";
              const hasChange = payload.priceChange !== null && payload.priceChange !== 0;
              return (
                <circle
                  key={`dot-${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={hasChange ? 5 : 4}
                  fill={isActive ? "#2563eb" : "#6b7280"}
                  stroke={hasChange ? (payload.priceChange! < 0 ? "#16a34a" : "#dc2626") : "#fff"}
                  strokeWidth={hasChange ? 2 : 1.5}
                />
              );
            }}
            activeDot={{ r: 7, fill: "#1d4ed8", strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* 凡例 */}
      <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-600" /> 募集中
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-gray-500" /> 終了
        </span>
        {durationCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-gray-200" /> 掲載期間
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-4 bg-gray-300" style={{ borderTop: "2px dashed #d1d5db" }} /> 平均
        </span>
      </div>
    </div>
  );
}
