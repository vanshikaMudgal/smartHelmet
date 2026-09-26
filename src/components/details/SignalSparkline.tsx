import React from 'react';

interface SignalSparklineProps {
  data: number[];
  colorHex: string;
  height?: number;
  width?: number;
}

export const SignalSparkline: React.FC<SignalSparklineProps> = ({
  data,
  colorHex,
  height = 50,
  width = 240,
}) => {
  if (!data || data.length < 2) {
    return (
      <div className="h-12 flex items-center justify-center text-xs font-mono text-slate-400">
        Accumulating signal data...
      </div>
    );
  }

  const minVal = -100;
  const maxVal = -40;
  const range = maxVal - minVal;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * (width - 10) + 5;
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    const normalizedY = 1 - (clamped - minVal) / range;
    const y = normalizedY * (height - 12) + 6;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `M ${points[0]} L ${points.join(' L ')} L ${width - 5},${height} L 5,${height} Z`;

  const gradientId = `sparkline-grad-${Math.random().toString(36).substring(2, 7)}`;

  return (
    <div className="w-full flex flex-col gap-1">
      <div className="w-full overflow-hidden rounded bg-white border border-slate-200 p-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-12 overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorHex} stopOpacity="0.25" />
              <stop offset="100%" stopColor={colorHex} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path d={areaD} fill={`url(#${gradientId})`} />

          {/* Stroke line */}
          <path
            d={pathD}
            fill="none"
            stroke={colorHex}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Current point highlight */}
          {points.length > 0 && (
            <circle
              cx={points[points.length - 1].split(',')[0]}
              cy={points[points.length - 1].split(',')[1]}
              r="3.5"
              fill={colorHex}
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          )}
        </svg>
      </div>

      <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 px-1">
        <span>-100 dBm</span>
        <span className="font-bold text-slate-700">Latest: {data[data.length - 1]} dBm</span>
        <span>-40 dBm</span>
      </div>
    </div>
  );
};
