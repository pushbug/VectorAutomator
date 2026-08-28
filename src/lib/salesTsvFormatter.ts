export interface ExtractedSalesItem {
  assetId: string;
  assetType?: string;
  uploadDate?: string;
  royalty?: string;
  thumbnailUrl?: string;
}

export interface ExtractedSalesData {
  isInsightsPage: boolean;
  dateStr: string;
  totalItems: number;
  items: ExtractedSalesItem[];
  chartEarnings?: string;
  chartDownloads?: string;
  url?: string;
  error?: string;
}

/**
 * Formats extracted Adobe Stock Contributor sales items into VectorAutomator-compatible TSV clipboard text.
 */
export function formatSalesClipboardTsv(salesData: {
  dateStr: string;
  items: Array<{
    assetId: string;
    assetType?: string;
    uploadDate?: string;
    royalty?: string;
  }>;
}): string {
  const dateHeader = `Date: ${salesData.dateStr || ''}`;
  const tsvHeader = ['Thumb', 'Id', 'Type', 'Upload date', 'Earnings'].join('\t');
  const rows = (salesData.items || []).map((item) => {
    return ['', item.assetId, item.assetType || 'Vectors', item.uploadDate || '', item.royalty || '$0.00'].join('\t');
  });

  return [dateHeader, tsvHeader, ...rows].join('\n');
}
