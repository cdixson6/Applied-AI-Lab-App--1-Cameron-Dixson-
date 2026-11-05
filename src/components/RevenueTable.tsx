import React, { useState, useMemo } from 'react';
import { RegionQuarterMatrix, SalesOrderRow, ComprehensiveVarianceAnalysis } from '../types';
import { formatCurrency } from '../utils/analytics';
import { Table, ArrowUpDown, Download, ArrowUpRight, ArrowDownRight, Sparkles, Filter } from 'lucide-react';

interface RevenueTableProps {
  matrixData: RegionQuarterMatrix;
  varianceData: ComprehensiveVarianceAnalysis;
  rawOrders: SalesOrderRow[];
  selectedRegion?: string;
  onSelectRegion?: (region: string) => void;
}

type SortField = 'region' | 'total' | 'deltaDollar' | 'deltaPercent' | string;
type TableTab = 'matrix' | 'drivers' | 'raw_orders';

export const RevenueTable: React.FC<RevenueTableProps> = ({
  matrixData,
  varianceData,
  rawOrders,
  selectedRegion,
  onSelectRegion
}) => {
  const [activeTab, setActiveTab] = useState<TableTab>('matrix');
  const [sortField, setSortField] = useState<SortField>('total');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const { regions, quarters, matrix, quarterTotals, regionTotals, grandTotalRevenue } = matrixData;

  // Handle column sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default descending for numbers
    }
  };

  // Prepare table rows with Q2-Q3 variance calculations
  const tableRows = useMemo(() => {
    const rows = regions.map(region => {
      const q2 = matrix[region]?.['Q2'] || 0;
      const q3 = matrix[region]?.['Q3'] || 0;
      const deltaDollar = q3 - q2;
      const deltaPercent = q2 > 0 ? (deltaDollar / q2) * 100 : 0;
      const total = regionTotals[region] || 0;
      const isLargestDollar = varianceData.mostChangedByDollar?.region === region;
      const isLargestPercent = varianceData.mostChangedByPercent?.region === region;

      return {
        region,
        q2,
        q3,
        deltaDollar,
        deltaPercent,
        total,
        isLargestDollar,
        isLargestPercent,
        quarterValues: quarters.reduce((acc, q) => {
          acc[q] = matrix[region]?.[q] || 0;
          return acc;
        }, {} as Record<string, number>)
      };
    });

    // Filter
    const filtered = rows.filter(r =>
      r.region.toLowerCase().includes(searchFilter.toLowerCase())
    );

    // Sort
    return filtered.sort((a, b) => {
      let valA: any = a.total;
      let valB: any = b.total;

      if (sortField === 'region') {
        valA = a.region;
        valB = b.region;
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (sortField === 'total') {
        valA = a.total;
        valB = b.total;
      } else if (sortField === 'deltaDollar') {
        valA = a.deltaDollar;
        valB = b.deltaDollar;
      } else if (sortField === 'deltaPercent') {
        valA = a.deltaPercent;
        valB = b.deltaPercent;
      } else if (quarters.includes(sortField)) {
        valA = a.quarterValues[sortField] || 0;
        valB = b.quarterValues[sortField] || 0;
      }

      return sortAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [regions, quarters, matrix, regionTotals, varianceData, searchFilter, sortField, sortAsc]);

  // Total Q2 -> Q3 delta across all regions
  const totalQ2 = quarterTotals['Q2'] || 0;
  const totalQ3 = quarterTotals['Q3'] || 0;
  const totalDeltaDollar = totalQ3 - totalQ2;
  const totalDeltaPercent = totalQ2 > 0 ? (totalDeltaDollar / totalQ2) * 100 : 0;

  // Export summary table to CSV
  const handleExportCSV = () => {
    const headers = ['Region', ...quarters, 'Total Revenue', 'Q2 to Q3 Delta ($)', 'Q2 to Q3 Delta (%)'];
    const rows = tableRows.map(r => [
      r.region,
      ...quarters.map(q => r.quarterValues[q] || 0),
      r.total,
      r.deltaDollar,
      `${r.deltaPercent.toFixed(2)}%`
    ]);
    const summaryRow = ['Grand Total', ...quarters.map(q => quarterTotals[q] || 0), grandTotalRevenue, totalDeltaDollar, `${totalDeltaPercent.toFixed(2)}%`];
    const csvContent = [headers.join(','), ...rows.map(row => row.join(',')), summaryRow.join(',')].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'regional_quarterly_revenue_summary.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Table className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-100">
              Total Revenue by Region & Quarter Table
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-tabulated summary with exact dollar variances and percentage shifts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Filter */}
          <div className="relative">
            <input
              type="text"
              placeholder="Filter region..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36 sm:w-44"
            />
          </div>

          {/* Sub-tab view buttons */}
          <div className="inline-flex rounded-lg bg-slate-800/90 p-1 border border-slate-700/60">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'matrix' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Quarter Matrix
            </button>
            <button
              onClick={() => setActiveTab('drivers')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'drivers' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Product & Channel Drivers
            </button>
            <button
              onClick={() => setActiveTab('raw_orders')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'raw_orders' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Raw Orders ({rawOrders.length})
            </button>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            title="Export CSV"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Quarterly Matrix Table */}
      {activeTab === 'matrix' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                <th
                  onClick={() => handleSort('region')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-200 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Region</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                {quarters.map(q => (
                  <th
                    key={q}
                    onClick={() => handleSort(q)}
                    className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-slate-200 select-none"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>{q} Revenue</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                ))}
                <th
                  onClick={() => handleSort('total')}
                  className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-slate-200 select-none"
                >
                  <div className="flex items-center justify-end gap-1.5 text-indigo-400">
                    <span>Total Revenue</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('deltaDollar')}
                  className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-slate-200 select-none"
                >
                  <div className="flex items-center justify-end gap-1.5 text-emerald-400">
                    <span>Q2 → Q3 Delta ($)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('deltaPercent')}
                  className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-slate-200 select-none"
                >
                  <div className="flex items-center justify-end gap-1.5 text-emerald-400">
                    <span>Q2 → Q3 Delta (%)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {tableRows.map(row => {
                const isSelected = selectedRegion === row.region;
                const isPositive = row.deltaDollar >= 0;

                return (
                  <tr
                    key={row.region}
                    onClick={() => onSelectRegion?.(row.region)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-950/40 text-slate-100 ring-1 ring-inset ring-indigo-500/50'
                        : 'hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-sans font-medium text-slate-200 flex items-center gap-2">
                      <span>{row.region}</span>
                      {row.isLargestDollar && (
                        <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 text-[10px] font-sans px-2 py-0.5 rounded border border-amber-500/40">
                          <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                          Largest $ Shift
                        </span>
                      )}
                      {row.isLargestPercent && !row.isLargestDollar && (
                        <span className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 text-[10px] font-sans px-2 py-0.5 rounded border border-purple-500/40">
                          <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                          Largest % Shift
                        </span>
                      )}
                    </td>

                    {quarters.map(q => (
                      <td key={q} className="py-3.5 px-3 text-right text-slate-300">
                        {formatCurrency(row.quarterValues[q] || 0)}
                      </td>
                    ))}

                    <td className="py-3.5 px-4 text-right font-semibold text-slate-100">
                      {formatCurrency(row.total)}
                    </td>

                    <td className={`py-3.5 px-4 text-right font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                      <div className="flex items-center justify-end gap-1">
                        {isPositive ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                        <span>{isPositive ? '+' : '-'}{formatCurrency(Math.abs(row.deltaDollar))}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                          isPositive
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/15 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {isPositive ? '+' : ''}{row.deltaPercent.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Grand Total Footer */}
            <tfoot>
              <tr className="border-t-2 border-slate-700 bg-slate-950/80 font-semibold text-slate-100">
                <td className="py-3.5 px-4 font-sans text-indigo-300">Grand Total</td>
                {quarters.map(q => (
                  <td key={q} className="py-3.5 px-3 text-right font-mono text-slate-200">
                    {formatCurrency(quarterTotals[q] || 0)}
                  </td>
                ))}
                <td className="py-3.5 px-4 text-right font-mono text-indigo-300 text-sm">
                  {formatCurrency(grandTotalRevenue)}
                </td>
                <td className={`py-3.5 px-4 text-right font-mono ${totalDeltaDollar >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {totalDeltaDollar >= 0 ? '+' : '-'}{formatCurrency(Math.abs(totalDeltaDollar))}
                </td>
                <td className="py-3.5 px-4 text-right font-mono">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                      totalDeltaDollar >= 0
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {totalDeltaDollar >= 0 ? '+' : ''}{totalDeltaPercent.toFixed(1)}%
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* TAB 2: Product & Channel Drivers Deep Dive */}
      {activeTab === 'drivers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {varianceData.allRegions.map(reg => (
              <div
                key={reg.region}
                className="bg-slate-950/50 border border-slate-800 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100">{reg.region}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono ${
                        reg.dollarChange >= 0
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {reg.dollarChange >= 0 ? '+' : '-'}{formatCurrency(Math.abs(reg.dollarChange))} ({reg.percentChange >= 0 ? '+' : ''}{reg.percentChange.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Units: {reg.q2Units} → {reg.q3Units} ({reg.unitsChange >= 0 ? '+' : ''}{reg.unitsChange})
                  </div>
                </div>

                {/* Product Breakdown */}
                <div>
                  <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Product Shift (Q2 → Q3)
                  </h5>
                  <div className="space-y-1">
                    {reg.allProductsBreakdown.map(p => (
                      <div key={p.product} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-900/60">
                        <span className="text-slate-300 truncate mr-2">{p.product}</span>
                        <div className="flex items-center gap-2 font-mono shrink-0">
                          <span className="text-slate-400">{formatCurrency(p.q2Revenue)} → {formatCurrency(p.q3Revenue)}</span>
                          <span className={p.dollarChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {p.dollarChange >= 0 ? '+' : '-'}{formatCurrency(Math.abs(p.dollarChange))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Channel Breakdown */}
                <div>
                  <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Channel Performance (Q2 → Q3)
                  </h5>
                  <div className="space-y-1">
                    {reg.allChannelsBreakdown.map(c => (
                      <div key={c.channel} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-900/60">
                        <span className="text-slate-300">{c.channel}</span>
                        <div className="flex items-center gap-2 font-mono shrink-0">
                          <span className="text-slate-400">{formatCurrency(c.q2Revenue)} → {formatCurrency(c.q3Revenue)}</span>
                          <span className={c.dollarChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {c.dollarChange >= 0 ? '+' : '-'}{formatCurrency(Math.abs(c.dollarChange))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Raw Orders Table */}
      {activeTab === 'raw_orders' && (
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Quarter</th>
                <th className="py-2.5 px-3">Region</th>
                <th className="py-2.5 px-3">Channel</th>
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3 text-right">Units</th>
                <th className="py-2.5 px-3 text-right">Discount %</th>
                <th className="py-2.5 px-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-mono text-slate-300">
              {rawOrders.map((order, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30">
                  <td className="py-2 px-3 text-indigo-400 font-sans font-medium">{order.quarter}</td>
                  <td className="py-2 px-3 text-slate-200 font-sans">{order.region}</td>
                  <td className="py-2 px-3 text-slate-400 font-sans">{order.channel}</td>
                  <td className="py-2 px-3 text-slate-300 font-sans">{order.product}</td>
                  <td className="py-2 px-3 text-right">{order.units.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right">{order.discount_pct.toFixed(1)}%</td>
                  <td className="py-2 px-3 text-right text-emerald-400 font-semibold">{formatCurrency(order.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
