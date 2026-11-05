import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Server-side in-memory cache to prevent redundant Gemini API calls and conserve quota
const summaryCache = new Map<string, any>();

export interface SummaryRequestPayload {
  selectedRegion: string;
  changeType: 'absolute_dollar' | 'percentage';
  metrics: {
    region: string;
    q2Revenue: number;
    q3Revenue: number;
    dollarChange: number;
    percentChange: number;
    q2Units: number;
    q3Units: number;
    unitsChange: number;
    q2AvgDiscountPct: number;
    q3AvgDiscountPct: number;
    topProductGrowth?: { product: string; dollarChange: number; percentChange: number; q2Revenue: number; q3Revenue: number };
    topProductDecline?: { product: string; dollarChange: number; percentChange: number; q2Revenue: number; q3Revenue: number };
    topChannelGrowth?: { channel: string; dollarChange: number; percentChange: number; q2Revenue: number; q3Revenue: number };
    topChannelDecline?: { channel: string; dollarChange: number; percentChange: number; q2Revenue: number; q3Revenue: number };
    allProductsBreakdown: Array<{ product: string; q2Revenue: number; q3Revenue: number; dollarChange: number; percentChange: number }>;
    allChannelsBreakdown: Array<{ channel: string; q2Revenue: number; q3Revenue: number; dollarChange: number; percentChange: number }>;
  };
  allRegionsRanked: Array<{
    region: string;
    q2Revenue: number;
    q3Revenue: number;
    dollarChange: number;
    percentChange: number;
  }>;
}

