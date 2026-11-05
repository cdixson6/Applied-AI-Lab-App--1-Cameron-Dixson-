import React, { useState, useMemo } from 'react';
import { RegionQuarterMatrix } from '../types';
import { formatCompactCurrency, formatCurrency } from '../utils/analytics';
import { BarChart3, TrendingUp, Layers, ArrowRightLeft } from 'lucide-react';

interface RevenueChartProps {
  matrixData: RegionQuarterMatrix;
  highlightedRegion?: string;
  onSelectRegion?: (region: string) => void;
}

type ChartMode = 'grouped_region' | 'grouped_quarter' | 'q2_q3_variance' | 'stacked';

const REGION_COLORS: Record<string, string> = {
  'North America': '#3b82f6', // blue-500
  'EMEA': '#10b981',          // emerald-500
  'APAC': '#f59e0b',          // amber-500
  'Latin America': '#8b5cf6', // purple-500
  'LATAM': '#8b5cf6',
  'Global': '#64748b'
};

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6'];

const QUARTER_COLORS: Record<string, string> = {
  'Q1': '#94a3b8', // slate-400
  'Q2': '#3b82f6', // blue-500
  'Q3': '#6366f1', // indigo-500
  'Q4': '#10b981'  // emerald-500
};

export const RevenueChart: React.FC<RevenueChartProps> = ({
  matrixData,
  highlightedRegion,
  onSelectRegion
}) => {
  const [mode, setMode] = useState<ChartMode>('grouped_region');
  const [hoveredData, setHoveredData] = useState<{
    label: string;
    subLabel: string;
    value: number;
    units?: number;
    pct?: number;
    x: number;
    y: number;
  } | null>(null);

  const { regions, quarters, matrix, unitsMatrix } = matrixData;

  const colorForRegion = (region: string, idx: number) => {
    return REGION_COLORS[region] || PALETTE[idx % PALETTE.length];
  };

  const colorForQuarter = (quarter: string, idx: number) => {
    return QUARTER_COLORS[quarter] || PALETTE[idx % PALETTE.length];
  };

  // SVG dimensions
  const width = 840;
  const height = 360;
  const padding = { top: 40, right: 30, bottom: 65, left: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Max value computation based on mode
  const { maxVal, minVal } = useMemo(() => {
    if (mode === 'stacked') {
      let maxStack = 0;
      regions.forEach(r => {
        let stackSum = 0;
        quarters.forEach(q => {
          stackSum += matrix[r]?.[q] || 0;
        });
        if (stackSum > maxStack) maxStack = stackSum;
      });
      return { maxVal: maxStack * 1.15 || 1000, minVal: 0 };
    }

    if (mode === 'q2_q3_variance') {
      let maxDelta = 0;
      let minDelta = 0;
      regions.forEach(r => {
        const q2 = matrix[r]?.['Q2'] || 0;
        const q3 = matrix[r]?.['Q3'] || 0;
        const delta = q3 - q2;
        if (delta > maxDelta) maxDelta = delta;
        if (delta < minDelta) minDelta = delta;
      });
      const bound = Math.max(Math.abs(maxDelta), Math.abs(minDelta), 1000) * 1.25;
      return { maxVal: bound, minVal: -bound };
    }

    // Default grouped modes
    let max = 0;
    regions.forEach(r => {
      quarters.forEach(q => {
        const val = matrix[r]?.[q] || 0;
        if (val > max) max = val;
      });
    });
    return { maxVal: max * 1.2 || 1000, minVal: 0 };
  }, [mode, regions, quarters, matrix]);

  // Y-Scale helper
  const getY = (val: number) => {
    if (mode === 'q2_q3_variance') {
      const range = maxVal - minVal;
      const zeroY = padding.top + chartHeight / 2;
      return zeroY - (val / maxVal) * (chartHeight / 2);
    }
    const ratio = Math.max(0, val) / maxVal;
    return padding.top + chartHeight - ratio * chartHeight;
  };

  const zeroLineY = getY(0);

  // Y-Axis Ticks
  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const count = 5;
    if (mode === 'q2_q3_variance') {
      for (let i = -count; i <= count; i++) {
        if (i % 2 === 0) {
          ticks.push((maxVal / count) * i);
        }
      }
    } else {
      for (let i = 0; i <= count; i++) {
        ticks.push((maxVal / count) * i);
      }
    }
    return ticks;
  }, [maxVal, minVal, mode]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      {/* Chart Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-100">
              Revenue Breakdown by Region & Quarter
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare quarterly revenue trajectories, regional shares, and Q2-to-Q3 variance deltas
          </p>
        </div>

        {/* Mode Selector Pill Group */}
        <div className="inline-flex rounded-lg bg-slate-800/90 p-1 border border-slate-700/60 self-start md:self-auto">
          <button
            onClick={() => setMode('grouped_region')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'grouped_region'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            By Region
          </button>
          <button
            onClick={() => setMode('grouped_quarter')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'grouped_quarter'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            By Quarter
          </button>
          <button
            onClick={() => setMode('q2_q3_variance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'q2_q3_variance'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Q2→Q3 Delta
          </button>
          <button
            onClick={() => setMode('stacked')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'stacked'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Stacked
          </button>
        </div>
      </div>

      {/* SVG Interactive Chart Canvas */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[620px] select-none"
          onMouseLeave={() => setHoveredData(null)}
        >
          {/* Grid lines and Y-axis labels */}
          {yTicks.map((tick, i) => {
            const y = getY(tick);
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#334155"
                  strokeDasharray={tick === 0 ? '0' : '3 3'}
                  strokeWidth={tick === 0 ? 1.5 : 1}
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="11"
                  fontFamily="system-ui"
                >
                  {formatCompactCurrency(tick)}
                </text>
              </g>
            );
          })}

          {/* MODE 1: Grouped by Region */}
          {mode === 'grouped_region' && (
            regions.map((region, rIdx) => {
              const groupWidth = chartWidth / regions.length;
              const groupX = padding.left + rIdx * groupWidth;
              const barCount = quarters.length;
              const barWidth = Math.min(26, (groupWidth * 0.75) / barCount);
              const isHighlight = highlightedRegion === region;

              return (
                <g
                  key={region}
                  onClick={() => onSelectRegion?.(region)}
                  className="cursor-pointer"
                >
                  {/* Subtle background for highlighted region */}
                  {isHighlight && (
                    <rect
                      x={groupX + 4}
                      y={padding.top}
                      width={groupWidth - 8}
                      height={chartHeight}
                      fill="#312e81"
                      fillOpacity="0.25"
                      rx="6"
                    />
                  )}

                  {quarters.map((quarter, qIdx) => {
                    const rev = matrix[region]?.[quarter] || 0;
                    const units = unitsMatrix[region]?.[quarter] || 0;
                    const barX = groupX + (groupWidth - barCount * barWidth) / 2 + qIdx * barWidth;
                    const barY = getY(rev);
                    const barH = padding.top + chartHeight - barY;
                    const color = colorForQuarter(quarter, qIdx);

                    return (
                      <g key={quarter}>
                        <rect
                          x={barX}
                          y={barY}
                          width={barWidth - 3}
                          height={Math.max(2, barH)}
                          fill={color}
                          rx="3"
                          className="transition-all duration-200 hover:brightness-125"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredData({
                              label: `${region} — ${quarter}`,
                              subLabel: `Revenue: ${formatCurrency(rev)}`,
                              value: rev,
                              units,
                              x: barX + barWidth / 2,
                              y: barY
                            });
                          }}
                        />
                      </g>
                    );
                  })}

                  {/* Region X-Axis Label */}
                  <text
                    x={groupX + groupWidth / 2}
                    y={height - 20}
                    textAnchor="middle"
                    fill={isHighlight ? '#38bdf8' : '#cbd5e1'}
                    fontWeight={isHighlight ? '600' : '500'}
                    fontSize="12"
                  >
                    {region}
                  </text>
                </g>
              );
            })
          )}

          {/* MODE 2: Grouped by Quarter */}
          {mode === 'grouped_quarter' && (
            quarters.map((quarter, qIdx) => {
              const groupWidth = chartWidth / quarters.length;
              const groupX = padding.left + qIdx * groupWidth;
              const barCount = regions.length;
              const barWidth = Math.min(28, (groupWidth * 0.78) / barCount);

              return (
                <g key={quarter}>
                  {regions.map((region, rIdx) => {
                    const rev = matrix[region]?.[quarter] || 0;
                    const units = unitsMatrix[region]?.[quarter] || 0;
                    const barX = groupX + (groupWidth - barCount * barWidth) / 2 + rIdx * barWidth;
                    const barY = getY(rev);
                    const barH = padding.top + chartHeight - barY;
                    const color = colorForRegion(region, rIdx);

                    return (
                      <rect
                        key={region}
                        x={barX}
                        y={barY}
                        width={barWidth - 4}
                        height={Math.max(2, barH)}
                        fill={color}
                        rx="3"
                        className="transition-all duration-200 hover:brightness-125 cursor-pointer"
                        onMouseEnter={() => {
                          setHoveredData({
                            label: `${quarter} — ${region}`,
                            subLabel: `Revenue: ${formatCurrency(rev)}`,
                            value: rev,
                            units,
                            x: barX + barWidth / 2,
                            y: barY
                          });
                        }}
                      />
                    );
                  })}

                  <text
                    x={groupX + groupWidth / 2}
                    y={height - 20}
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontWeight="600"
                    fontSize="13"
                  >
                    {quarter}
                  </text>
                </g>
              );
            })
          )}

          {/* MODE 3: Q2 -> Q3 Variance Delta */}
          {mode === 'q2_q3_variance' && (
            regions.map((region, rIdx) => {
              const colWidth = chartWidth / regions.length;
              const colX = padding.left + rIdx * colWidth;
              const barWidth = Math.min(48, colWidth * 0.6);
              const barX = colX + (colWidth - barWidth) / 2;

              const q2Rev = matrix[region]?.['Q2'] || 0;
              const q3Rev = matrix[region]?.['Q3'] || 0;
              const delta = q3Rev - q2Rev;
              const pct = q2Rev > 0 ? (delta / q2Rev) * 100 : 0;
              const isPositive = delta >= 0;

              const barY = isPositive ? getY(delta) : zeroLineY;
              const barH = Math.abs(getY(delta) - zeroLineY);
              const color = isPositive ? '#10b981' : '#ef4444';

              const isHighlight = highlightedRegion === region;

              return (
                <g
                  key={region}
                  onClick={() => onSelectRegion?.(region)}
                  className="cursor-pointer"
                >
                  {isHighlight && (
                    <rect
                      x={colX + 4}
                      y={padding.top}
                      width={colWidth - 8}
                      height={chartHeight}
                      fill="#312e81"
                      fillOpacity="0.2"
                      rx="6"
                    />
                  )}

                  <rect
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={Math.max(3, barH)}
                    fill={color}
                    rx="4"
                    className="transition-all duration-200 hover:brightness-125"
                    onMouseEnter={() => {
                      setHoveredData({
                        label: `${region} (Q2 to Q3 Variance)`,
                        subLabel: `Q2: ${formatCurrency(q2Rev)} → Q3: ${formatCurrency(q3Rev)}`,
                        value: delta,
                        pct,
                        x: barX + barWidth / 2,
                        y: isPositive ? barY : barY + barH
                      });
                    }}
                  />

                  {/* Delta text on top/bottom of bar */}
                  <text
                    x={barX + barWidth / 2}
                    y={isPositive ? barY - 8 : barY + barH + 16}
                    textAnchor="middle"
                    fill={isPositive ? '#34d399' : '#f87171'}
                    fontSize="11"
                    fontWeight="600"
                  >
                    {isPositive ? '+' : ''}{formatCompactCurrency(delta)} ({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)
                  </text>

                  <text
                    x={colX + colWidth / 2}
                    y={height - 20}
                    textAnchor="middle"
                    fill={isHighlight ? '#38bdf8' : '#cbd5e1'}
                    fontWeight={isHighlight ? '600' : '500'}
                    fontSize="12"
                  >
                    {region}
                  </text>
                </g>
              );
            })
          )}

          {/* MODE 4: Stacked by Quarter */}
          {mode === 'stacked' && (
            regions.map((region, rIdx) => {
              const colWidth = chartWidth / regions.length;
              const colX = padding.left + rIdx * colWidth;
              const barWidth = Math.min(42, colWidth * 0.55);
              const barX = colX + (colWidth - barWidth) / 2;

              let runningTotal = 0;

              return (
                <g key={region}>
                  {quarters.map((quarter, qIdx) => {
                    const rev = matrix[region]?.[quarter] || 0;
                    const prevTop = runningTotal;
                    runningTotal += rev;

                    const barY = getY(runningTotal);
                    const barBottom = getY(prevTop);
                    const barH = barBottom - barY;
                    const color = colorForQuarter(quarter, qIdx);

                    return (
                      <rect
                        key={quarter}
                        x={barX}
                        y={barY}
                        width={barWidth}
                        height={Math.max(0, barH)}
                        fill={color}
                        stroke="#0f172a"
                        strokeWidth="1"
                        className="transition-all duration-200 hover:brightness-125 cursor-pointer"
                        onMouseEnter={() => {
                          setHoveredData({
                            label: `${region} — ${quarter}`,
                            subLabel: `Quarter Revenue: ${formatCurrency(rev)}`,
                            value: rev,
                            pct: (rev / (runningTotal || 1)) * 100,
                            x: barX + barWidth / 2,
                            y: barY
                          });
                        }}
                      />
                    );
                  })}

                  <text
                    x={colX + colWidth / 2}
                    y={height - 20}
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontWeight="500"
                    fontSize="12"
                  >
                    {region}
                  </text>
                </g>
              );
            })
          )}

          {/* Tooltip Overlay */}
          {hoveredData && (
            <g transform={`translate(${Math.min(width - 160, Math.max(80, hoveredData.x))}, ${Math.max(50, hoveredData.y - 15)})`}>
              <rect
                x="-80"
                y="-45"
                width="160"
                height="45"
                rx="6"
                fill="#0f172a"
                stroke="#475569"
                strokeWidth="1"
                className="drop-shadow-lg"
              />
              <text x="0" y="-28" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="600">
                {hoveredData.label}
              </text>
              <text x="0" y="-12" textAnchor="middle" fill="#38bdf8" fontSize="11">
                {hoveredData.subLabel}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Legend Area */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-4 pt-3 border-t border-slate-800 text-xs">
        {mode === 'grouped_quarter' ? (
          // Region colors legend
          regions.map((region, i) => (
            <div key={region} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: colorForRegion(region, i) }}
              />
              <span className="text-slate-300 font-medium">{region}</span>
            </div>
          ))
        ) : mode === 'q2_q3_variance' ? (
          <div className="flex items-center gap-6 text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span>Positive Variance (Revenue Growth Q2→Q3)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-red-500" />
              <span>Negative Variance (Revenue Contraction Q2→Q3)</span>
            </div>
          </div>
        ) : (
          // Quarter colors legend
          quarters.map((q, i) => (
            <div key={q} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: colorForQuarter(q, i) }}
              />
              <span className="text-slate-300 font-medium">{q} Revenue</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
