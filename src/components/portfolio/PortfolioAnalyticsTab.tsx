'use client';

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Download, 
  DollarSign, 
  Calendar, 
  PlusCircle, 
  Sparkles, 
  ShieldCheck, 
  TrendingDown, 
  Moon, 
  BarChart3,
  Layers,
  HelpCircle,
  Clock,
  Award
} from 'lucide-react';
import { PLATFORMS_DEFAULT, PLATFORM_THEMES } from '@/lib/platforms';
import { formatCurrency, formatNumber, formatDateSafe } from '@/lib/formatters';

export interface SalesStatItem {

  id: string;
  imageId?: string | null;
  platform: string;
  platformAssetId?: string | null;
  downloads: number;
  earnings: number;
  date: string | Date;
}

export interface PortfolioAnalyticsTabProps {
  image: {
    id: string;
    code?: string | null;
    createdAt: string | Date;
    totalDownloads: number;
    totalEarnings?: number;
    stats?: SalesStatItem[];
  };
  onLogSale?: (image: any) => void;
  top100AvgMonthlyEarnings?: number;
  top100AvgMonthlyDownloads?: number;
  portfolioAvgMonthlyEarnings?: number;
  portfolioAvgMonthlyDownloads?: number;
  portfolioAvgEarnings?: number;
}

