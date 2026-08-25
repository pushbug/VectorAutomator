import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';
import { createDbBackup } from '../src/lib/dbBackup';

async function main() {
  console.log('=== Step 1: Pre-mutation SQLite Backup ===');
  const preBackup = await createDbBackup();
  console.log('Pre-backup created at:', preBackup);

  const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');

  const targetCodes = ['1609-1', '1710-1', '1810-1'];
  const images = await prisma.image.findMany({
    where: {
      code: { in: targetCodes },
    },
    select: {
      id: true,
      code: true,
      filePath: true,
    },
  });

  console.log(`Found ${images.length} images to standardize to 2-digit padding.`);

  for (const img of images) {
    if (!img.code) continue;
    const parts = img.code.split('-');
    const paddedCode = `${parts[0]}-${parts[1].padStart(2, '0')}`;
    const ext = path.extname(img.filePath) || '.png';
    const oldFilename = `${img.code}${ext}`;
    const newFilename = `${paddedCode}${ext}`;
    const oldDiskPath = path.join(uploadsDir, oldFilename);
    const newDiskPath = path.join(uploadsDir, newFilename);
    const newDbPath = `/uploads/${newFilename}`;

    console.log(`Migrating: ${img.code} -> ${paddedCode} (${oldFilename} -> ${newFilename})`);

    // Rename on disk
    if (fs.existsSync(oldDiskPath)) {
      if (fs.existsSync(newDiskPath)) {
        fs.unlinkSync(newDiskPath);
      }
      fs.renameSync(oldDiskPath, newDiskPath);
    }

    // Update in database
    await prisma.image.update({
      where: { id: img.id },
      data: {
        code: paddedCode,
        filePath: newDbPath,
      },
    });
  }

  console.log('\n=== Step 2: Post-mutation SQLite Backup ===');
  const postBackup = await createDbBackup();
  console.log('Post-backup created at:', postBackup);

  console.log('\nMigration complete! Verification:');
  const updated = await prisma.image.findMany({
    where: {
      code: { in: ['1609-01', '1710-01', '1810-01'] },
    },
    select: { code: true, filePath: true },
  });
  console.log(updated);
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
