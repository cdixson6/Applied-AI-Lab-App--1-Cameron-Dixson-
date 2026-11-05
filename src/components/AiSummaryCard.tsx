import React, { useState, useEffect } from 'react';
import {
  RegionQ2Q3Analysis,
  ComprehensiveVarianceAnalysis,
  AiSummaryResponse
} from '../types';
import {
  formatCurrency,
  generateDeterministicThreeSentences
} from '../utils/analytics';
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Volume2,
  VolumeX,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';

interface AiSummaryCardProps {
  varianceData: ComprehensiveVarianceAnalysis;
  selectedRegionName?: string;
  onSelectRegion?: (region: string) => void;
}

export const AiSummaryCard: React.FC<AiSummaryCardProps> = ({
  varianceData,
  selectedRegionName,
  onSelectRegion
}) => {
  const [criterion, setCriterion] = useState<'dollar' | 'percent'>('dollar');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [showFactsheet, setShowFactsheet] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'paragraph' | 'breakdown'>('paragraph');

  const [aiResult, setAiResult] = useState<AiSummaryResponse | null>(null);
  const [isQuotaFallback, setIsQuotaFallback] = useState<boolean>(false);
  const clientCacheRef = React.useRef<Map<string, { result: AiSummaryResponse; isFallback: boolean }>>(new Map());

  // Determine active region based on user selection or criterion
  const activeRegionAnalysis: RegionQ2Q3Analysis | null = React.useMemo(() => {
    if (!varianceData.hasQ2AndQ3Data || varianceData.allRegions.length === 0) {
      return null;
    }

    if (selectedRegionName) {
      const found = varianceData.allRegions.find(r => r.region === selectedRegionName);
      if (found) return found;
    }

    return criterion === 'dollar'
      ? varianceData.mostChangedByDollar
      : varianceData.mostChangedByPercent;
  }, [varianceData, selectedRegionName, criterion]);

  // Request the AI summary from the backend
  const fetchSummary = async (analysis: RegionQ2Q3Analysis, crit: 'dollar' | 'percent', forceRefresh = false) => {
    const cacheKey = `${analysis.region}::${crit}::${analysis.dollarChange}::${analysis.q2Revenue}::${analysis.q3Revenue}`;

    if (!forceRefresh && clientCacheRef.current.has(cacheKey)) {
      const cached = clientCacheRef.current.get(cacheKey)!;
      setAiResult(cached.result);
      setIsQuotaFallback(cached.isFallback);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      selectedRegion: analysis.region,
      changeType: crit === 'dollar' ? 'absolute_dollar' : 'percentage',
      metrics: analysis,
      allRegionsRanked: varianceData.allRegions.map(r => ({
        region: r.region,
        q2Revenue: r.q2Revenue,
        q3Revenue: r.q3Revenue,
        dollarChange: r.dollarChange,
        percentChange: r.percentChange
      }))
    };

    try {
      const response = await fetch('/api/summarize-variance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const resJson = await response.json();
      if (resJson.success && resJson.data) {
        const formattedResult = {
          selectedRegion: resJson.data.selectedRegion || analysis.region,
          summary: resJson.data.summary,
          sentences: resJson.data.sentences || [resJson.data.summary],
          keyNumbersReferenced: resJson.data.keyNumbersReferenced || []
        };
        const fallback = Boolean(resJson.quotaExceeded || resJson.fallbackUsed);
        clientCacheRef.current.set(cacheKey, { result: formattedResult, isFallback: fallback });
        setAiResult(formattedResult);
        setIsQuotaFallback(fallback);
      } else {
        throw new Error(resJson.error || 'Failed to parse AI response');
      }
    } catch (err: any) {
      console.warn('[Sales Analytics] Backend AI unavailable, falling back to verified calculations:', err?.message || err);
      // Fallback guaranteed strictly 3-sentence calculated facts
      const fallback = generateDeterministicThreeSentences(analysis, crit);
      const fallbackResult = {
        selectedRegion: analysis.region,
        summary: fallback.summary,
        sentences: fallback.sentences,
        keyNumbersReferenced: fallback.keyNumbersReferenced
      };
      clientCacheRef.current.set(cacheKey, { result: fallbackResult, isFallback: true });
      setAiResult(fallbackResult);
      setIsQuotaFallback(true);
    } finally {
      setLoading(false);
    }
  };

  // Trigger when active region or criterion changes
  useEffect(() => {
    if (activeRegionAnalysis) {
      fetchSummary(activeRegionAnalysis, criterion);
    }
  }, [activeRegionAnalysis?.region, criterion]);

  const handleCopy = () => {
    if (!aiResult) return;
    navigator.clipboard.writeText(aiResult.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (!window.speechSynthesis || !aiResult) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(aiResult.summary);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel(); // clear queue
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  if (!varianceData.hasQ2AndQ3Data) {
    return (
      <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-5 text-amber-300 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <div>
          <h4 className="font-semibold text-sm">Q2 or Q3 Data Missing</h4>
          <p className="text-xs text-amber-400/80">
            Both Q2 and Q3 order records are required to calculate the regional change and generate the three-sentence AI summary.
          </p>
        </div>
      </div>
    );
  }

  const sentenceCount = aiResult?.sentences?.length || 0;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-900/50 rounded-xl p-5 shadow-2xl relative overflow-hidden">
      {/* Decorative subtle ambient glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-indigo-950/80 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-100">
                AI Executive Variance Summary (Q2 → Q3)
              </h3>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                isQuotaFallback
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {isQuotaFallback ? 'Verified Mathematical Analysis' : '3 Sentences • Grounded in Calculations'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isQuotaFallback
                ? 'Synthesized strictly from exact calculated figures (Free-tier AI quota reached; attach billing key in Settings > Secrets for unlimited live AI)'
                : 'Generated by Gemini 3.8 Flash using strictly calculated numbers from your uploaded orders'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Criterion Toggle */}
          <div className="inline-flex rounded-lg bg-slate-950/80 p-0.5 border border-slate-800 text-xs">
            <button
              onClick={() => {
                setCriterion('dollar');
                if (varianceData.mostChangedByDollar) {
                  onSelectRegion?.(varianceData.mostChangedByDollar.region);
                }
              }}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                criterion === 'dollar'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Greatest $ Delta
            </button>
            <button
              onClick={() => {
                setCriterion('percent');
                if (varianceData.mostChangedByPercent) {
                  onSelectRegion?.(varianceData.mostChangedByPercent.region);
                }
              }}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                criterion === 'percent'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Greatest % Delta
            </button>
          </div>

          {/* Regenerate Button */}
          <button
            onClick={() => activeRegionAnalysis && fetchSummary(activeRegionAnalysis, criterion, true)}
            disabled={loading}
            title="Regenerate Summary"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {/* Text-to-Speech Audio */}
          <button
            onClick={handleSpeak}
            disabled={!aiResult || loading}
            title={isSpeaking ? 'Stop Audio' : 'Listen to Briefing'}
            className={`p-1.5 rounded-lg border transition-colors ${
              isSpeaking
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            disabled={!aiResult || loading}
            title="Copy Summary"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Target Region Selector Strip */}
      <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-slate-800/60 text-xs">
        <span className="text-slate-400 font-medium">Select Region to Summarize:</span>
        {varianceData.allRegions.map(reg => {
          const isSelected = activeRegionAnalysis?.region === reg.region;
          const isDominant =
            criterion === 'dollar'
              ? varianceData.mostChangedByDollar?.region === reg.region
              : varianceData.mostChangedByPercent?.region === reg.region;

          return (
            <button
              key={reg.region}
              onClick={() => onSelectRegion?.(reg.region)}
              className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-indigo-500 text-white shadow-sm ring-1 ring-indigo-400'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
              }`}
            >
              <span>{reg.region}</span>
              <span className={`text-[10px] ${reg.dollarChange >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {reg.dollarChange >= 0 ? '+' : '-'}{formatCurrency(Math.abs(reg.dollarChange))}
              </span>
              {isDominant && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Greatest Shift" />
              )}
            </button>
          );
        })}
      </div>

      {/* Summary Content Body */}
      <div className="relative z-10">
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
            <p className="text-xs text-slate-400 font-mono">
              Synthesizing three-sentence summary from calculated facts...
            </p>
          </div>
        ) : aiResult ? (
          <div className="space-y-4">
            {/* View Mode Pill */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">View Mode:</span>
                <button
                  onClick={() => setViewMode('paragraph')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                    viewMode === 'paragraph' ? 'bg-indigo-950 text-indigo-300 border border-indigo-700' : 'text-slate-400'
                  }`}
                >
                  Full Paragraph
                </button>
                <button
                  onClick={() => setViewMode('breakdown')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                    viewMode === 'breakdown' ? 'bg-indigo-950 text-indigo-300 border border-indigo-700' : 'text-slate-400'
                  }`}
                >
                  Sentence Breakdown (1, 2, 3)
                </button>
              </div>

              <div className="text-[11px] text-slate-400 font-mono">
                Sentence Count: <span className="text-emerald-400 font-bold">{sentenceCount} / 3</span>
              </div>
            </div>

            {/* Paragraph Mode */}
            {viewMode === 'paragraph' ? (
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-100 text-sm leading-relaxed font-sans shadow-inner">
                <p>{aiResult.summary}</p>
              </div>
            ) : (
              /* Breakdown Mode */
              <div className="space-y-2.5">
                {aiResult.sentences.map((sentence, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 flex items-start gap-3"
                  >
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 mb-0.5">
                        {idx === 0
                          ? 'Sentence 1: Region Identification & Net Revenue Variance'
                          : idx === 1
                          ? 'Sentence 2: Primary Product Driver & Underlying Cause'
                          : 'Sentence 3: Channel Contribution & Volume / Discount Context'}
                      </div>
                      <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">{sentence}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Expandable Calculated Facts Section */}
            <div className="pt-2 border-t border-slate-800/60">
              <button
                onClick={() => setShowFactsheet(!showFactsheet)}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>
                  {showFactsheet ? 'Hide Calculated Facts Fed to AI' : 'Inspect Exact Calculated Numbers Provided to AI'}
                </span>
                {showFactsheet ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showFactsheet && activeRegionAnalysis && (
                <div className="mt-3 p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-3 font-mono">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400">Target Region</div>
                      <div className="text-slate-100 font-semibold">{activeRegionAnalysis.region}</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400">Q2 Revenue</div>
                      <div className="text-slate-100 font-semibold">{formatCurrency(activeRegionAnalysis.q2Revenue)}</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400">Q3 Revenue</div>
                      <div className="text-slate-100 font-semibold">{formatCurrency(activeRegionAnalysis.q3Revenue)}</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400">Net Delta ($ / %)</div>
                      <div className={activeRegionAnalysis.dollarChange >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                        {activeRegionAnalysis.dollarChange >= 0 ? '+' : '-'}{formatCurrency(Math.abs(activeRegionAnalysis.dollarChange))} ({activeRegionAnalysis.percentChange >= 0 ? '+' : ''}{activeRegionAnalysis.percentChange.toFixed(1)}%)
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400">Top Product Driver</div>
                      <div className="text-slate-100">
                        {activeRegionAnalysis.topProductGrowth?.product}: {formatCurrency(activeRegionAnalysis.topProductGrowth?.q2Revenue || 0)} → {formatCurrency(activeRegionAnalysis.topProductGrowth?.q3Revenue || 0)} ({activeRegionAnalysis.topProductGrowth?.dollarChange && activeRegionAnalysis.topProductGrowth.dollarChange >= 0 ? '+' : ''}{formatCurrency(activeRegionAnalysis.topProductGrowth?.dollarChange || 0)})
                      </div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400">Top Channel Driver</div>
                      <div className="text-slate-100">
                        {activeRegionAnalysis.topChannelGrowth?.channel}: {formatCurrency(activeRegionAnalysis.topChannelGrowth?.q2Revenue || 0)} → {formatCurrency(activeRegionAnalysis.topChannelGrowth?.q3Revenue || 0)} ({activeRegionAnalysis.topChannelGrowth?.dollarChange && activeRegionAnalysis.topChannelGrowth.dollarChange >= 0 ? '+' : ''}{formatCurrency(activeRegionAnalysis.topChannelGrowth?.dollarChange || 0)})
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                    <span>Units: {activeRegionAnalysis.q2Units} → {activeRegionAnalysis.q3Units} ({activeRegionAnalysis.unitsChange >= 0 ? '+' : ''}{activeRegionAnalysis.unitsChange})</span>
                    <span>Avg Discount: {activeRegionAnalysis.q2AvgDiscountPct.toFixed(1)}% → {activeRegionAnalysis.q3AvgDiscountPct.toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