export function PortfolioAnalyticsTab({
  image,
  onLogSale,
  top100AvgMonthlyEarnings = 0,
  top100AvgMonthlyDownloads = 0,
  portfolioAvgMonthlyEarnings = 0,
  portfolioAvgMonthlyDownloads = 0,
  portfolioAvgEarnings,
}: PortfolioAnalyticsTabProps) {
  const [metric, setMetric] = useState<'earnings' | 'downloads'>('earnings');
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  // Normalization and lifetime summaries
  const stats = useMemo(() => {
    const raw = (image.stats || []) as SalesStatItem[];
    return [...raw].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [image.stats]);

  const totalEarnings = useMemo(() => {
    if (typeof image.totalEarnings === 'number' && image.totalEarnings > 0) {
      return image.totalEarnings;
    }
    return stats.reduce((sum, s) => sum + (s.earnings || 0), 0);
  }, [image.totalEarnings, stats]);

  const totalDownloads = useMemo(() => {
    if (typeof image.totalDownloads === 'number' && image.totalDownloads > 0) {
      return image.totalDownloads;
    }
    return stats.reduce((sum, s) => sum + (s.downloads || 0), 0);
  }, [image.totalDownloads, stats]);

  const rpd = useMemo(() => {
    return totalDownloads > 0 ? totalEarnings / totalDownloads : 0;
  }, [totalEarnings, totalDownloads]);

  // Velocity Health Score & Status Badge Calculation
  const healthStatus = useMemo(() => {
    if (stats.length === 0 || (totalDownloads === 0 && totalEarnings === 0)) {
      return {
        label: 'Untested / New',
        icon: Moon,
        theme: 'bg-muted/15 text-muted border-border',
        description: 'No sales records logged yet. Monitor performance after initial indexing across platforms.',
      };
    }

    const now = Date.now();
    const sixMonthsAgo = now - 180 * 24 * 60 * 60 * 1000;
    const recentEarnings = stats
      .filter((s) => new Date(s.date).getTime() >= sixMonthsAgo)
      .reduce((sum, s) => sum + (s.earnings || 0), 0);

    const uploadTime = new Date(image.createdAt || now).getTime();
    const ageMonths = Math.max(1, (now - uploadTime) / (30 * 24 * 60 * 60 * 1000));

    if (ageMonths <= 6) {
      if (recentEarnings >= 5 || totalDownloads >= 5) {
        return {
          label: 'Rising Star',
          icon: Sparkles,
          theme: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
          description: 'High initial sales velocity in first 6 months',
        };
      }
      return {
        label: 'Early Stage',
        icon: TrendingUp,
        theme: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
        description: 'Gaining initial market visibility',
      };
    }

    const annualizedAvg = (totalEarnings / ageMonths) * 12;
    const recentAnnualized = recentEarnings * 2;
    const velocityRatio = annualizedAvg > 0 ? recentAnnualized / annualizedAvg : 0;

    if (velocityRatio >= 1.2 || recentEarnings > 10) {
      return {
        label: 'Rising Star',
        icon: Sparkles,
        theme: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
        description: 'Recent momentum accelerating above lifetime average',
      };
    }
    if (velocityRatio >= 0.7) {
      return {
        label: 'Evergreen',
        icon: Award,
        theme: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
        description: 'Steady, predictable long-term revenue stream',
      };
    }
    if (totalEarnings >= 3) {
      return {
        label: 'Decaying',
        icon: TrendingDown,
        theme: 'bg-destructive/15 text-destructive border-destructive/30',
        description: 'Sales slowing down compared to historical peak',
      };
    }
    return {
      label: 'Stagnant',
      icon: Clock,
      theme: 'bg-muted/15 text-muted border-border',
      description: 'Historical sales recorded but zero activity in the last 6 months.',
    };
  }, [stats, totalEarnings, totalDownloads, image.createdAt]);

  // First & Last Sale Dates
  const { firstSaleDate, lastSaleDate } = useMemo(() => {
    if (stats.length === 0) return { firstSaleDate: null, lastSaleDate: null };
    const sorted = [...stats].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return {
      firstSaleDate: sorted[0].date,
      lastSaleDate: sorted[sorted.length - 1].date,
    };
  }, [stats]);

  // Monthly Aggregated Time-Series for Trend Chart
  const monthlyData = useMemo(() => {
    if (stats.length === 0) return [];

    const monthMap = new Map<string, { monthKey: string; label: string; earnings: number; downloads: number }>();

    stats.forEach((s) => {
      const d = new Date(s.date);
      if (isNaN(d.getTime())) return;
      const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      const existing = monthMap.get(monthKey) || {
        monthKey,
        label,
        earnings: 0,
        downloads: 0,
      };

      existing.earnings += s.earnings || 0;
      existing.downloads += s.downloads || 0;
      monthMap.set(monthKey, existing);
    });

    const sorted = Array.from(monthMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    if (sorted.length <= 1) return sorted;

    const firstKey = sorted[0].monthKey;
    const lastKey = sorted[sorted.length - 1].monthKey;

    const [startYear, startMonth] = firstKey.split('-').map(Number);
    const [endYear, endMonth] = lastKey.split('-').map(Number);

    const fullMonths: { monthKey: string; label: string; earnings: number; downloads: number }[] = [];
    let curY = startYear;
    let curM = startMonth;

    while (curY < endYear || (curY === endYear && curM <= endMonth)) {
      const key = `${curY}-${String(curM).padStart(2, '0')}`;
      const sampleDate = new Date(Date.UTC(curY, curM - 1, 1));
      const label = sampleDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });

      const match = monthMap.get(key);
      if (match) {
        fullMonths.push(match);
      } else {
        fullMonths.push({
          monthKey: key,
          label,
          earnings: 0,
          downloads: 0,
        });
      }

      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }

    return fullMonths;
  }, [stats]);

  // Average monthly calculations for This Image
  const imageMonthlyAvgEarnings = useMemo(() => {
    return monthlyData.length > 0 ? totalEarnings / monthlyData.length : 0;
  }, [totalEarnings, monthlyData.length]);

  const imageMonthlyAvgDownloads = useMemo(() => {
    return monthlyData.length > 0 ? totalDownloads / monthlyData.length : 0;
  }, [totalDownloads, monthlyData.length]);

  // SVG Chart Dimensions & Geometry
  const chartWidth = 360;
  const chartHeight = 140;
  const padding = { top: 16, right: 14, bottom: 24, left: 34 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  const maxVal = useMemo(() => {
    if (monthlyData.length === 0) return 1;
    const vals = monthlyData.map((d) => (metric === 'earnings' ? d.earnings : d.downloads));
    return Math.max(...vals, metric === 'earnings' ? 1 : 1);
  }, [monthlyData, metric]);

  const chartPoints = useMemo(() => {
    if (monthlyData.length === 0) return [];

    return monthlyData.map((d, index) => {
      const val = metric === 'earnings' ? d.earnings : d.downloads;
      const x = monthlyData.length === 1 
        ? padding.left + plotWidth / 2 
        : padding.left + (index / (monthlyData.length - 1)) * plotWidth;
      const y = padding.top + plotHeight - (val / maxVal) * plotHeight;
      return { x, y, data: d, val };
    });
  }, [monthlyData, metric, maxVal, plotWidth, plotHeight, padding.left, padding.top]);

  const svgPathD = useMemo(() => {
    if (chartPoints.length === 0) return '';
    if (chartPoints.length === 1) {
      return `M ${padding.left} ${chartPoints[0].y} L ${chartWidth - padding.right} ${chartPoints[0].y}`;
    }
    return chartPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
  }, [chartPoints, padding.left, chartWidth, padding.right]);

  const svgAreaD = useMemo(() => {
    if (chartPoints.length === 0) return '';
    const baselineY = padding.top + plotHeight;
    if (chartPoints.length === 1) {
      return `M ${padding.left} ${chartPoints[0].y} L ${chartWidth - padding.right} ${chartPoints[0].y} L ${chartWidth - padding.right} ${baselineY} L ${padding.left} ${baselineY} Z`;
    }
    return `${svgPathD} L ${chartPoints[chartPoints.length - 1].x} ${baselineY} L ${chartPoints[0].x} ${baselineY} Z`;
  }, [chartPoints, svgPathD, padding.top, plotHeight, padding.left, chartWidth, padding.right]);

  const StatusIcon = healthStatus.icon;

  return (
    <div data-testid="portfolio-analytics-tab-panel" className="space-y-5">
      {/* 1. Momentum Health & Lifetime KPI Banner */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              data-testid="portfolio-analytics-status-badge"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${healthStatus.theme}`}
            >
              <StatusIcon size={13} className="shrink-0" />
              <span>{healthStatus.label}</span>
            </span>
          </div>

          {onLogSale && (
            <button
              type="button"
              data-testid="portfolio-analytics-log-sale-btn"
              onClick={() => onLogSale(image)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              <PlusCircle size={13} />
              <span>Log Sale</span>
            </button>
          )}
        </div>

        <p className="text-xs text-muted leading-relaxed">
          {healthStatus.description}
        </p>

        {/* 3-Column Lifetime Metric Strip */}
        <div className="grid grid-cols-3 gap-2 bg-background p-3 rounded-lg border border-border">
          <div>
            <p className="text-[11px] uppercase font-medium text-muted">Revenue</p>
            <p className="text-base font-bold text-foreground font-mono tabular-nums mt-0.5">
              ${totalEarnings.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase font-medium text-muted">Downloads</p>
            <p className="text-base font-bold text-foreground font-mono tabular-nums mt-0.5 flex items-center gap-1">
              <Download size={14} className="text-muted shrink-0" />
              <span>{totalDownloads.toLocaleString()}</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase font-medium text-muted">RPD Avg</p>
            <p className="text-base font-bold text-foreground font-mono tabular-nums mt-0.5">
              ${rpd.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Recency timeline notes */}
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>First sale: <strong className="text-foreground font-medium">{firstSaleDate ? formatDateSafe(firstSaleDate) : 'None'}</strong></span>
          <span>Latest: <strong className="text-foreground font-medium">{lastSaleDate ? formatDateSafe(lastSaleDate) : 'None'}</strong></span>
        </div>
      </div>

      {/* 2. Monthly Trend & Benchmark Comparison */}
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <BarChart3 size={15} className="text-primary" />
            <h4 className="text-xs font-semibold text-muted">Monthly Performance Trend</h4>
          </div>

          {/* Metric Toggle */}
          <div data-testid="portfolio-analytics-metric-toggle" className="flex items-center bg-background border border-border rounded-lg p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setMetric('earnings');
                setActivePointIndex(null);
              }}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                metric === 'earnings'
                  ? 'bg-surface text-foreground shadow-2xs font-semibold'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Revenue ($)
            </button>
            <button
              type="button"
              onClick={() => {
                setMetric('downloads');
                setActivePointIndex(null);
              }}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                metric === 'downloads'
                  ? 'bg-surface text-foreground shadow-2xs font-semibold'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Downloads
            </button>
          </div>
        </div>

        {monthlyData.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-lg bg-background/50 border border-dashed border-border flex flex-col items-center justify-center gap-2">
            <BarChart3 size={24} className="text-muted/60" />
            <p className="text-xs font-semibold text-foreground">No Trend History Available</p>
            <p className="text-[11px] text-muted max-w-xs">
              Log sales transactions or paste statements from Adobe Stock/Shutterstock to generate monthly trend charts.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Interactive SVG Chart (Frameless & Full-Canvas) */}
            <div data-testid="portfolio-analytics-trend-chart" className="relative w-full overflow-hidden pt-1">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-auto overflow-visible select-none"
              >
                <defs>
                  <linearGradient id="analyticsTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                <line
                  x1={padding.left}
                  y1={padding.top}
                  x2={chartWidth - padding.right}
                  y2={padding.top}
                  stroke="var(--color-border)"
                  strokeDasharray="2 2"
                  opacity={0.6}
                />
                <line
                  x1={padding.left}
                  y1={padding.top + plotHeight / 2}
                  x2={chartWidth - padding.right}
                  y2={padding.top + plotHeight / 2}
                  stroke="var(--color-border)"
                  strokeDasharray="2 2"
                  opacity={0.4}
                />
                <line
                  x1={padding.left}
                  y1={padding.top + plotHeight}
                  x2={chartWidth - padding.right}
                  y2={padding.top + plotHeight}
                  stroke="var(--color-border)"
                  opacity={0.8}
                />

                {/* Y-Axis Ticks */}
                <text
                  x={padding.left - 6}
                  y={padding.top + 4}
                  textAnchor="end"
                  className="text-[9px] fill-muted font-mono"
                >
                  {metric === 'earnings' ? `$${maxVal.toFixed(0)}` : maxVal.toFixed(0)}
                </text>
                <text
                  x={padding.left - 6}
                  y={padding.top + plotHeight}
                  textAnchor="end"
                  className="text-[9px] fill-muted font-mono"
                >
                  0
                </text>

                {/* Area and Stroke Line */}
                <path d={svgAreaD} fill="url(#analyticsTrendGradient)" />
                <path
                  d={svgPathD}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Point Circles */}
                {chartPoints.map((pt, idx) => {
                  const isHovered = activePointIndex === idx;
                  return (
                    <g key={pt.data.monthKey}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 5 : 3.5}
                        className={`transition-all cursor-pointer ${
                          isHovered
                            ? 'fill-primary stroke-background stroke-2'
                            : 'fill-background stroke-primary stroke-2 hover:fill-primary'
                        }`}
                        onMouseEnter={() => setActivePointIndex(idx)}
                        onClick={() => setActivePointIndex(idx)}
                      />
                    </g>
                  );
                })}

                {/* X-Axis Month Labels */}
                {(() => {
                  const maxLabels = 4;
                  const labelIndices = new Set<number>();
                  if (chartPoints.length <= maxLabels) {
                    chartPoints.forEach((_, i) => labelIndices.add(i));
                  } else {
                    const step = (chartPoints.length - 1) / (maxLabels - 1);
                    for (let i = 0; i < maxLabels; i++) {
                      labelIndices.add(Math.round(i * step));
                    }
                  }

                  return chartPoints.map((pt, idx) => {
                    if (!labelIndices.has(idx)) return null;

                    const isFirst = idx === 0;
                    const isLast = idx === chartPoints.length - 1;
                    const textAnchor = isFirst ? 'start' : isLast ? 'end' : 'middle';
                    const posX = isFirst ? padding.left : isLast ? chartWidth - padding.right : pt.x;

                    return (
                      <text
                        key={`lbl-${pt.data.monthKey}`}
                        x={posX}
                        y={chartHeight - 4}
                        textAnchor={textAnchor}
                        className="text-[9px] fill-muted font-mono"
                      >
                        {pt.data.label}
                      </text>
                    );
                  });
                })()}
              </svg>
            </div>

            {/* Point Inspector Badge */}
            {activePointIndex !== null && chartPoints[activePointIndex] && (
              <div className="flex items-center justify-between px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-xs font-mono text-foreground animate-in fade-in duration-150">
                <span className="font-semibold text-primary">
                  {chartPoints[activePointIndex].data.label}:
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-bold">${chartPoints[activePointIndex].data.earnings.toFixed(2)}</span>
                  <span className="text-muted/60">|</span>
                  <span className="flex items-center gap-1 font-medium">
                    <Download size={13} className="text-muted shrink-0" />
                    <span>{chartPoints[activePointIndex].data.downloads.toLocaleString()}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Monthly Benchmarks Comparison Strip (Frameless) */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-muted font-medium px-0.5">
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <BarChart3 size={13} className="text-primary" />
                  <span>Monthly Benchmarks Comparison</span>
                </span>
                <span className="text-[10px] text-muted">Per Active Month</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
                {/* This Image */}
                <div className="bg-surface/60 border border-primary/20 rounded-lg p-2 space-y-1">
                  <div className="flex items-center gap-1 text-[10px] text-primary font-sans font-semibold truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span className="truncate">This Image</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 text-xs">
                    <span className="text-muted flex items-center gap-0.5 text-[11px]">
                      <Download size={11} className="shrink-0" />
                      <span>{imageMonthlyAvgDownloads.toFixed(1)}</span>
                    </span>
                    <span className="font-bold text-foreground">
                      ${imageMonthlyAvgEarnings.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Top 100 Benchmark */}
                <div data-testid="portfolio-analytics-benchmark-top100" className="bg-surface/60 border border-amber-500/20 rounded-lg p-2 space-y-1">
                  <div className="flex items-center gap-1 text-[10px] text-amber-500 font-sans font-semibold truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="truncate">Top 100 Avg</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 text-xs">
                    <span className="text-muted flex items-center gap-0.5 text-[11px]">
                      <Download size={11} className="shrink-0" />
                      <span>{(top100AvgMonthlyDownloads || 0).toFixed(1)}</span>
                    </span>
                    <span className="font-bold text-amber-500">
                      ${(top100AvgMonthlyEarnings || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Portfolio Average */}
                <div data-testid="portfolio-analytics-benchmark-portavg" className="bg-surface/60 border border-border rounded-lg p-2 space-y-1">
                  <div className="flex items-center gap-1 text-[10px] text-muted font-sans font-semibold truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted shrink-0" />
                    <span className="truncate">Port Avg</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 text-xs">
                    <span className="text-muted flex items-center gap-0.5 text-[11px]">
                      <Download size={11} className="shrink-0" />
                      <span>{(portfolioAvgMonthlyDownloads || 0).toFixed(1)}</span>
                    </span>
                    <span className="font-bold text-foreground">
                      ${(portfolioAvgMonthlyEarnings || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>


          </div>
        )}
      </div>

      {/* 3. Chronological Sales History Table */}
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Calendar size={15} className="text-muted" />
            <h4 className="text-xs font-semibold text-muted">
              Sales History Log ({stats.length})
            </h4>
          </div>
        </div>

        {stats.length === 0 ? (
          <p className="text-xs text-muted py-3 text-center">
            No individual sales entries recorded yet.
          </p>
        ) : (
          <div 
            data-testid="portfolio-analytics-sales-table"
            className="space-y-1.5 max-h-64 overflow-y-auto pr-1"
          >
            {stats.map((s) => {
              const theme = PLATFORM_THEMES[s.platform] || {
                dot: 'bg-muted',
                text: 'text-foreground',
                bg: 'bg-muted/20',
                border: 'border-border',
              };

              return (
                <div
                  key={s.id || `${s.platform}-${String(s.date)}`}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-background/60 border border-border text-xs font-mono tabular-nums hover:bg-background transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted text-[11px]">
                      {formatDateSafe(s.date)}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold font-sans ${theme.bg} ${theme.text} border ${theme.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${theme.dot} shrink-0`} />
                      {s.platform}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-muted flex items-center gap-0.5">
                      <Download size={12} className="shrink-0" />
                      <span>{s.downloads}</span>
                    </span>
                    <span className="font-bold text-foreground">
                      ${s.earnings.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
