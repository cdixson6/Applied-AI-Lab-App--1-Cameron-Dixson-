import {
  SalesOrderRow,
  RegionQuarterMatrix,
  RegionQ2Q3Analysis,
  ComprehensiveVarianceAnalysis,
  ProductVariance,
  ChannelVariance,
  RegionPerformanceSummary
} from '../types';

export function calculateMatrix(data: SalesOrderRow[]): RegionQuarterMatrix {
  const regionsSet = new Set<string>();
  const quartersSet = new Set<string>();
  const matrix: Record<string, Record<string, number>> = {};
  const unitsMatrix: Record<string, Record<string, number>> = {};

  data.forEach(row => {
    regionsSet.add(row.region);
    quartersSet.add(row.quarter);

    if (!matrix[row.region]) {
      matrix[row.region] = {};
      unitsMatrix[row.region] = {};
    }

    matrix[row.region][row.quarter] = (matrix[row.region][row.quarter] || 0) + row.revenue;
    unitsMatrix[row.region][row.quarter] = (unitsMatrix[row.region][row.quarter] || 0) + row.units;
  });

  // Sort quarters in standard chronological order if matching Q1-Q4
  const quarters = Array.from(quartersSet).sort((a, b) => {
    const qOrder = ['Q1', 'Q2', 'Q3', 'Q4'];
    const idxA = qOrder.indexOf(a);
    const idxB = qOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    return a.localeCompare(b);
  });

  const regions = Array.from(regionsSet).sort();

  const quarterTotals: Record<string, number> = {};
  quarters.forEach(q => {
    quarterTotals[q] = regions.reduce((sum, r) => sum + (matrix[r]?.[q] || 0), 0);
  });

  const regionTotals: Record<string, number> = {};
  let grandTotalRevenue = 0;
  let grandTotalUnits = 0;

  regions.forEach(r => {
    let rSum = 0;
    quarters.forEach(q => {
      const rev = matrix[r]?.[q] || 0;
      const u = unitsMatrix[r]?.[q] || 0;
      rSum += rev;
      grandTotalRevenue += rev;
      grandTotalUnits += u;
    });
    regionTotals[r] = rSum;
  });

  return {
    regions,
    quarters,
    matrix,
    unitsMatrix,
    quarterTotals,
    regionTotals,
    grandTotalRevenue,
    grandTotalUnits
  };
}

