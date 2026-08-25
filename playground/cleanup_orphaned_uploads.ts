import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';

async function main() {
  const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.log('Uploads directory does not exist.');
    return;
  }

  const allImages = await prisma.image.findMany({
    select: { filePath: true },
  });

  const validFilenames = new Set<string>();
  for (const img of allImages) {
    if (img.filePath) {
      validFilenames.add(path.basename(img.filePath));
    }
  }

  console.log(`Found ${validFilenames.size} active image files referenced in database.`);

  const allDiskFiles = fs.readdirSync(uploadsDir);
  console.log(`Found ${allDiskFiles.length} files in public/uploads.`);

  let deletedCount = 0;
  for (const file of allDiskFiles) {
    if (file === '.gitkeep') continue;

    if (!validFilenames.has(file)) {
      const fullPath = path.join(uploadsDir, file);
      fs.unlinkSync(fullPath);
      console.log(`Deleted orphan file: ${file}`);
      deletedCount++;
    }
  }

  console.log(`\nCleanup complete! Deleted ${deletedCount} unreferenced orphan files.`);
}

main()
  .catch((err) => {
    console.error('Cleanup failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
