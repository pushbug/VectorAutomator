import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { KeywordSummaryCards } from '@/components/keywords/KeywordSummaryCards';

describe('KeywordSummaryCards Component', () => {
  it('renders all KPI summary metrics with formatted numbers and fallbacks', () => {
    render(
      <KeywordSummaryCards
        totalUniqueKeywords={1420}
        totalTaggedAssets={125}
        topEarningKeyword={{ keyword: 'infographic', earnings: 450.75 }}
        topDownloadedKeyword={{ keyword: 'business', downloads: 890 }}
      />
    );

    expect(screen.getByTestId('keyword-kpi-total-keywords')).toHaveTextContent('1,420');
    expect(screen.getByTestId('keyword-kpi-tagged-assets')).toHaveTextContent('125');
    expect(screen.getByTestId('keyword-kpi-top-earning')).toHaveTextContent('infographic');
    expect(screen.getByTestId('keyword-kpi-top-earning')).toHaveTextContent('$450.75');
    expect(screen.getByTestId('keyword-kpi-top-downloads')).toHaveTextContent('business');
    expect(screen.getByTestId('keyword-kpi-top-downloads')).toHaveTextContent('890');
  });

  it('renders safe fallback when top performers are null', () => {
    render(
      <KeywordSummaryCards
        totalUniqueKeywords={0}
        totalTaggedAssets={0}
        topEarningKeyword={null}
        topDownloadedKeyword={null}
      />
    );

    expect(screen.getByTestId('keyword-kpi-top-earning')).toHaveTextContent('-');
    expect(screen.getByTestId('keyword-kpi-top-downloads')).toHaveTextContent('-');
  });
});
