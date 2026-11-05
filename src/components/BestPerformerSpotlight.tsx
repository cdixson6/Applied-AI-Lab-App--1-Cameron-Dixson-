import React, { useState } from 'react';
import { RegionPerformanceSummary } from '../types';
import { formatCurrency, formatCompactCurrency } from '../utils/analytics';
import { Trophy, Crown, Flame, Award, TrendingUp, Package, Network, Calendar, CheckCircle2 } from 'lucide-react';

interface BestPerformerSpotlightProps {
  performanceData: {
    allRegionsRanked: RegionPerformanceSummary[];
    topPerformer: RegionPerformanceSummary | null;
    grandTotalRevenue: number;
  };
  selectedRegionName?: string;
  onSelectRegion?: (region: string) => void;
}

export const BestPerformerSpotlight: React.FC<BestPerformerSpotlightProps> = ({
  performanceData,
  selectedRegionName,
  onSelectRegion
}) => {
  const { allRegionsRanked, topPerformer, grandTotalRevenue } = performanceData;

  const [activeTabRegion, setActiveTabRegion] = useState<string>(
    selectedRegionName || topPerformer?.region || ''
  );

  // Keep synced if user selects from elsewhere
  React.useEffect(() => {
    if (selectedRegionName) {
      setActiveTabRegion(selectedRegionName);
    } else if (topPerformer) {
      setActiveTabRegion(topPerformer.region);
    }
  }, [selectedRegionName, topPerformer]);

  if (!topPerformer) return null;

  // Active highlighted region details
  const activeRegion = allRegionsRanked.find(r => r.region === activeTabRegion) || topPerformer;
  const isTopOverall = activeRegion.rank === 1;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 border border-amber-500/30 rounded-xl p-5 shadow-2xl relative overflow-hidden">
      {/* Decorative ambient gold glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Trophy Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-1.5">
                Regional Sales Performer Spotlight
              </h3>
              <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-amber-500/40">
                <Crown className="w-3 h-3 text-amber-400" />
                #1 Champion: {topPerformer.region}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Highlighting the highest-grossing region and top contributors across all quarters
            </p>
          </div>
        </div>

        {/* Region Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto bg-slate-950/80 p-1 rounded-lg border border-slate-800">
          {allRegionsRanked.map(reg => {
            const isSelected = activeRegion.region === reg.region;
            const isFirst = reg.rank === 1;

            return (
              <button
                key={reg.region}
                onClick={() => {
                  setActiveTabRegion(reg.region);
                  onSelectRegion?.(reg.region);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? isFirst
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-md'
                      : 'bg-indigo-600 text-white font-semibold shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {isFirst && <Crown className="w-3 h-3 text-amber-900" />}
                <span>{reg.region}</span>
                <span className={`text-[10px] font-mono px-1 rounded ${
                  isSelected
                    ? isFirst ? 'bg-amber-600/30 text-slate-950' : 'bg-indigo-700 text-indigo-100'
                    : 'text-slate-500'
                }`}>
                  #{reg.rank}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Spotlight Showcase Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 relative z-10">
        {/* Left Card: Overall Sales Performance Core */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold uppercase tracking-wider">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Rank #{activeRegion.rank} Region</span>
              </div>
              {isTopOverall && (
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/40">
                  TOP PERFORMER
                </span>
              )}
            </div>

            <div className="mt-2">
              <h4 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-sans tracking-tight">
                {activeRegion.region}
              </h4>
              <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400 mt-1">
                {formatCurrency(activeRegion.totalRevenue)}
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span>Overall Total Sales Revenue</span>
                <span>•</span>
                <span className="text-slate-300 font-mono font-semibold">{formatCompactCurrency(activeRegion.totalRevenue)}</span>
              </div>
            </div>
          </div>

          {/* Share of global sales progress bar */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Global Revenue Share:</span>
              <span className="text-amber-400 font-bold font-mono">
                {activeRegion.revenueSharePct.toFixed(1)}% of total
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isTopOverall ? 'bg-gradient-to-r from-amber-500 to-amber-300' : 'bg-gradient-to-r from-indigo-500 to-indigo-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, activeRegion.revenueSharePct))}%` }}
              />
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Total Units Sold</div>
              <div className="text-slate-100 font-bold font-mono text-sm mt-0.5">
                {activeRegion.totalUnits.toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Orders Processed</div>
              <div className="text-slate-100 font-bold font-mono text-sm mt-0.5">
                {activeRegion.orderCount} orders
              </div>
            </div>
          </div>
        </div>

        {/* Middle & Right: Top Internal Drivers in this Region */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Best Performing Product */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-5 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs text-indigo-400 font-semibold mb-2">
                <div className="flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-indigo-400" />
                  <span>Best-Selling Product in {activeRegion.region}</span>
                </div>
                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded font-mono">
                  #1 Product
                </span>
              </div>

              <div className="text-lg font-bold text-slate-100">
                {activeRegion.topProduct.product || 'Standard Offering'}
              </div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {formatCurrency(activeRegion.topProduct.revenue)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Generated <span className="text-slate-200 font-semibold font-mono">{activeRegion.topProduct.productSharePct.toFixed(1)}%</span> of this region's overall revenue
              </p>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Product Volume:</span>
              <span className="font-mono text-slate-200 font-semibold">
                {activeRegion.topProduct.units.toLocaleString()} units
              </span>
            </div>
          </div>

          {/* Best Performing Sales Channel & Peak Quarter */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-5 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mb-2">
                <div className="flex items-center gap-1.5">
                  <Network className="w-4 h-4 text-emerald-400" />
                  <span>Top Sales Channel in {activeRegion.region}</span>
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded font-mono">
                  #1 Channel
                </span>
              </div>

              <div className="text-lg font-bold text-slate-100">
                {activeRegion.topChannel.channel || 'Direct Sales'}
              </div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {formatCurrency(activeRegion.topChannel.revenue)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Accounts for <span className="text-slate-200 font-semibold font-mono">{activeRegion.topChannel.channelSharePct.toFixed(1)}%</span> of regional revenue
              </p>
            </div>

            {/* Peak Quarter Highlight */}
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Peak Revenue Quarter:</span>
              </div>
              <span className="font-mono text-amber-400 font-bold">
                {activeRegion.bestQuarter.quarter} ({formatCurrency(activeRegion.bestQuarter.revenue)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Leaderboard Quick Strip */}
      <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-slate-300">All Regions Ranked by Overall Sales:</span>
          {allRegionsRanked.map((reg) => (
            <div
              key={reg.region}
              onClick={() => {
                setActiveTabRegion(reg.region);
                onSelectRegion?.(reg.region);
              }}
              className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200 transition-colors"
            >
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold font-mono ${
                reg.rank === 1 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}>
                {reg.rank}
              </span>
              <span className="text-slate-300 font-medium">{reg.region}:</span>
              <span className="font-mono text-slate-100 font-semibold">{formatCurrency(reg.totalRevenue)}</span>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          Global Combined Sales: {formatCurrency(grandTotalRevenue)}
        </div>
      </div>
    </div>
  );
};
