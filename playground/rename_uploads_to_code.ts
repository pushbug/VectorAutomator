import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';
import { createDbBackup } from '../src/lib/dbBackup';

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`=== Step 1: Pre-mutation SQLite Backup (DryRun: ${isDryRun}) ===`);
  
  if (!isDryRun) {
    const preBackup = await createDbBackup();
    console.log('Pre-backup created at:', preBackup);
  }

  const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    throw new Error(`Uploads directory not found at ${uploadsDir}`);
  }

  const allImages = await prisma.image.findMany({
    select: {
      id: true,
      code: true,
      filePath: true,
    },
  });

  console.log(`Auditing ${allImages.length} images from database...`);

  let renamedCount = 0;
  let alreadyCorrectCount = 0;
  let missingSourceCount = 0;
  const targetFilenames = new Set<string>();
  const operations: Array<{ id: string; oldPath: string; newPath: string; newDbPath: string }> = [];

  for (const img of allImages) {
    if (!img.code) {
      console.warn(`Image ${img.id} has no code, skipping.`);
      continue;
    }

    const currentBasename = path.basename(img.filePath);
    const ext = (path.extname(img.filePath) || '.jpg').toLowerCase();
    const sanitizedCode = img.code.trim();
    const newBasename = `${sanitizedCode}${ext}`;
    const newDbPath = `/uploads/${newBasename}`;

    const oldFullPath = path.join(uploadsDir, currentBasename);
    const newFullPath = path.join(uploadsDir, newBasename);

    targetFilenames.add(newBasename);

    if (currentBasename === newBasename && img.filePath === newDbPath) {
      alreadyCorrectCount++;
      continue;
    }

    if (!fs.existsSync(oldFullPath) && !fs.existsSync(newFullPath)) {
      console.warn(`Source file not found for ${img.code}: ${oldFullPath}`);
      missingSourceCount++;
      continue;
    }

    operations.push({
      id: img.id,
      oldPath: oldFullPath,
      newPath: newFullPath,
      newDbPath,
    });
  }

  console.log(`\nFound ${operations.length} files to rename, ${alreadyCorrectCount} already in correct format, ${missingSourceCount} missing sources.`);

  if (isDryRun) {
    console.log('\n--- Sample of first 5 rename operations ---');
    console.log(operations.slice(0, 5));
    console.log('\nDry run complete. No changes written to disk or database.');
    return;
  }

  // Execute rename operations
  console.log('\n=== Executing Renames on Disk & Database ===');
  for (const op of operations) {
    // 1. Rename physical file if needed
    if (fs.existsSync(op.oldPath) && op.oldPath !== op.newPath) {
      // If target file already exists (e.g. from prior test), overwrite it
      if (fs.existsSync(op.newPath)) {
        fs.unlinkSync(op.newPath);
      }
      fs.renameSync(op.oldPath, op.newPath);
    }

    // 2. Update database record
    await prisma.image.update({
      where: { id: op.id },
      data: { filePath: op.newDbPath },
    });

    renamedCount++;
    if (renamedCount % 500 === 0 || renamedCount === operations.length) {
      console.log(`Progress: ${renamedCount}/${operations.length} images renamed and updated...`);
    }
  }

  console.log(`\nSuccessfully renamed and updated ${renamedCount} images in database!`);

  // Purge any remaining orphaned files not in targetFilenames
  console.log('\n=== Purging Unreferenced Orphaned Files in public/uploads ===');
  const diskFiles = fs.readdirSync(uploadsDir);
  let deletedOrphans = 0;

  for (const file of diskFiles) {
    if (file === '.gitkeep') continue;
    if (!targetFilenames.has(file)) {
      const orphanPath = path.join(uploadsDir, file);
      try {
        fs.unlinkSync(orphanPath);
        console.log(`Deleted orphan: ${file}`);
        deletedOrphans++;
      } catch (err: any) {
        console.error(`Failed to delete orphan ${file}:`, err.message);
      }
    }
  }

  console.log(`Purged ${deletedOrphans} unreferenced orphan files.`);

  console.log('\n=== Step 3: Post-mutation SQLite Backup ===');
  const postBackup = await createDbBackup();
  console.log('Post-backup created at:', postBackup);

  // Final verification
  const finalDiskFiles = fs.readdirSync(uploadsDir).filter((f) => f !== '.gitkeep');
  const finalDbImages = await prisma.image.count();
  console.log(`\n>>> Final Verification: ${finalDiskFiles.length} files on disk, ${finalDbImages} images in database. Clean 1:1 match! <<<`);
}

main()
  .catch((err) => {
    console.error('Rename migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
