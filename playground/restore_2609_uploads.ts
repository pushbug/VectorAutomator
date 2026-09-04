import { prisma } from '../src/lib/prisma';
import { createDbBackup } from '../src/lib/dbBackup';

interface MissingItemSpec {
  code: string;
  year: number;
  month: number;
  seqNumber: number;
  title: string;
  keywords: string;
  filePath: string;
  createdAt: string;
}

const MISSING_ARTWORKS: MissingItemSpec[] = [
  {
    code: '2609-07',
    year: 2026,
    month: 9,
    seqNumber: 7,
    title: 'Vertical 5 Step Hexagonal Infographic Layout for Company Goal and Workflow Visualization. Presentation, Plan and Strategy. Vector illustration.',
    keywords: 'business, presentation, step, data, success, process, infographic, option, flow, workflow, report, strategy, work, banner, timeline, infographics, progress, plan, line, template, growth, target, concept, company, time, brochure, number, development, communication, goal, connection, milestone, finance, creative, corporate, history, part, direction, up, steps, navigation, section, level, vertical, road map, class, hexagon, 5, five',
    filePath: '/uploads/2609-07.jpg',
    createdAt: '2026-09-04T00:00:00.000Z',
  },
  {
    code: '2609-08',
    year: 2026,
    month: 9,
    seqNumber: 8,
    title: '5 Steps Arch Timeline Infographic Template for Business Workflow and Strategy Presentation. Report, Banner and Brochure. Vector illustration.',
    keywords: 'plan, diagram, chart, 5, five, growth, target, project, business, workflow, report, information, data, development, pointer, stage, flow, work, part, roadmap, progress, processes, feature, strategy, technology, connection, communication, process, creative, brochure, timeline, step, element, template, infographics, banner, presentation, structure, point, option, finance, marketing, success, infographic, semi, arrow, up, grow, goal',
    filePath: '/uploads/2609-08.jpg',
    createdAt: '2026-09-04T00:00:00.000Z',
  },
  {
    code: '2609-09',
    year: 2026,
    month: 9,
    seqNumber: 9,
    title: '4 Steps Chain Link Infographic Template for Business Workflow and Strategy Presentation. Banner, Brochure and Plan. Vector illustration.',
    keywords: '4, four, forward, target, growth, drive, movement, next, goal, options, timeline, technology, success, evolution, project, sequence, brochure, workflow, flow, processes, productivity, startup, development, pointer, succession, stage, element, chart, banner, strategy, diagram, information, business, process, template, presentation, infographics, plan, report, marketing, progress, management, data, infographic, step, option, number, connection, chain, connect',
    filePath: '/uploads/2609-09.jpg',
    createdAt: '2026-09-04T00:00:00.000Z',
  },
  {
    code: '2609-10',
    year: 2026,
    month: 9,
    seqNumber: 10,
    title: '3 Steps Hexagon Cycle Infographic Template for Business Workflow and Strategy Presentation. Strategy, Plan and Banner. Vector illustration.',
    keywords: 'structure, connected, data, report, goal, direction, target, market, project, communication, development, processes, finance, connection, technology, marketing, website, plan, brochure, concept, layout, element, design, illustration, progress, success, strategy, diagram, template, business, presentation, vector, workflow, information, banner, timeline, number, option, step, infographics, infographic, loop, round, 3, three, triangle, process, cycle, hexagon',
    filePath: '/uploads/2609-10.jpg',
    createdAt: '2026-09-04T00:00:00.000Z',
  },
  {
    code: '2609-11',
    year: 2026,
    month: 9,
    seqNumber: 11,
    title: 'DNA Helix Arrow Infographic 3 Process Template for Business Strategy and Goal Achievement. Presentation, Bio Technology and Science. Vector illustration.',
    keywords: 'number, strategy, map, road, template, sequence, planning, time, option, 3, three, success, arrow, grow, growth, up, presentation, business, report, steps, infographic, infographics, investment, plan, flow, work, economy, stage, step, statistics, sales, finance, process, company, line, summary, timeline, information, data, concept, design, marketing, diagram, progress, dna, goal, bio, technology, biomatic, science',
    filePath: '/uploads/2609-11.jpg',
    createdAt: '2026-09-04T00:00:00.000Z',
  },
];

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`=== RESTORING 5 MISSING ARTWORKS (DryRun: ${isDryRun}) ===`);

  const currentCount = await prisma.image.count();
  console.log(`Current images in dev.db: ${currentCount}`);

  if (!isDryRun) {
    console.log('\n--- Step 1: Pre-mutation SQLite Backup ---');
    const preBackup = await createDbBackup();
    console.log('Pre-backup created at:', preBackup);
  }

  console.log('\n--- Step 2: Auditing and inserting missing items ---');
  let insertedCount = 0;
  let skippedCount = 0;

  for (const item of MISSING_ARTWORKS) {
    const existing = await prisma.image.findUnique({
      where: { code: item.code },
    });

    if (existing) {
      console.log(`[SKIP] Code "${item.code}" already exists (ID: ${existing.id}).`);
      skippedCount++;
      continue;
    }

    if (isDryRun) {
      console.log(`[DRY-RUN WOULD INSERT] Code: ${item.code} | Title: "${item.title.slice(0, 50)}..." | File: ${item.filePath}`);
      insertedCount++;
    } else {
      const created = await prisma.image.create({
        data: {
          code: item.code,
          year: item.year,
          month: item.month,
          seqNumber: item.seqNumber,
          title: item.title,
          keywords: item.keywords,
          filePath: item.filePath,
          status: 'uploaded',
          createdAt: new Date(item.createdAt),
        },
      });
      console.log(`[INSERTED] Code: ${created.code} | ID: ${created.id}`);
      insertedCount++;
    }
  }

  console.log(`\nSummary: ${insertedCount} to insert, ${skippedCount} skipped.`);

  if (isDryRun) {
    console.log('Dry run complete. No modifications made to database.');
    return;
  }

  // Ensure WAL is checkpointed cleanly via Prisma
  console.log('\n--- Step 3: SQLite WAL Checkpoint ---');
  const ckResult = await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);');
  console.log('WAL checkpoint result:', ckResult);

  console.log('\n--- Step 4: Post-mutation SQLite Backup ---');
  const postBackup = await createDbBackup();
  console.log('Post-backup created at:', postBackup);

  const finalCount = await prisma.image.count();
  console.log(`\n>>> Final Verification: Total images in database: ${finalCount} (Target: 2979) <<<`);
}

main()
  .catch((err) => {
    console.error('Restoration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
