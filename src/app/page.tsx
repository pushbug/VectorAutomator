'use client';

import React, { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { MonthlyGoalCard } from '@/components/dashboard/MonthlyGoalCard';
import { QuickActionHub } from '@/components/dashboard/QuickActionHub';
import { ActivitySplitGrid, DashboardAssetItem } from '@/components/dashboard/ActivitySplitGrid';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface DashboardData {
  summary: {
    totalVectors: number;
    monthlyVectors: number;
    pendingCount: number;
    totalDownloads: number;
    currentMonthEarnings: number;
    currentMonthDownloads: number;
    latestCode: string;
  };
  monthlyGoal: {
    target: number;
    current: number;
    percentage: number;
    daysRemaining: number;
    currentMonthName: string;
  };
  recentUploads: DashboardAssetItem[];
  topPerformers: DashboardAssetItem[];
}

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/dashboard');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Could not load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="flex-1 w-full p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {loading ? (
        <div className="space-y-6 animate-pulse" aria-label="Loading dashboard">
          {/* Header Skeleton */}
          <div className="h-14 bg-surface-hover rounded-xl border border-border/50" />

          {/* KPI Skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-surface-hover rounded-xl border border-border/50" />
            ))}
          </div>

          {/* Goal Skeleton */}
          <div className="h-32 bg-surface-hover rounded-xl border border-border/50" />

          {/* Quick Actions */}
          <div className="h-36 bg-surface-hover rounded-xl border border-border/50" />

          {/* Split Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-surface-hover rounded-xl border border-border/50" />
            <div className="h-64 bg-surface-hover rounded-xl border border-border/50" />
          </div>
        </div>
      ) : error ? (
        <div className="bg-surface border border-destructive/30 rounded-xl p-8 text-center max-w-md mx-auto my-12 space-y-4">
          <div className="inline-flex p-3 rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Failed to Load Dashboard</h2>
          <p className="text-xs text-muted">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : data ? (
        <>
          {/* Top Header */}
          <DashboardHeader
            latestCode={data.summary.latestCode}
            pendingCount={data.summary.pendingCount}
          />

          {/* 4 Bento KPI Cards */}
          <KpiCards
            totalVectors={data.summary.totalVectors}
            monthlyVectors={data.summary.monthlyVectors}
            totalDownloads={data.summary.totalDownloads}
            currentMonthEarnings={data.summary.currentMonthEarnings}
            currentMonthName={data.monthlyGoal.currentMonthName}
          />

          {/* Monthly Production Goal Pace */}
          <MonthlyGoalCard
            target={data.monthlyGoal.target}
            current={data.monthlyGoal.current}
            percentage={data.monthlyGoal.percentage}
            daysRemaining={data.monthlyGoal.daysRemaining}
            monthName={data.monthlyGoal.currentMonthName}
          />

          {/* Quick Launch Hub */}
          <QuickActionHub />

          {/* Activity Split Grid: Recent & Top Performers */}
          <ActivitySplitGrid
            recentUploads={data.recentUploads}
            topPerformers={data.topPerformers}
          />
        </>
      ) : null}
    </div>
  );
}