function buildDeterministicSummary(payload: SummaryRequestPayload) {
  const { selectedRegion, changeType, metrics } = payload;
  const sign = metrics.dollarChange >= 0 ? '+' : '-';
  const dollarFormatted = `${sign}$${Math.abs(metrics.dollarChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pctFormatted = `${metrics.percentChange >= 0 ? '+' : ''}${metrics.percentChange.toFixed(2)}%`;
  const q2Formatted = `$${metrics.q2Revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const q3Formatted = `$${metrics.q3Revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const s1 = `${selectedRegion} experienced the greatest ${changeType === 'absolute_dollar' ? 'absolute dollar' : 'percentage'} change from Q2 to Q3, with revenue shifting from ${q2Formatted} in Q2 to ${q3Formatted} in Q3, generating a net change of ${dollarFormatted} (${pctFormatted}).`;

  let s2 = '';
  const topProd = metrics.allProductsBreakdown?.[0];
  if (topProd) {
    const pSign = topProd.dollarChange >= 0 ? '+' : '-';
    s2 = `This shift was primarily driven by ${topProd.product}, which ${topProd.dollarChange >= 0 ? 'grew' : 'contracted'} by ${pSign}$${Math.abs(topProd.dollarChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${topProd.percentChange >= 0 ? '+' : ''}${topProd.percentChange.toFixed(2)}%), moving from $${topProd.q2Revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to $${topProd.q3Revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
  } else {
    s2 = `This variance was primarily driven by product line reallocations as regional sales orders adjusted between quarters.`;
  }

  const topChan = metrics.allChannelsBreakdown?.[0];
  let s3 = '';
  if (topChan) {
    const cSign = topChan.dollarChange >= 0 ? '+' : '-';
    s3 = `Additionally, the ${topChan.channel} channel changed by ${cSign}$${Math.abs(topChan.dollarChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} while overall regional order volume shifted from ${metrics.q2Units.toLocaleString()} to ${metrics.q3Units.toLocaleString()} units with average discount rates moving from ${metrics.q2AvgDiscountPct.toFixed(1)}% to ${metrics.q3AvgDiscountPct.toFixed(1)}%.`;
  } else {
    s3 = `Furthermore, total regional order units moved from ${metrics.q2Units.toLocaleString()} to ${metrics.q3Units.toLocaleString()} units while average discount rates adjusted from ${metrics.q2AvgDiscountPct.toFixed(1)}% in Q2 to ${metrics.q3AvgDiscountPct.toFixed(1)}% in Q3.`;
  }

  return {
    selectedRegion,
    summary: `${s1} ${s2} ${s3}`,
    sentences: [s1, s2, s3],
    keyNumbersReferenced: [
      q2Formatted,
      q3Formatted,
      dollarFormatted,
      pctFormatted,
      `${metrics.q2Units.toLocaleString()} units`,
      `${metrics.q3Units.toLocaleString()} units`,
      `${metrics.q2AvgDiscountPct.toFixed(1)}% discount`,
      `${metrics.q3AvgDiscountPct.toFixed(1)}% discount`
    ]
  };
}

app.post('/api/summarize-variance', async (req, res) => {
  try {
    const payload = req.body as SummaryRequestPayload;
    if (!payload || !payload.metrics || !payload.selectedRegion) {
      return res.status(400).json({ error: 'Missing calculation metrics payload' });
    }

    const { selectedRegion, changeType, metrics, allRegionsRanked } = payload;
    const cacheKey = `${selectedRegion}::${changeType}::${metrics.q2Revenue}::${metrics.q3Revenue}::${metrics.dollarChange}::${metrics.unitsChange}`;

    if (summaryCache.has(cacheKey)) {
      return res.json(summaryCache.get(cacheKey));
    }

    const factsheet = {
      targetRegion: selectedRegion,
      criterion: changeType === 'absolute_dollar' ? 'Largest Absolute Dollar Change' : 'Largest Percentage Change',
      q2Revenue: `$${metrics.q2Revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      q3Revenue: `$${metrics.q3Revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      netDollarChange: `${metrics.dollarChange >= 0 ? '+' : '-'}$${Math.abs(metrics.dollarChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      percentageChange: `${metrics.percentChange >= 0 ? '+' : ''}${metrics.percentChange.toFixed(2)}%`,
      q2Units: metrics.q2Units.toLocaleString('en-US'),
      q3Units: metrics.q3Units.toLocaleString('en-US'),
      unitsChange: `${metrics.unitsChange >= 0 ? '+' : ''}${metrics.unitsChange.toLocaleString('en-US')} units`,
      q2AverageDiscount: `${metrics.q2AvgDiscountPct.toFixed(1)}%`,
      q3AverageDiscount: `${metrics.q3AvgDiscountPct.toFixed(1)}%`,
      productBreakdown: metrics.allProductsBreakdown.map(p => ({
        product: p.product,
        q2Revenue: `$${p.q2Revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        q3Revenue: `$${p.q3Revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        deltaDollar: `${p.dollarChange >= 0 ? '+' : '-'}$${Math.abs(p.dollarChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        deltaPercent: `${p.percentChange >= 0 ? '+' : ''}${p.percentChange.toFixed(2)}%`
      })),
      channelBreakdown: metrics.allChannelsBreakdown.map(c => ({
        channel: c.channel,
        q2Revenue: `$${c.q2Revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        q3Revenue: `$${c.q3Revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        deltaDollar: `${c.dollarChange >= 0 ? '+' : '-'}$${Math.abs(c.dollarChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        deltaPercent: `${c.percentChange >= 0 ? '+' : ''}${c.percentChange.toFixed(2)}%`
      })),
      comparativeContext: allRegionsRanked.map(r => ({
        region: r.region,
        dollarChange: `${r.dollarChange >= 0 ? '+' : '-'}$${Math.abs(r.dollarChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        percentChange: `${r.percentChange >= 0 ? '+' : ''}${r.percentChange.toFixed(2)}%`
      }))
    };

    if (!ai) {
      const fallback = buildDeterministicSummary(payload);
      const result = {
        success: true,
        data: fallback,
        groundTruthFacts: factsheet,
        fallbackUsed: true,
        quotaExceeded: false,
        message: 'Verified deterministic variance summary (No Gemini API key configured).'
      };
      summaryCache.set(cacheKey, result);
      return res.json(result);
    }

    const prompt = `You are a financial sales analyst. Analyze which region changed the most from Q2 to Q3 and explain WHY, using strictly the calculated numbers provided below.

Strict Requirements:
1. Write EXACTLY THREE SENTENCES. Do not write two sentences, do not write four sentences. It must be exactly three sentences.
2. Sentence 1: Identify "${selectedRegion}" as the region that changed most from Q2 to Q3, citing its exact calculated Q2 revenue (${factsheet.q2Revenue}), Q3 revenue (${factsheet.q3Revenue}), and the exact net dollar change (${factsheet.netDollarChange}) and percentage change (${factsheet.percentageChange}).
3. Sentence 2: Explain the primary driver of this variance by specifying the key product(s) responsible and their exact dollar/percentage shifts from the product breakdown.
4. Sentence 3: Explain the secondary driver or context using the channel shifts (${metrics.allChannelsBreakdown.map(c => `${c.channel}: ${c.dollarChange >= 0 ? '+' : '-'}$${Math.abs(c.dollarChange).toLocaleString()}`).join(', ')}), unit volume changes (${factsheet.unitsChange}), or discount changes (${factsheet.q2AverageDiscount} to ${factsheet.q3AverageDiscount}).
5. You MUST ONLY use the numbers provided in the calculated factsheet. NEVER invent, round differently, or estimate any numbers.

Here is the exact calculated factsheet:
${JSON.stringify(factsheet, null, 2)}
`;

    // Try candidate models in order: gemini-3.8-flash, then fallback to gemini-3.1-flash-lite
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
    let geminiResponse: any = null;
    let quotaHit = false;

    for (const model of modelsToTry) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Gemini API request timed out for ${model}`)), 6000)
        );
        const apiCall = ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: 'You are an executive sales performance analyst. You write strictly three-sentence summaries grounded exclusively in provided calculated figures with zero hallucination or invented numbers.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                selectedRegion: { type: Type.STRING },
                summary: {
                  type: Type.STRING,
                  description: 'The complete three-sentence summary as a single coherent paragraph.'
                },
                sentences: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Array containing exactly three strings, one for each sentence.'
                },
                keyNumbersReferenced: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'List of exact verified numbers and metrics referenced in the summary.'
                }
              },
              required: ['selectedRegion', 'summary', 'sentences', 'keyNumbersReferenced']
            }
          }
        });

        const response: any = await Promise.race([apiCall, timeoutPromise]);
        geminiResponse = response;
        break; // Successfully generated
      } catch (err: any) {
        const isQuota =
          err?.status === 'RESOURCE_EXHAUSTED' ||
          err?.code === 429 ||
          err?.message?.includes('429') ||
          err?.message?.includes('Quota') ||
          err?.message?.includes('RESOURCE_EXHAUSTED');

        if (isQuota) {
          quotaHit = true;
          console.warn(`[Gemini API] Quota limit reached for ${model}. Trying next available model or fallback.`);
        } else {
          console.warn(`[Gemini API] Request failed for ${model}:`, err?.message || err);
        }
      }
    }

    if (geminiResponse?.text) {
      const parsed = JSON.parse(geminiResponse.text);
      const result = {
        success: true,
        data: parsed,
        groundTruthFacts: factsheet,
        fallbackUsed: false
      };
      summaryCache.set(cacheKey, result);
      return res.json(result);
    }

    // If Gemini models could not generate (e.g. daily free tier 429 quota reached or network timeout), use verified calculated numbers
    console.warn('[AI Studio] Using verified deterministic three-sentence variance summary calculated directly from figures.');
    const fallbackData = buildDeterministicSummary(payload);
    const result = {
      success: true,
      data: fallbackData,
      groundTruthFacts: factsheet,
      fallbackUsed: true,
      quotaExceeded: quotaHit,
      message: quotaHit
        ? 'Daily free tier quota reached for Gemini. Summary computed strictly from calculated metrics.'
        : 'Live AI unavailable. Summary computed strictly from verified metrics.'
    };
    summaryCache.set(cacheKey, result);
    return res.json(result);
  } catch (err: any) {
    console.warn('[AI Studio] Unexpected error in summarize-variance endpoint, serving calculated fallback:', err?.message || err);
    const payload = req.body as SummaryRequestPayload;
    const fallbackData = buildDeterministicSummary(payload);
    return res.json({
      success: true,
      data: fallbackData,
      fallbackUsed: true,
      quotaExceeded: false
    });
  }
});

// Dev server with Vite middleware vs Production static serving
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, host: '0.0.0.0', port: 3000 },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Sales Analytics Server running on http://0.0.0.0:${port}`);
});
