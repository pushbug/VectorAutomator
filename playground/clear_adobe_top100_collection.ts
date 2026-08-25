import { prisma } from '../src/lib/prisma';
import { createDbBackup } from '../src/lib/dbBackup';

async function main() {
  console.log('=== Step 1: Pre-mutation SQLite Backup ===');
  const preBackup = await createDbBackup();
  console.log('Pre-backup created at:', preBackup);

  const collectionId = 'cmt3921z100006kvbfpphe36n';
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
  });

  if (!collection) {
    throw new Error(`Collection with ID ${collectionId} not found`);
  }

  console.log(`Found collection: "${collection.name}" (ID: ${collection.id})`);

  // Delete all collection items
  const deleted = await prisma.collectionItem.deleteMany({
    where: { collectionId },
  });

  console.log(`Deleted ${deleted.count} CollectionItem join rows from "${collection.name}".`);

  // Reset coverId
  await prisma.collection.update({
    where: { id: collectionId },
    data: { coverId: null },
  });

  console.log('Reset collection coverId to null.');

  console.log('\n=== Step 2: Post-mutation SQLite Backup ===');
  const postBackup = await createDbBackup();
  console.log('Post-backup created at:', postBackup);

  const remainingCount = await prisma.collectionItem.count({
    where: { collectionId },
  });

  console.log(`\n>>> Collection "${collection.name}" now has ${remainingCount} items. Clean! <<<`);
}

main()
  .catch((err) => {
    console.error('Clear collection failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
