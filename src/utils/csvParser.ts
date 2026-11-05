import { SalesOrderRow } from '../types';

export interface ParseResult {
  data: SalesOrderRow[];
  headersFound: string[];
  missingColumns: string[];
  totalRowsProcessed: number;
  validRowCount: number;
  warnings: string[];
}

export function parseCSV(rawText: string): ParseResult {
  const warnings: string[] = [];
  const lines = splitCSVLines(rawText.trim());

  if (lines.length < 2) {
    return {
      data: [],
      headersFound: [],
      missingColumns: ['quarter', 'region', 'channel', 'product', 'units', 'discount_pct', 'revenue'],
      totalRowsProcessed: 0,
      validRowCount: 0,
      warnings: ['File contains less than 2 lines (header + data needed).']
    };
  }

  const rawHeaders = parseCSVRow(lines[0]);
  const headerMap: Record<string, number> = {};

  rawHeaders.forEach((header, index) => {
    const cleanHeader = header.trim().toLowerCase().replace(/[\s_-]+/g, '_');
    headerMap[cleanHeader] = index;
  });

  // Alias lookup
  function findColumnIndex(aliases: string[]): number {
    for (const alias of aliases) {
      if (headerMap[alias] !== undefined) {
        return headerMap[alias];
      }
    }
    // Partial substring matching
    for (const [key, idx] of Object.entries(headerMap)) {
      for (const alias of aliases) {
        if (key.includes(alias)) {
          return idx;
        }
      }
    }
    return -1;
  }

  const quarterIdx = findColumnIndex(['quarter', 'qtr', 'quarter_name', 'period']);
  const regionIdx = findColumnIndex(['region', 'territory', 'market', 'geo', 'geography', 'location']);
  const channelIdx = findColumnIndex(['channel', 'sales_channel', 'distribution_channel', 'route']);
  const productIdx = findColumnIndex(['product', 'product_name', 'item', 'offering', 'sku']);
  const unitsIdx = findColumnIndex(['units', 'qty', 'quantity', 'volume', 'count']);
  const discountIdx = findColumnIndex(['discount_pct', 'discount', 'discount_rate', 'discount_percent', 'discount%']);
  const revenueIdx = findColumnIndex(['revenue', 'sales', 'sales_amount', 'order_revenue', 'total_revenue', 'amount', 'net_sales']);

  const missingColumns: string[] = [];
  if (quarterIdx === -1) missingColumns.push('quarter');
  if (regionIdx === -1) missingColumns.push('region');
  if (channelIdx === -1) missingColumns.push('channel');
  if (productIdx === -1) missingColumns.push('product');
  if (unitsIdx === -1) missingColumns.push('units');
  if (discountIdx === -1) missingColumns.push('discount_pct');
  if (revenueIdx === -1) missingColumns.push('revenue');

  if (missingColumns.length > 0) {
    return {
      data: [],
      headersFound: rawHeaders,
      missingColumns,
      totalRowsProcessed: lines.length - 1,
      validRowCount: 0,
      warnings: [`Missing required columns: ${missingColumns.join(', ')}`]
    };
  }

  const data: SalesOrderRow[] = [];
  let skippedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells = parseCSVRow(line);

    const rawQuarter = cells[quarterIdx]?.trim() || '';
    const rawRegion = cells[regionIdx]?.trim() || '';
    const rawChannel = cells[channelIdx]?.trim() || '';
    const rawProduct = cells[productIdx]?.trim() || '';
    const rawUnits = cells[unitsIdx]?.trim() || '0';
    const rawDiscount = cells[discountIdx]?.trim() || '0';
    const rawRevenue = cells[revenueIdx]?.trim() || '0';

    if (!rawQuarter || !rawRegion || !rawProduct) {
      skippedCount++;
      continue;
    }

    const quarter = normalizeQuarter(rawQuarter);
    const units = parseNumeric(rawUnits);
    let discountPct = parseNumeric(rawDiscount);
    // If discount was entered as 0.15 instead of 15, normalize if < 1 and > 0
    if (discountPct > 0 && discountPct < 1 && !rawDiscount.includes('%')) {
      discountPct = discountPct * 100;
    }
    const revenue = parseNumeric(rawRevenue);

    if (isNaN(revenue)) {
      skippedCount++;
      continue;
    }

    data.push({
      quarter,
      region: rawRegion,
      channel: rawChannel || 'Standard',
      product: rawProduct,
      units: isNaN(units) ? 1 : Math.round(units),
      discount_pct: isNaN(discountPct) ? 0 : discountPct,
      revenue
    });
  }

  if (skippedCount > 0) {
    warnings.push(`Skipped ${skippedCount} invalid or empty row(s).`);
  }

  return {
    data,
    headersFound: rawHeaders,
    missingColumns: [],
    totalRowsProcessed: lines.length - 1,
    validRowCount: data.length,
    warnings
  };
}

function normalizeQuarter(raw: string): string {
  const upper = raw.toUpperCase().trim();
  const match = upper.match(/Q[1-4]/);
  if (match) return match[0];

  if (upper.includes('QUARTER 1') || upper.endsWith('1')) return 'Q1';
  if (upper.includes('QUARTER 2') || upper.endsWith('2')) return 'Q2';
  if (upper.includes('QUARTER 3') || upper.endsWith('3')) return 'Q3';
  if (upper.includes('QUARTER 4') || upper.endsWith('4')) return 'Q4';

  return upper;
}

function parseNumeric(val: string): number {
  if (!val) return 0;
  // Strip currency symbols, commas, percent, whitespace
  const cleaned = val.replace(/[\$,€£%\s]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function splitCSVLines(text: string): string[] {
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentLine += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      lines.push(currentLine);
      currentLine = '';
    } else {
      currentLine += char;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

function parseCSVRow(rowText: string): string[] {
  const cells: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < rowText.length; i++) {
    const char = rowText[i];
    const nextChar = rowText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(currentCell.trim());
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  cells.push(currentCell.trim());
  return cells;
}
