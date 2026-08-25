export interface ImageSerpPlatformIdentifiers {
  id: string;
  asId?: string | null;
  ssId?: string | null;
  vzId?: string | null;
}

/**
 * Reconciles SerpItem records for a single Image by matching asId, ssId, vzId.
 */
export async function reconcileImageSerp(
  prismaClient: any,
  image: ImageSerpPlatformIdentifiers
): Promise<{ updatedCount: number }> {
  if (!image.id || !prismaClient?.serpItem) return { updatedCount: 0 };

  const platformIds = [image.asId, image.ssId, image.vzId].filter(Boolean) as string[];
  if (platformIds.length === 0) return { updatedCount: 0 };

  try {
    const result = await prismaClient.serpItem.updateMany({
      where: { assetId: { in: platformIds } },
      data: { isMine: true, matchedImageId: image.id },
    });
    return { updatedCount: result?.count || 0 };
  } catch (err) {
    console.warn('reconcileImageSerp error:', err);
    return { updatedCount: 0 };
  }
}

/**
 * Proactively scans and updates all SerpItems where assetId matches any Image platform ID (asId, ssId, vzId),
 * marking isMine = true and populating matchedImageId.
 */
export async function autoReconcileSerpItems(
  prismaClient: any
): Promise<{ reconciledCount: number }> {
  if (!prismaClient) return { reconciledCount: 0 };

  try {
    if (typeof prismaClient.$executeRawUnsafe === 'function') {
      const count = await prismaClient.$executeRawUnsafe(`
        UPDATE SerpItem
        SET isMine = 1,
            matchedImageId = (
              SELECT Image.id FROM Image 
              WHERE Image.asId = SerpItem.assetId 
                 OR Image.ssId = SerpItem.assetId 
                 OR Image.vzId = SerpItem.assetId
              LIMIT 1
            )
        WHERE assetId IN (
          SELECT asId FROM Image WHERE asId IS NOT NULL AND asId != ''
          UNION
          SELECT ssId FROM Image WHERE ssId IS NOT NULL AND ssId != ''
          UNION
          SELECT vzId FROM Image WHERE vzId IS NOT NULL AND vzId != ''
        ) AND (isMine = 0 OR isMine IS NULL OR matchedImageId IS NULL);
      `);
      return { reconciledCount: typeof count === 'number' ? count : 0 };
    }
  } catch (err) {
    console.warn('autoReconcileSerpItems raw SQL warning:', err);
  }

  return { reconciledCount: 0 };
}
