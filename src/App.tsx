import React, { useState, useMemo } from 'react';
import { SalesOrderRow } from './types';
import { parseCSV } from './utils/csvParser';
import { SAMPLE_SALES_CSV } from './utils/sampleData';
import { calculateMatrix, analyzeQ2ToQ3Variance, calculateRegionalPerformance, formatCurrency } from './utils/analytics';
import { CsvUploader } from './components/CsvUploader';
import { RevenueChart } from './components/RevenueChart';
import { RevenueTable } from './components/RevenueTable';
import { AiSummaryCard } from './components/AiSummaryCard';
import { BestPerformerSpotlight } from './components/BestPerformerSpotlight';
import { DollarSign, Layers, TrendingUp, BarChart2, CheckCircle, Trophy, Crown } from 'lucide-react';

export default function App() {
  // Initialize with sample sales data so user sees working charts and AI summary immediately
  const [orders, setOrders] = useState<SalesOrderRow[]>(() => {
    const parsed = parseCSV(SAMPLE_SALES_CSV);
    return parsed.data;
  });

  const [activeFilename, setActiveFilename] = useState<string>('Sample Global Sales Orders (Q1-Q4)');
  const [selectedRegionName, setSelectedRegionName] = useState<string | undefined>(undefined);

  // Pre-calculate Matrix, Variance, and Regional Performance
  const matrixData = useMemo(() => calculateMatrix(orders), [orders]);
  const varianceData = useMemo(() => analyzeQ2ToQ3Variance(orders), [orders]);
  const performanceData = useMemo(() => calculateRegionalPerformance(orders), [orders]);

  const handleDataLoaded = (newOrders: SalesOrderRow[], filename?: string) => {
    setOrders(newOrders);
    setActiveFilename(filename || 'Uploaded Dataset');
    setSelectedRegionName(undefined); // reset selection to default to most changed
  };

  // Topline KPIs
  const totalRev = matrixData.grandTotalRevenue;
  const totalUnits = matrixData.grandTotalUnits;
  const regionCount = matrixData.regions.length;

  const q2Rev = matrixData.quarterTotals['Q2'] || 0;
  const q3Rev = matrixData.quarterTotals['Q3'] || 0;
  const q2q3Delta = q3Rev - q2Rev;
  const q2q3DeltaPct = q2Rev > 0 ? (q2q3Delta / q2Rev) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  SalesPulse Analytics
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  Regional Variance Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Quarterly sales order aggregation & verified Gemini 3.8 Flash variance synthesis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Orders Active:</span>
              <span className="font-mono text-slate-200 font-semibold">{orders.length}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Metric Summary Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Total Revenue</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-100">
              {formatCurrency(totalRev)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Across all recorded quarters</div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-amber-950/30 border border-amber-500/30 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-amber-400 mb-1">
              <span className="font-semibold">Top Performer Region</span>
              <Crown className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-100 truncate">
              {performanceData.topPerformer?.region || 'N/A'}
            </div>
            <div className="text-[11px] text-amber-300 font-mono mt-1 flex items-center justify-between">
              <span>{formatCurrency(performanceData.topPerformer?.totalRevenue || 0)}</span>
              <span className="bg-amber-500/20 px-1.5 py-0.2 rounded text-[10px]">
                {performanceData.topPerformer?.revenueSharePct.toFixed(1)}% share
              </span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Q2 → Q3 Variance Leader</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-100 truncate">
              {varianceData.mostChangedByDollar?.region || 'N/A'}
            </div>
            <div className="text-[11px] text-emerald-400 font-mono mt-1">
              {varianceData.mostChangedByDollar ? (
                <>
                  {varianceData.mostChangedByDollar.dollarChange >= 0 ? '+' : '-'}
                  {formatCurrency(Math.abs(varianceData.mostChangedByDollar.dollarChange))} (
                  {varianceData.mostChangedByDollar.percentChange >= 0 ? '+' : ''}
                  {varianceData.mostChangedByDollar.percentChange.toFixed(1)}%)
                </>
              ) : 'No Q2/Q3 data'}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Total Units Sold</span>
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-100">
              {totalUnits.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Across {regionCount} distinct regions</div>
          </div>
        </div>

        {/* 1. CSV Upload and Dataset Management */}
        <CsvUploader
          onDataLoaded={handleDataLoaded}
          currentFilename={activeFilename}
          rowCount={orders.length}
        />

        {/* 2. Top Regional Performer Spotlight Spot */}
        <BestPerformerSpotlight
          performanceData={performanceData}
          selectedRegionName={selectedRegionName}
          onSelectRegion={(reg) => setSelectedRegionName(reg)}
        />

        {/* 3. Three-Sentence AI Summary Component */}
        <AiSummaryCard
          varianceData={varianceData}
          selectedRegionName={selectedRegionName}
          onSelectRegion={(reg) => setSelectedRegionName(reg)}
        />

        {/* 3. Interactive Revenue Chart */}
        <RevenueChart
          matrixData={matrixData}
          highlightedRegion={selectedRegionName || varianceData.mostChangedByDollar?.region}
          onSelectRegion={(reg) => setSelectedRegionName(reg)}
        />

        {/* 4. Cross-tab Summary Matrix and Drivers Table */}
        <RevenueTable
          matrixData={matrixData}
          varianceData={varianceData}
          rawOrders={orders}
          selectedRegion={selectedRegionName || varianceData.mostChangedByDollar?.region}
          onSelectRegion={(reg) => setSelectedRegionName(reg)}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 mt-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Sales Order Regional Analytics • Columns: <span className="text-slate-400 font-mono">quarter, region, channel, product, units, discount_pct, revenue</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI Summaries verified against calculated numbers</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
