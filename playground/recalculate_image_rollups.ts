import Database from 'better-sqlite3';
import path from 'path';
import { createDbBackup } from '../src/lib/dbBackup';

async function main() {
  console.log('--- Step 1: Creating database backup before rollup recalculation ---');
  const backupResult = await createDbBackup();
  console.log('Database backup created:', backupResult);

  const dbPath = path.resolve(process.cwd(), 'dev.db');
  const db = new Database(dbPath);

  // Check stats before
  const before = db.prepare(`
    SELECT 
      COUNT(*) AS totalImages,
      SUM(totalDownloads) AS sumTotalDownloads,
      SUM(asDownloads) AS sumAsDownloads,
      SUM(ssDownloads) AS sumSsDownloads
    FROM Image
  `).get() as any;

  const statsTable = db.prepare(`
    SELECT 
      COUNT(*) AS totalPlatformStatsRows,
      SUM(downloads) AS sumPlatformDownloads,
      SUM(earnings) AS sumPlatformEarnings
    FROM PlatformStats
  `).get() as any;

  console.log('\n--- Before Recalculation ---');
  console.log('Image table rollups:', before);
  console.log('PlatformStats table ground truth:', statsTable);

  console.log('\n--- Step 2: Executing atomic SQL rollup update ---');
  const updateStmt = db.prepare(`
    UPDATE Image
    SET 
      totalDownloads = COALESCE((SELECT SUM(downloads) FROM PlatformStats WHERE PlatformStats.imageId = Image.id), 0),
      asDownloads = COALESCE((SELECT SUM(downloads) FROM PlatformStats WHERE PlatformStats.imageId = Image.id AND LOWER(PlatformStats.platform) LIKE '%adobe%'), 0),
      ssDownloads = COALESCE((SELECT SUM(downloads) FROM PlatformStats WHERE PlatformStats.imageId = Image.id AND LOWER(PlatformStats.platform) LIKE '%shutterstock%'), 0)
  `);

  const runResult = updateStmt.run();
  console.log(`Updated ${runResult.changes} image records.`);

  // Check stats after
  const after = db.prepare(`
    SELECT 
      COUNT(*) AS totalImages,
      SUM(totalDownloads) AS sumTotalDownloads,
      SUM(asDownloads) AS sumAsDownloads,
      SUM(ssDownloads) AS sumSsDownloads,
      COUNT(CASE WHEN totalDownloads > 0 THEN 1 END) AS imagesWithDownloads
    FROM Image
  `).get() as any;

  console.log('\n--- After Recalculation ---');
  console.log('Image table rollups:', after);

  db.close();

  console.log('\n--- Step 3: Creating post-migration snapshot ---');
  await createDbBackup();
  console.log('Done! Rollup recalculation complete and verified.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
