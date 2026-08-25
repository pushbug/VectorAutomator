import { prisma } from '../src/lib/prisma';
import { createDbBackup } from '../src/lib/dbBackup';

const TARGET_ASSET_IDS = [
  '569029521',
  '636376104',
  '638902325',
  '610992545',
  '1056563551',
  '621579842',
  '175524050',
  '533567919',
  '635505344',
  '506395673',
  '606828761',
  '615651530',
  '625576017',
  '618175059',
  '657704542',
  '225217403',
  '577254017',
  '122059355',
  '801908005',
  '469551720',
  '1073131856',
  '1373644132',
  '569032404',
  '949535178',
  '1568891754',
  '1046229217',
  '1929092005',
  '1502383224',
  '624730011',
  '509947375',
  '629108223',
  '981972400',
  '621579738',
  '583485973',
  '615651750',
  '1594343475',
  '946121399',
  '1075955624',
  '345672354',
  '1196349748',
  '634096123',
  '796686691',
  '962800817',
  '600632298',
  '630006065',
  '1200879496',
  '949535138',
  '1478789459',
  '545361055',
  '646872217',
  '618174977',
  '506395674',
  '469600759',
  '557703864',
  '634692155',
  '630006069',
  '462045460',
  '1905258292',
  '605758536',
  '1027087184',
  '806577529',
  '927424515',
  '638902475',
  '1349279229',
  '621579822',
  '627799109',
  '583745107',
  '1104829505',
  '981972500',
  '940505059',
  '656442213',
  '1323527229',
  '551729624',
  '1262148383',
  '767882417',
  '623838334',
  '978819671',
  '569029538',
  '801252922',
  '608723760',
  '627015324',
  '544527109',
  '978819793',
  '662896684',
  '1060220135',
  '1033143199',
  '1575460147',
  '1080032593',
  '809511387',
  '576333656',
  '557875608',
  '615651722',
  '674514260',
  '551729497',
  '462045282',
  '946121466',
  '622146829',
  '600292689',
  '464006956',
  '575975325',
];

async function main() {
  console.log('--- Step 1: Pre-mutation SQLite Backup ---');
  const preBackup = await createDbBackup();
  console.log('Pre-backup created:', preBackup);

  const collectionId = 'cmt3921z100006kvbfpphe36n';
  const targetCollection = await prisma.collection.findUnique({
    where: { id: collectionId },
  });

  if (!targetCollection) {
    throw new Error(`Target collection "${collectionId}" not found in database.`);
  }

  console.log(`Target Collection: "${targetCollection.name}" (ID: ${targetCollection.id})`);
  console.log(`Input Target Asset IDs: ${TARGET_ASSET_IDS.length}`);

  // Query all images matching these specific asIds
  const matchingImages = await prisma.image.findMany({
    where: {
      asId: { in: TARGET_ASSET_IDS },
    },
    select: {
      id: true,
      code: true,
      asId: true,
      title: true,
      filePath: true,
    },
  });

  console.log(`Images found in DB matching the 100 Asset IDs: ${matchingImages.length}`);

  const foundAsIdSet = new Set(matchingImages.map((img) => img.asId));
  const missingAsIds = TARGET_ASSET_IDS.filter((id) => !foundAsIdSet.has(id));
  if (missingAsIds.length > 0) {
    console.log(`Missing Asset IDs in DB (${missingAsIds.length}):`, missingAsIds);
  } else {
    console.log('All 100 Asset IDs found in database!');
  }

  // Find existing items in this collection
  const existingItems = await prisma.collectionItem.findMany({
    where: { collectionId },
    select: { imageId: true },
  });
  const existingImageIdSet = new Set(existingItems.map((it) => it.imageId));

  const itemsToInsert = matchingImages.filter((img) => !existingImageIdSet.has(img.id));
  console.log(`New items to add to collection: ${itemsToInsert.length}`);

  if (itemsToInsert.length > 0) {
    await prisma.collectionItem.createMany({
      data: itemsToInsert.map((img) => ({
        collectionId,
        imageId: img.id,
      })),
    });
    console.log(`Successfully added ${itemsToInsert.length} items to "${targetCollection.name}".`);
  } else {
    console.log('All matching items are already in this collection.');
  }

  // Set collection cover if not set
  if (!targetCollection.coverId && matchingImages.length > 0) {
    const validCover = matchingImages.find((img) => img.filePath && img.filePath.length > 0) || matchingImages[0];
    await prisma.collection.update({
      where: { id: collectionId },
      data: { coverId: validCover.id },
    });
    console.log(`Set coverId to ${validCover.id} (${validCover.code || 'placeholder'})`);
  }

  console.log('--- Step 2: Post-mutation SQLite Backup ---');
  const postBackup = await createDbBackup();
  console.log('Post-backup created:', postBackup);

  const totalInCollection = await prisma.collectionItem.count({
    where: { collectionId },
  });
  console.log(`\nFinal count in collection "${targetCollection.name}": ${totalInCollection} items.`);
}

main()
  .catch((err) => {
    console.error('Migration script failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
