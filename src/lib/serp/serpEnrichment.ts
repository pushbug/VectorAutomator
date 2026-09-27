/**
 * SERP Item Enrichment and Dropout Synthesis Engine
 * Provides DRY calculation of downloads/earnings and parallelized adjacent-snapshot dropout synthesis.
 */

export interface SerpItemStats {
  asDownloads: number;
  totalDownloads: number;
  totalEarnings: number;
}

export interface DroppedSerpItem {
  id: string;
  rank: null;
  assetId: string;
  title: string;
  author?: string | null;
  thumbnailUrl?: string | null;
  detailUrl?: string | null;
  keyword: string;
  platform: string;
  pageNumber: number;
  searchedAt: Date | string;
  serpQueryId: string;
  matchedImageId?: string | null;
  imageCode?: string | null;
  imageTitle?: string | null;
  imageFilePath?: string | null;
  previousRank: number;
  rankDelta: null;
  isNew: boolean;
  isDropped: true;
  asDownloads: number;
  totalDownloads: number;
  totalEarnings: number;
}

/**
 * Calculates earnings and download rollups for a SERP item, merging matched image stats and direct unlinked stats.
 */
export function calculateSerpItemStats(
  matchedImage?: {
    stats?: Array<{ downloads: number; earnings: number; platform?: string }>;
    asDownloads?: number;
    totalDownloads?: number;
  } | null,
  directStatsMap?: Map<string, { downloads: number; earnings: number }>,
  assetId?: string | null
): SerpItemStats {
  const statsEarnings = (matchedImage?.stats || []).reduce(
    (sum: number, s: any) => sum + (s.earnings || 0),
    0
  );
  const statsDownloads = (matchedImage?.stats || []).reduce(
    (sum: number, s: any) => sum + (s.downloads || 0),
    0
  );
  let totalEarnings = statsEarnings;
  const asDownloads = matchedImage?.asDownloads ?? 0;
  let totalDownloads = Math.max(
    statsDownloads,
    matchedImage?.totalDownloads ?? 0,
    asDownloads
  );

  if (assetId && directStatsMap && directStatsMap.has(assetId)) {
    const direct = directStatsMap.get(assetId)!;
    totalDownloads = Math.max(totalDownloads, direct.downloads);
    totalEarnings = Math.max(totalEarnings, direct.earnings);
  }

  return { asDownloads, totalDownloads, totalEarnings };
}

/**
 * Synthesizes artworks that dropped out between the two most recent snapshots (T-1 -> T) for target keywords.
 * Executes keyword queries concurrently via Promise.all to eliminate N+1 sequential database round-trips.
 */
export async function synthesizeAdjacentDropouts(
  prismaClient: any,
  targetKeywords: string[],
  directStatsMap?: Map<string, { downloads: number; earnings: number }>
): Promise<DroppedSerpItem[]> {
  if (!targetKeywords || targetKeywords.length === 0) return [];

  const results = await Promise.all(
    targetKeywords.map(async (kw) => {
      const droppedForKw: DroppedSerpItem[] = [];
      try {
        const kwQueries = await prismaClient.serpQuery.findMany({
          where: { keyword: kw },
          orderBy: { searchedAt: 'desc' },
          take: 2,
          include: {
            items: {
              where: { isMine: true },
              include: {
                matchedImage: {
                  include: {
                    stats: {
                      select: { downloads: true, earnings: true, platform: true },
                    },
                  },
                },
              },
            },
          },
        });

        if (
          kwQueries &&
          kwQueries.length >= 2 &&
          Array.isArray(kwQueries[0]?.items) &&
          Array.isArray(kwQueries[1]?.items)
        ) {
          const latestQ = kwQueries[0];
          const prevQ = kwQueries[1];
          const latestAssetIds = new Set(latestQ.items.map((i: any) => i.assetId));

          for (const prevItem of prevQ.items) {
            if (!latestAssetIds.has(prevItem.assetId)) {
              const { asDownloads, totalDownloads, totalEarnings } = calculateSerpItemStats(
                prevItem.matchedImage,
                directStatsMap,
                prevItem.assetId
              );

              droppedForKw.push({
                id: `dropped_${prevItem.assetId}_${latestQ.id}`,
                rank: null,
                assetId: prevItem.assetId,
                title: prevItem.title,
                author: prevItem.author,
                thumbnailUrl: prevItem.thumbnailUrl,
                detailUrl: prevItem.detailUrl,
                keyword: kw,
                platform: latestQ.platform,
                pageNumber: 1,
                searchedAt: latestQ.searchedAt,
                serpQueryId: latestQ.id,
                matchedImageId: prevItem.matchedImageId,
                imageCode: prevItem.matchedImage?.code || null,
                imageTitle: prevItem.matchedImage?.title || prevItem.title,
                imageFilePath: prevItem.matchedImage?.filePath || null,
                previousRank: prevItem.rank,
                rankDelta: null,
                isNew: false,
                isDropped: true,
                asDownloads,
                totalDownloads,
                totalEarnings,
              });
            }
          }
        }
      } catch {
        // Gracefully continue on query failure
      }
      return droppedForKw;
    })
  );

  return results.flat();
}