export function analyzeQ2ToQ3Variance(data: SalesOrderRow[]): ComprehensiveVarianceAnalysis {
  const matrixData = calculateMatrix(data);
  const { regions, matrix, unitsMatrix } = matrixData;

  const hasQ2 = matrixData.quarters.includes('Q2');
  const hasQ3 = matrixData.quarters.includes('Q3');

  if (!hasQ2 || !hasQ3) {
    return {
      allRegions: [],
      mostChangedByDollar: null,
      mostChangedByPercent: null,
      hasQ2AndQ3Data: false
    };
  }

  const regionAnalyses: RegionQ2Q3Analysis[] = regions.map(region => {
    const q2Revenue = matrix[region]?.['Q2'] || 0;
    const q3Revenue = matrix[region]?.['Q3'] || 0;
    const dollarChange = q3Revenue - q2Revenue;
    const percentChange = q2Revenue > 0 ? ((q3Revenue - q2Revenue) / q2Revenue) * 100 : 0;
    const absDollarChange = Math.abs(dollarChange);
    const absPercentChange = Math.abs(percentChange);

    const q2Units = unitsMatrix[region]?.['Q2'] || 0;
    const q3Units = unitsMatrix[region]?.['Q3'] || 0;
    const unitsChange = q3Units - q2Units;

    // Filter rows for this region in Q2 and Q3
    const q2Rows = data.filter(r => r.region === region && r.quarter === 'Q2');
    const q3Rows = data.filter(r => r.region === region && r.quarter === 'Q3');

    // Calculate average discount weighted by revenue or simple average
    const q2DiscountSum = q2Rows.reduce((sum, r) => sum + r.discount_pct, 0);
    const q2AvgDiscountPct = q2Rows.length > 0 ? q2DiscountSum / q2Rows.length : 0;

    const q3DiscountSum = q3Rows.reduce((sum, r) => sum + r.discount_pct, 0);
    const q3AvgDiscountPct = q3Rows.length > 0 ? q3DiscountSum / q3Rows.length : 0;

    // Product breakdown
    const productQ2Map: Record<string, number> = {};
    const productQ3Map: Record<string, number> = {};
    const allProductsSet = new Set<string>();

    q2Rows.forEach(r => {
      productQ2Map[r.product] = (productQ2Map[r.product] || 0) + r.revenue;
      allProductsSet.add(r.product);
    });
    q3Rows.forEach(r => {
      productQ3Map[r.product] = (productQ3Map[r.product] || 0) + r.revenue;
      allProductsSet.add(r.product);
    });

    const allProductsBreakdown: ProductVariance[] = Array.from(allProductsSet).map(product => {
      const pQ2 = productQ2Map[product] || 0;
      const pQ3 = productQ3Map[product] || 0;
      const dChange = pQ3 - pQ2;
      const pChange = pQ2 > 0 ? (dChange / pQ2) * 100 : (pQ3 > 0 ? 100 : 0);
      return {
        product,
        q2Revenue: pQ2,
        q3Revenue: pQ3,
        dollarChange: dChange,
        percentChange: pChange
      };
    }).sort((a, b) => b.dollarChange - a.dollarChange);

    // Channel breakdown
    const channelQ2Map: Record<string, number> = {};
    const channelQ3Map: Record<string, number> = {};
    const allChannelsSet = new Set<string>();

    q2Rows.forEach(r => {
      channelQ2Map[r.channel] = (channelQ2Map[r.channel] || 0) + r.revenue;
      allChannelsSet.add(r.channel);
    });
    q3Rows.forEach(r => {
      channelQ3Map[r.channel] = (channelQ3Map[r.channel] || 0) + r.revenue;
      allChannelsSet.add(r.channel);
    });

    const allChannelsBreakdown: ChannelVariance[] = Array.from(allChannelsSet).map(channel => {
      const cQ2 = channelQ2Map[channel] || 0;
      const cQ3 = channelQ3Map[channel] || 0;
      const dChange = cQ3 - cQ2;
      const pChange = cQ2 > 0 ? (dChange / cQ2) * 100 : (cQ3 > 0 ? 100 : 0);
      return {
        channel,
        q2Revenue: cQ2,
        q3Revenue: cQ3,
        dollarChange: dChange,
        percentChange: pChange
      };
    }).sort((a, b) => b.dollarChange - a.dollarChange);

    const topProductGrowth = allProductsBreakdown[0];
    const topProductDecline = allProductsBreakdown[allProductsBreakdown.length - 1];

    const topChannelGrowth = allChannelsBreakdown[0];
    const topChannelDecline = allChannelsBreakdown[allChannelsBreakdown.length - 1];

    return {
      region,
      q2Revenue,
      q3Revenue,
      dollarChange,
      percentChange,
      absDollarChange,
      absPercentChange,
      q2Units,
      q3Units,
      unitsChange,
      q2AvgDiscountPct,
      q3AvgDiscountPct,
      topProductGrowth,
      topProductDecline,
      topChannelGrowth,
      topChannelDecline,
      allProductsBreakdown,
      allChannelsBreakdown
    };
  });

  // Sort by dollar change absolute magnitude
  const sortedByDollar = [...regionAnalyses].sort((a, b) => b.absDollarChange - a.absDollarChange);
  // Sort by percentage change absolute magnitude
  const sortedByPercent = [...regionAnalyses].sort((a, b) => b.absPercentChange - a.absPercentChange);

  return {
    allRegions: regionAnalyses,
    mostChangedByDollar: sortedByDollar[0] || null,
    mostChangedByPercent: sortedByPercent[0] || null,
    hasQ2AndQ3Data: true
  };
}

export function formatCurrency(num: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(num);
}

export function formatCompactCurrency(num: number): string {
  if (Math.abs(num) >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(num) >= 1_000) {
    return `$${(num / 1_000).toFixed(1)}k`;
  }
  return `$${num.toLocaleString()}`;
}

