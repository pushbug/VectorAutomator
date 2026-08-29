import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  const nominatePath = path.join(__dirname, '../docs/nominate.md');
  const content = fs.readFileSync(nominatePath, 'utf-8');

  // Extract List 2 (550 assets)
  const match = content.match(/### ⭐ List 2: Nominate 1-Year \$4\.00 \(550 Assets\)\s+```text\s+([\s\S]+?)\s+```/);
  if (!match) {
    console.log('List 2 not found in nominate.md');
    return;
  }

  const rawTokens = match[1].split(/[,\s\n\r\t;]+/).map((t) => t.trim()).filter(Boolean);
  const uniqueTokens = Array.from(new Set(rawTokens));
  console.log(`Extracted ${uniqueTokens.length} unique tokens.`);

  // Test chunking algorithm
  const CHUNK_SIZE = 100;
  const matchedImagesMap = new Map<string, { id: string; asId: string | null; code: string | null }>();

  for (let i = 0; i < uniqueTokens.length; i += CHUNK_SIZE) {
    const chunk = uniqueTokens.slice(i, i + CHUNK_SIZE);
    const chunkMatches = await prisma.image.findMany({
      where: {
        OR: [
          { id: { in: chunk } },
          { asId: { in: chunk } },
          { code: { in: chunk } },
          { ssId: { in: chunk } },
          { vzId: { in: chunk } },
        ],
      },
      select: { id: true, asId: true, code: true },
    });

    chunkMatches.forEach((img) => {
      matchedImagesMap.set(img.id, img);
    });
  }

  const validImageIds = Array.from(matchedImagesMap.keys());
  console.log(`Chunked query succeeded! Matched ${validImageIds.length} unique images across 550 tokens.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
