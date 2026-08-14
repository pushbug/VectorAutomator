import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import {
  KeepNoteJson,
  parseKeepNote,
  generateChronologicalCodes,
  ProcessedKeepArtwork,
} from '../src/lib/keepParser';

const isDryRun = process.argv.includes('--dry-run');
const keepDir = path.resolve(process.cwd(), 'data/Keep');
const uploadsDir = path.resolve(process.cwd(), 'public/uploads');
const dbPath = path.resolve(process.cwd(), 'dev.db');

console.log(`=== GOOGLE KEEP MIGRATION SCRIPT ===`);
console.log(`Mode: ${isDryRun ? 'DRY RUN (Validation only)' : 'LIVE RUN (Copy & DB Insert)'}`);
console.log(`Source: ${keepDir}`);
console.log(`Target Uploads: ${uploadsDir}`);
console.log(`Database: ${dbPath}\n`);

if (!fs.existsSync(keepDir)) {
  console.error(`Error: Source directory ${keepDir} does not exist.`);
  process.exit(1);
}

if (!fs.existsSync(uploadsDir) && !isDryRun) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 1. Scan and parse JSON files
const allFiles = fs.readdirSync(keepDir);
const jsonFiles = allFiles.filter((f) => f.endsWith('.json'));

console.log(`Total JSON files found: ${jsonFiles.length}`);

const parsedList: ReturnType<typeof parseKeepNote>[] = [];
let skippedNonArtwork = 0;

for (const file of jsonFiles) {
  try {
    const raw = fs.readFileSync(path.join(keepDir, file), 'utf-8');
    const json: KeepNoteJson = JSON.parse(raw);
    const parsed = parseKeepNote(json, file);

    if (parsed) {
      // Verify attachment exists on disk
      const fullImgPath = path.join(keepDir, parsed.attachmentPath);
      if (!fs.existsSync(fullImgPath)) {
        console.warn(`Warning: Attachment missing on disk for ${file}: ${parsed.attachmentPath}`);
        skippedNonArtwork++;
        continue;
      }
      parsedList.push(parsed);
    } else {
      skippedNonArtwork++;
    }
  } catch (err: any) {
    console.error(`Error parsing ${file}:`, err.message);
    skippedNonArtwork++;
  }
}

const validArtworks = parsedList.filter((p): p is NonNullable<typeof p> => p !== null);
console.log(`Valid artwork notes identified: ${validArtworks.length}`);
console.log(`Skipped non-artwork / knowledge notes: ${skippedNonArtwork}`);

// 2. Generate Chronological Codes
const processedArtworks = generateChronologicalCodes(validArtworks);
console.log(`Assigned ${processedArtworks.length} unique codes (Range: ${processedArtworks[0]?.code} -> ${processedArtworks[processedArtworks.length - 1]?.code})\n`);

// 3. Year breakdown
const yearSummary: Record<number, number> = {};
for (const item of processedArtworks) {
  yearSummary[item.year] = (yearSummary[item.year] || 0) + 1;
}
console.log('--- YEAR BREAKDOWN ---');
for (const [y, count] of Object.entries(yearSummary)) {
  console.log(`Year ${y}: ${count} artworks`);
}

if (isDryRun) {
  console.log('\n[DRY RUN COMPLETE] Everything validated successfully. Ready for live execution.');
  process.exit(0);
}

// 4. Live Execution: Copy Assets & Insert into SQLite
console.log('\nStarting file copy and database transaction...');
const startTime = Date.now();

const db = new Database(dbPath);
let copiedFiles = 0;
let skippedCopies = 0;

const insertStmt = db.prepare(`
  INSERT INTO Image (
    id, code, year, month, seqNumber, title, keywords, category, tags, notes, status, filePath, createdAt, updatedAt
  ) VALUES (
    @id, @code, @year, @month, @seqNumber, @title, @keywords, @category, @tags, @notes, @status, @filePath, @createdAt, @updatedAt
  )
`);

const executeMigration = db.transaction((artworks: ProcessedKeepArtwork[]) => {
  for (const item of artworks) {
    const srcImg = path.join(keepDir, item.attachmentPath);
    // Use keep-<filename> to prevent collision with other uploads
    const destFilename = `keep-${item.attachmentPath}`;
    const destImg = path.join(uploadsDir, destFilename);

    if (!fs.existsSync(destImg)) {
      fs.copyFileSync(srcImg, destImg);
      copiedFiles++;
    } else {
      skippedCopies++;
    }

    const id = `cuid_${crypto.randomBytes(12).toString('hex')}`;
    const nowIso = new Date().toISOString();
    const createdIso = item.dateObj.toISOString();

    insertStmt.run({
      id,
      code: item.code,
      year: item.year,
      month: item.month,
      seqNumber: item.seqNumber,
      title: item.title,
      keywords: item.keywords,
      category: item.stock || null,
      tags: item.tags || null,
      notes: item.notes || null,
      status: 'uploaded',
      filePath: destImg,
      createdAt: createdIso,
      updatedAt: nowIso,
    });
  }
});

try {
  executeMigration(processedArtworks);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const totalDbRows = db.prepare('SELECT count(*) as count FROM Image').get() as { count: number };

  console.log(`\n=== MIGRATION COMPLETED SUCCESSFULLY in ${duration}s ===`);
  console.log(`Copied images: ${copiedFiles} (already present: ${skippedCopies})`);
  console.log(`Total Image records in SQLite: ${totalDbRows.count}`);
} catch (error: any) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