export function generateDeterministicThreeSentences(analysis: RegionQ2Q3Analysis, criterion: 'dollar' | 'percent'): {
  summary: string;
  sentences: string[];
  keyNumbersReferenced: string[];
} {
  const dir = analysis.dollarChange >= 0 ? 'increased' : 'decreased';
  const sign = analysis.dollarChange >= 0 ? '+' : '-';
  const dollarStr = `${sign}${formatCurrency(Math.abs(analysis.dollarChange))}`;
  const pctStr = `${analysis.percentChange >= 0 ? '+' : ''}${analysis.percentChange.toFixed(1)}%`;
  const q2Str = formatCurrency(analysis.q2Revenue);
  const q3Str = formatCurrency(analysis.q3Revenue);

  // Sentence 1: Identification & Topline
  const s1 = `${analysis.region} experienced the greatest ${criterion === 'dollar' ? 'absolute dollar' : 'percentage'} change from Q2 to Q3, with total revenue moving from ${q2Str} to ${q3Str}, representing a net change of ${dollarStr} (${pctStr}).`;

  // Sentence 2: Primary Product Driver
  let s2 = '';
  if (analysis.topProductGrowth && analysis.dollarChange >= 0) {
    const prodSign = analysis.topProductGrowth.dollarChange >= 0 ? '+' : '-';
    s2 = `This shift was primarily driven by ${analysis.topProductGrowth.product}, which ${analysis.topProductGrowth.dollarChange >= 0 ? 'surged' : 'declined'} by ${prodSign}${formatCurrency(Math.abs(analysis.topProductGrowth.dollarChange))} (${analysis.topProductGrowth.percentChange >= 0 ? '+' : ''}${analysis.topProductGrowth.percentChange.toFixed(1)}%), rising from ${formatCurrency(analysis.topProductGrowth.q2Revenue)} in Q2 to ${formatCurrency(analysis.topProductGrowth.q3Revenue)} in Q3.`;
  } else if (analysis.topProductDecline && analysis.dollarChange < 0) {
    s2 = `This downturn was primarily driven by contraction in ${analysis.topProductDecline.product}, which decreased by ${formatCurrency(Math.abs(analysis.topProductDecline.dollarChange))} (${analysis.topProductDecline.percentChange.toFixed(1)}%), shifting from ${formatCurrency(analysis.topProductDecline.q2Revenue)} down to ${formatCurrency(analysis.topProductDecline.q3Revenue)}.`;
  } else {
    s2 = `The regional change was led by performance variations across the catalog, accompanied by total order volume changing by ${analysis.unitsChange >= 0 ? '+' : ''}${analysis.unitsChange.toLocaleString()} units.`;
  }

  // Sentence 3: Secondary Driver / Channel / Volume / Discount
  let s3 = '';
  if (analysis.topChannelGrowth && analysis.topChannelGrowth.channel) {
    const chanSign = analysis.topChannelGrowth.dollarChange >= 0 ? '+' : '-';
    s3 = `In addition, ${analysis.topChannelGrowth.channel} channel revenue shifted by ${chanSign}${formatCurrency(Math.abs(analysis.topChannelGrowth.dollarChange))} alongside total regional volume moving from ${analysis.q2Units.toLocaleString()} to ${analysis.q3Units.toLocaleString()} units with average discount rates shifting from ${analysis.q2AvgDiscountPct.toFixed(1)}% to ${analysis.q3AvgDiscountPct.toFixed(1)}%.`;
  } else {
    s3 = `Overall regional unit volume moved from ${analysis.q2Units.toLocaleString()} to ${analysis.q3Units.toLocaleString()} units while average order discount rates changed from ${analysis.q2AvgDiscountPct.toFixed(1)}% in Q2 to ${analysis.q3AvgDiscountPct.toFixed(1)}% in Q3.`;
  }

  return {
    summary: `${s1} ${s2} ${s3}`,
    sentences: [s1, s2, s3],
    keyNumbersReferenced: [
      q2Str,
      q3Str,
      dollarStr,
      pctStr,
      `${analysis.q2Units} units`,
      `${analysis.q3Units} units`,
      `${analysis.q2AvgDiscountPct.toFixed(1)}% discount`,
      `${analysis.q3AvgDiscountPct.toFixed(1)}% discount`
    ]
  };
}

