import { prisma } from '../src/lib/prisma';
import { createDbBackup } from '../src/lib/dbBackup';
import { parseTsvString, normalizeTitle, computeSimilarity } from '../src/lib/contributorParser';
import fs from 'fs';
import readline from 'readline';

async function extractStep155Tsv(): Promise<string> {
  const transcriptPath = '/Users/baemon/.gemini/antigravity-ide/brain/a2513f6f-1097-4594-b67c-21121857f2d1/.system_generated/logs/transcript_full.jsonl';
  if (!fs.existsSync(transcriptPath)) {
    throw new Error(`Transcript not found at ${transcriptPath}`);
  }

  const fileStream = fs.createReadStream(transcriptPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let content = '';
  for await (const line of rl) {
    if (line.includes('"step_index":155')) {
      const j = JSON.parse(line);
      content = j.content;
      break;
    }
  }

  const match = content.match(/Asset ID[\s\S]*?(<\/USER_REQUEST>|$)/);
  if (!match) {
    throw new Error('TSV table not found in Step 155');
  }

  return match[0].replace('</USER_REQUEST>', '').trim();
}

async function main() {
  console.log('=== Step 1: Pre-mutation SQLite Backup ===');
  const preBackup = await createDbBackup();
  console.log('Pre-backup created at:', preBackup);

  const tsv = await extractStep155Tsv();
  const candidateItems = parseTsvString(tsv);
  console.log(`Extracted ${candidateItems.length} candidate items from Adobe Stock.`);

  const allImages = await prisma.image.findMany({
    select: {
      id: true,
      code: true,
      title: true,
      filePath: true,
      asId: true,
      asDownloads: true,
    },
  });

  const normMap = new Map<string, typeof allImages>();
  for (const img of allImages) {
    if (img.title) {
      const norm = normalizeTitle(img.title);
      if (norm) {
        const list = normMap.get(norm) || [];
        list.push(img);
        normMap.set(norm, list);
      }
    }
  }

  let updatedCount = 0;
  const matchedImageIds: string[] = [];

  for (const item of candidateItems) {
    const normCandidate = normalizeTitle(item.title);
    const exactMatches = normMap.get(normCandidate) || [];

    let targetImage: typeof allImages[0] | null = null;

    if (exactMatches.length >= 1) {
      targetImage = exactMatches[0];
    } else {
      let bestScore = 0;
      for (const img of allImages) {
        const score = computeSimilarity(item.title, img.title);
        if (score > bestScore) {
          bestScore = score;
          targetImage = img;
        }
      }
      if (bestScore < 0.55) {
        targetImage = null;
      }
    }

    if (targetImage) {
      matchedImageIds.push(targetImage.id);

      await prisma.image.update({
        where: { id: targetImage.id },
        data: {
          asId: String(item.asId),
          asDownloads: item.downloads > 0 ? item.downloads : targetImage.asDownloads,
        },
      });

      // Update SERP items if present
      await prisma.serpItem.updateMany({
        where: { assetId: String(item.asId) },
        data: {
          isMine: true,
          matchedImageId: targetImage.id,
        },
      });

      updatedCount++;
    } else {
      console.warn(`Unmatched item: AS ID ${item.asId} - "${item.title}"`);
    }
  }

  console.log(`\nSuccessfully matched & updated ${updatedCount}/${candidateItems.length} images with Adobe Stock IDs.`);

  // Link all images with asId to Collection 'Adobe Top 100'
  const collectionId = 'cmt3921z100006kvbfpphe36n';
  const targetCollection = await prisma.collection.findUnique({
    where: { id: collectionId },
  });

  if (!targetCollection) {
    throw new Error(`Target collection "${collectionId}" not found in database.`);
  }

  console.log(`\nFound target collection: "${targetCollection.name}" (ID: ${targetCollection.id})`);

  // Query all candidate images with populated asId
  const candidateImages = await prisma.image.findMany({
    where: {
      AND: [
        { asId: { not: null } },
        { asId: { not: '' } },
      ],
    },
    select: {
      id: true,
      code: true,
      asId: true,
      title: true,
    },
    orderBy: [
      { asDownloads: 'desc' },
      { year: 'desc' },
      { month: 'desc' },
      { seqNumber: 'desc' },
    ],
  });

  console.log(`Total images in database with asId: ${candidateImages.length}`);

  // Fetch existing items in collection
  const existingItems = await prisma.collectionItem.findMany({
    where: { collectionId },
    select: { imageId: true },
  });
  const existingSet = new Set(existingItems.map((it) => it.imageId));

  const itemsToInsert = candidateImages.filter((img) => !existingSet.has(img.id));
  console.log(`New items to add to collection: ${itemsToInsert.length}`);

  if (itemsToInsert.length > 0) {
    await prisma.collectionItem.createMany({
      data: itemsToInsert.map((img) => ({
        collectionId,
        imageId: img.id,
      })),
    });
    console.log(`Successfully added ${itemsToInsert.length} items to "${targetCollection.name}".`);
  }

  // Set collection cover if not set
  if (!targetCollection.coverId && candidateImages.length > 0) {
    await prisma.collection.update({
      where: { id: collectionId },
      data: { coverId: candidateImages[0].id },
    });
    console.log(`Set coverId to ${candidateImages[0].id} (${candidateImages[0].code})`);
  }

  console.log('\n=== Step 2: Post-mutation SQLite Backup ===');
  const postBackup = await createDbBackup();
  console.log('Post-backup created at:', postBackup);

  const totalInCollection = await prisma.collectionItem.count({
    where: { collectionId },
  });
  console.log(`\n>>> Final count in collection "${targetCollection.name}": ${totalInCollection} items. <<<`);
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
