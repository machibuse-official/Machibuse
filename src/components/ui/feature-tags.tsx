const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  // セキュリティ系 = 青
  security: { bg: "bg-blue-100", text: "text-blue-700" },
  // 水回り系 = 水色
  water: { bg: "bg-cyan-100", text: "text-cyan-700" },
  // キッチン系 = オレンジ
  kitchen: { bg: "bg-orange-100", text: "text-orange-700" },
  // 収納系 = 紫
  storage: { bg: "bg-purple-100", text: "text-purple-700" },
  // 通信・設備系 = 緑
  infra: { bg: "bg-green-100", text: "text-green-700" },
  // 空調系 = 赤
  climate: { bg: "bg-red-100", text: "text-red-700" },
  // デフォルト = グレー
  default: { bg: "bg-gray-100", text: "text-gray-700" },
};

const KEYWORD_CATEGORY: [string[], string][] = [
  [["オートロック", "防犯", "セキュリティ", "鍵", "モニター付", "カメラ", "ディンプル", "ダブルロック", "TVモニター"], "security"],
  [["浴室", "バス", "追焚", "シャワー", "洗面", "トイレ", "温水", "ウォシュレット", "独立洗面", "脱衣"], "water"],
  [["キッチン", "コンロ", "IH", "グリル", "食洗", "食器", "ガスコンロ", "システムキッチン", "カウンターキッチン"], "kitchen"],
  [["クローゼット", "収納", "ウォークイン", "シューズ", "パントリー", "押入"], "storage"],
  [["インターネット", "光ファイバー", "Wi-Fi", "CATV", "BS", "CS", "宅配ボックス", "光回線"], "infra"],
  [["エアコン", "床暖房", "暖房", "冷房", "浴室乾燥", "乾燥機"], "climate"],
];

function getCategory(feature: string): string {
  for (const [keywords, category] of KEYWORD_CATEGORY) {
    if (keywords.some((kw) => feature.includes(kw))) {
      return category;
    }
  }
  return "default";
}

interface FeatureTagsProps {
  features: string[];
  label?: string;
}

export function FeatureTags({ features, label }: FeatureTagsProps) {
  if (!features || features.length === 0) return null;

  return (
    <div>
      {label && (
        <h3 className="mb-2 text-sm font-semibold text-gray-700">{label}</h3>
      )}
      <div className="flex flex-wrap gap-2">
        {features.map((feature, idx) => {
          const category = getCategory(feature);
          const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
          return (
            <span
              key={idx}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}
            >
              {feature}
            </span>
          );
        })}
      </div>
    </div>
  );
}
