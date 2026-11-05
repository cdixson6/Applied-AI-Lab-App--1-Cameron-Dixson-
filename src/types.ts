export interface SalesOrderRow {
  quarter: string;
  region: string;
  channel: string;
  product: string;
  units: number;
  discount_pct: number;
  revenue: number;
}

export interface RegionQuarterMatrix {
  regions: string[];
  quarters: string[];
  matrix: Record<string, Record<string, number>>; // region -> quarter -> revenue
  unitsMatrix: Record<string, Record<string, number>>; // region -> quarter -> units
  quarterTotals: Record<string, number>;
  regionTotals: Record<string, number>;
  grandTotalRevenue: number;
  grandTotalUnits: number;
}

export interface ProductVariance {
  product: string;
  q2Revenue: number;
  q3Revenue: number;
  dollarChange: number;
  percentChange: number;
}

export interface ChannelVariance {
  channel: string;
  q2Revenue: number;
  q3Revenue: number;
  dollarChange: number;
  percentChange: number;
}

export interface RegionQ2Q3Analysis {
  region: string;
  q2Revenue: number;
  q3Revenue: number;
  dollarChange: number;
  percentChange: number;
  absDollarChange: number;
  absPercentChange: number;
  q2Units: number;
  q3Units: number;
  unitsChange: number;
  q2AvgDiscountPct: number;
  q3AvgDiscountPct: number;
  topProductGrowth?: ProductVariance;
  topProductDecline?: ProductVariance;
  topChannelGrowth?: ChannelVariance;
  topChannelDecline?: ChannelVariance;
  allProductsBreakdown: ProductVariance[];
  allChannelsBreakdown: ChannelVariance[];
}

export interface ComprehensiveVarianceAnalysis {
  allRegions: RegionQ2Q3Analysis[];
  mostChangedByDollar: RegionQ2Q3Analysis | null;
  mostChangedByPercent: RegionQ2Q3Analysis | null;
  hasQ2AndQ3Data: boolean;
}

export interface AiSummaryResponse {
  selectedRegion: string;
  summary: string;
  sentences: string[];
  keyNumbersReferenced: string[];
}

export interface RegionPerformanceSummary {
  region: string;
  totalRevenue: number;
  totalUnits: number;
  revenueSharePct: number;
  rank: number;
  bestQuarter: {
    quarter: string;
    revenue: number;
  };
  topProduct: {
    product: string;
    revenue: number;
    units: number;
    productSharePct: number;
  };
  topChannel: {
    channel: string;
    revenue: number;
    units: number;
    channelSharePct: number;
  };
  avgDiscountPct: number;
  orderCount: number;
}

