import { PrismaClient } from '@/generated/prisma/client';

export interface ImagePlatformIdentifiers {
  id: string;
  asId?: string | null;
  ssId?: string | null;
  vzId?: string | null;
}

/**
 * Reconciles unlinked PlatformStats (where imageId is null) with a given image
 * when platform asset IDs (asId, ssId, vzId) match.
 *
 * Implements collision-safe merging: if the target image already has a sales record
 * for the same (platform, date), earnings and downloads are accumulated into the
 * existing record and the unlinked record is cleaned up.
 */
export async function reconcileImageSales(
  prismaClient: any,
  image: ImagePlatformIdentifiers
): Promise<{ reconciledCount: number }> {
  if (!image.id || !prismaClient?.platformStats) return { reconciledCount: 0 };


  const platformPairs: { platform: string; assetId: string }[] = [];
  if (image.asId) platformPairs.push({ platform: 'Adobe Stock', assetId: image.asId });
  if (image.ssId) platformPairs.push({ platform: 'Shutterstock', assetId: image.ssId });
  if (image.vzId) platformPairs.push({ platform: 'Vecteezy', assetId: image.vzId });

  if (platformPairs.length === 0) {
    return { reconciledCount: 0 };
  }

  let reconciledCount = 0;

  for (const pair of platformPairs) {
    const unlinkedStats = await prismaClient.platformStats.findMany({
      where: {
        imageId: null,
        platform: pair.platform,
        platformAssetId: pair.assetId,
      },
    });

    for (const stat of unlinkedStats) {
      // Check if target image already has a record for the exact same date & platform
      const existing = await prismaClient.platformStats.findFirst({
        where: {
          imageId: image.id,
          platform: pair.platform,
          date: stat.date,
        },
      });

      if (existing) {
        // Collision safe: accumulate metrics into existing record and remove unlinked duplicate
        await prismaClient.platformStats.update({
          where: { id: existing.id },
          data: {
            earnings: existing.earnings + stat.earnings,
            downloads: existing.downloads + stat.downloads,
          },
        });

        await prismaClient.platformStats.delete({
          where: { id: stat.id },
        });
      } else {
        // Link directly
        await prismaClient.platformStats.update({
          where: { id: stat.id },
          data: {
            imageId: image.id,
          },
        });
      }

      reconciledCount++;
    }
  }

  if (reconciledCount > 0) {
    // Recalculate rollups on parent Image
    const allStats = await prismaClient.platformStats.findMany({
      where: { imageId: image.id },
    });

    const totalDownloads = allStats.reduce((sum: number, s: any) => sum + (s.downloads || 0), 0);
    const ssDownloads = allStats
      .filter((s: any) => s.platform.toLowerCase() === 'shutterstock')
      .reduce((sum: number, s: any) => sum + (s.downloads || 0), 0);
    const asDownloads = allStats
      .filter((s: any) => s.platform.toLowerCase().includes('adobe'))
      .reduce((sum: number, s: any) => sum + (s.downloads || 0), 0);

    await prismaClient.image.update({
      where: { id: image.id },
      data: {
        totalDownloads,
        ssDownloads,
        asDownloads,
      },
    });
  }

  return { reconciledCount };
}
