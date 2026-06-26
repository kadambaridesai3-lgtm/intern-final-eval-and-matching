interface Props {
  current: number;
  max: number;
  showLabel?: boolean;
}

export default function CapacityBar({ current, max, showLabel = true }: Props) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const full = current >= max;
  const high = pct >= 75;

  const barColor = full ? 'bg-red-500' : high ? 'bg-orange-400' : 'bg-green-500';
  const textColor = full ? 'text-red-600 font-semibold' : 'text-gray-700';

  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className={`text-xs tabular-nums ${textColor}`}>
          {current}/{max}
        </span>
      )}
    </div>
  );
}
