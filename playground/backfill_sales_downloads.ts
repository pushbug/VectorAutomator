import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

async function main() {
  const dbPath = path.resolve(process.cwd(), 'dev.db');
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  const prisma = new PrismaClient({ adapter });

  console.log('Finding historical PlatformStats with earnings > 0 and downloads = 0...');
  const statsToUpdate = await prisma.platformStats.findMany({
    where: {
      earnings: { gt: 0 },
      downloads: 0,
    },
  });

  console.log(`Found ${statsToUpdate.length} record(s) to backfill.`);

  if (statsToUpdate.length === 0) {
    console.log('No records need updating. Exiting.');
    await prisma.$disconnect();
    return;
  }

  // Update records
  const updateResult = await prisma.platformStats.updateMany({
    where: {
      earnings: { gt: 0 },
      downloads: 0,
    },
    data: {
      downloads: 1,
    },
  });

  console.log(`Successfully updated ${updateResult.count} PlatformStats records to downloads = 1.`);

  // Recalculate rollups for affected images
  const imageIds = Array.from(
    new Set(statsToUpdate.map((s) => s.imageId).filter((id): id is string => Boolean(id)))
  );

  console.log(`Recalculating rollups for ${imageIds.length} image(s)...`);

  for (const imageId of imageIds) {
    const allStats = await prisma.platformStats.findMany({
      where: { imageId },
    });

    const totalDownloads = allStats.reduce((sum, s) => sum + s.downloads, 0);
    const ssDownloads = allStats
      .filter((s) => s.platform.toLowerCase() === 'shutterstock')
      .reduce((sum, s) => sum + s.downloads, 0);
    const asDownloads = allStats
      .filter((s) => s.platform.toLowerCase().includes('adobe'))
      .reduce((sum, s) => sum + s.downloads, 0);

    await prisma.image.update({
      where: { id: imageId },
      data: {
        totalDownloads,
        ssDownloads,
        asDownloads,
      },
    });
  }

  console.log('Rollups recomputed successfully.');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error running backfill:', err);
  process.exit(1);
});
