type StatusType =
  | "active"
  | "new"
  | "past"
  | "unknown"
  | "ended";

const statusConfig: Record<
  StatusType,
  { label: string; bgColor: string; textColor: string; dotColor: string }
> = {
  active: {
    label: "募集中",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    dotColor: "bg-emerald-500",
  },
  new: {
    label: "新着",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    dotColor: "bg-emerald-500",
  },
  past: {
    label: "過去掲載あり",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    dotColor: "bg-amber-500",
  },
  unknown: {
    label: "現在確認なし",
    bgColor: "bg-slate-50",
    textColor: "text-slate-500",
    dotColor: "bg-slate-400",
  },
  ended: {
    label: "終了",
    bgColor: "bg-red-50",
    textColor: "text-red-600",
    dotColor: "bg-red-500",
  },
};

interface StatusTagProps {
  status: StatusType;
  className?: string;
}

export function StatusTag({ status, className = "" }: StatusTagProps) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide ${config.bgColor} ${config.textColor} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
}