export function calculateRegionalPerformance(data: SalesOrderRow[]): {
  allRegionsRanked: RegionPerformanceSummary[];
  topPerformer: RegionPerformanceSummary | null;
  grandTotalRevenue: number;
} {
  const regionRowsMap: Record<string, SalesOrderRow[]> = {};
  let grandTotalRevenue = 0;

  data.forEach(row => {
    grandTotalRevenue += row.revenue;
    if (!regionRowsMap[row.region]) {
      regionRowsMap[row.region] = [];
    }
    regionRowsMap[row.region].push(row);
  });

  const summaries: RegionPerformanceSummary[] = Object.entries(regionRowsMap).map(([region, rows]) => {
    let totalRevenue = 0;
    let totalUnits = 0;
    let discountSum = 0;

    const quarterMap: Record<string, number> = {};
    const productMap: Record<string, { revenue: number; units: number }> = {};
    const channelMap: Record<string, { revenue: number; units: number }> = {};

    rows.forEach(r => {
      totalRevenue += r.revenue;
      totalUnits += r.units;
      discountSum += r.discount_pct;

      quarterMap[r.quarter] = (quarterMap[r.quarter] || 0) + r.revenue;

      if (!productMap[r.product]) {
        productMap[r.product] = { revenue: 0, units: 0 };
      }
      productMap[r.product].revenue += r.revenue;
      productMap[r.product].units += r.units;

      if (!channelMap[r.channel]) {
        channelMap[r.channel] = { revenue: 0, units: 0 };
      }
      channelMap[r.channel].revenue += r.revenue;
      channelMap[r.channel].units += r.units;
    });

    let bestQuarterName = '';
    let bestQuarterRev = -1;
    Object.entries(quarterMap).forEach(([q, rev]) => {
      if (rev > bestQuarterRev) {
        bestQuarterRev = rev;
        bestQuarterName = q;
      }
    });

    let topProdName = '';
    let topProdRev = -1;
    let topProdUnits = 0;
    Object.entries(productMap).forEach(([prod, stat]) => {
      if (stat.revenue > topProdRev) {
        topProdRev = stat.revenue;
        topProdName = prod;
        topProdUnits = stat.units;
      }
    });

    let topChanName = '';
    let topChanRev = -1;
    let topChanUnits = 0;
    Object.entries(channelMap).forEach(([chan, stat]) => {
      if (stat.revenue > topChanRev) {
        topChanRev = stat.revenue;
        topChanName = chan;
        topChanUnits = stat.units;
      }
    });

    const revenueSharePct = grandTotalRevenue > 0 ? (totalRevenue / grandTotalRevenue) * 100 : 0;
    const avgDiscountPct = rows.length > 0 ? discountSum / rows.length : 0;

    return {
      region,
      totalRevenue,
      totalUnits,
      revenueSharePct,
      rank: 1,
      bestQuarter: {
        quarter: bestQuarterName,
        revenue: bestQuarterRev > 0 ? bestQuarterRev : 0
      },
      topProduct: {
        product: topProdName,
        revenue: topProdRev > 0 ? topProdRev : 0,
        units: topProdUnits,
        productSharePct: totalRevenue > 0 ? (topProdRev / totalRevenue) * 100 : 0
      },
      topChannel: {
        channel: topChanName,
        revenue: topChanRev > 0 ? topChanRev : 0,
        units: topChanUnits,
        channelSharePct: totalRevenue > 0 ? (topChanRev / totalRevenue) * 100 : 0
      },
      avgDiscountPct,
      orderCount: rows.length
    };
  });

  summaries.sort((a, b) => b.totalRevenue - a.totalRevenue);
  summaries.forEach((s, idx) => {
    s.rank = idx + 1;
  });

  return {
    allRegionsRanked: summaries,
    topPerformer: summaries[0] || null,
    grandTotalRevenue
  };
}

