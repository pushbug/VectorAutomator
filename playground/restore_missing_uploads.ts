import path from 'path';
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
    code: '2608-46',
    year: 2026,
    month: 8,
    seqNumber: 46,
    title: '3 Steps Vertical Process Infographic Design for Business Strategy and Project Management. Presentation, Plan and Strategy. Vector illustration.',
    keywords: 'infographics, infographic, 3, work, presentation, business, three, data, plan, option, stage, step, process, success, information, flow, workflow, report, strategy, timeline, banner, progress, design, line, diagram, template, marketing, target, growth, company, vector, brochure, concept, time, number, development, project, goal, connection, communication, map, management, element, finance, poster, sequence, level, processes, list',
    filePath: '/uploads/2608-46.jpg',
    createdAt: '2026-08-31T00:00:00.000Z',
  },
  {
    code: '2608-47',
    year: 2026,
    month: 8,
    seqNumber: 47,
    title: '4 Steps Curved Pathway Infographic Design for Business Process and Timeline Presentation. Strategy, Plan and Report. Vector illustration.',
    keywords: 'infographic, infographics, 4, option, business, presentation, step, data, process, success, information, flow, workflow, report, work, strategy, timeline, banner, progress, plan, design, line, template, marketing, target, growth, vector, brochure, concept, time, number, development, project, goal, connection, communication, graphic, management, element, stage, finance, poster, four, connect, road, direction, path, map, choice',
    filePath: '/uploads/2608-47.jpg',
    createdAt: '2026-08-31T00:00:00.000Z',
  },
  {
    code: '2608-48',
    year: 2026,
    month: 8,
    seqNumber: 48,
    title: '5 Steps Vertical Process Infographic Design for Corporate Strategy and Project Management. Presentation, Plan and Report. Vector illustration.',
    keywords: '5, infographics, presentation, infographic, business, data, step, process, success, information, option, flow, workflow, report, work, strategy, timeline, banner, progress, plan, template, marketing, target, growth, company, vector, brochure, concept, time, number, development, project, goal, communication, management, element, milestone, stage, finance, poster, sequence, vertical, choice, stack, processes, feature, grow, up, level',
    filePath: '/uploads/2608-48.jpg',
    createdAt: '2026-08-31T00:00:00.000Z',
  },
  {
    code: '2608-49',
    year: 2026,
    month: 8,
    seqNumber: 49,
    title: 'Modern 3 Options Arrow Timeline Infographic Vector Template for Workflow and Marketing Strategy. Presentation, Report and Plan. Vector illustration.',
    keywords: '3, infographics, infographic, presentation, data, drive, forward, growth, movement, target, arrow, banner, brochure, business, chart, development, diagram, element, evolution, flow, goal, graphic, information, management, marketing, next, number, option, options, plan, pointer, process, processes, productivity, progress, project, report, sequence, stage, startup, step, strategy, success, succession, technology, template, three, timeline, workflow',
    filePath: '/uploads/2608-49.jpg',
    createdAt: '2026-08-31T00:00:00.000Z',
  },
  {
    code: '2608-50',
    year: 2026,
    month: 8,
    seqNumber: 50,
    title: 'Business Infographic Template with 5 Steps Hexagon Circle for Workflow and Presentation. Plan, Report and Banner. Vector illustration.',
    keywords: '5, infographic, infographics, data, brochure, chart, diagram, five, plan, banner, business, center, circle, communication, connection, creative, cycle, development, element, feature, finance, flow, growth, information, marketing, option, part, pointer, presentation, process, progress, project, report, roadmap, round, semi, stage, step, strategy, structure, success, target, technology, template, timeline, work, workflow, flower, hexagon, idea',
    filePath: '/uploads/2608-50.jpg',
    createdAt: '2026-08-31T00:00:00.000Z',
  },
  {
    code: '2609-02',
    year: 2026,
    month: 9,
    seqNumber: 2,
    title: 'Creative Step by Step Infographic Design with 6 Options for Corporate Project Management. Banner, Choice and Brochure. Vector illustration.',
    keywords: '6, infographic, presentation, numbers, rectangle, frame, process, typography, information, pointer, icon, work, flow, option, step, steps, progress, concept, numeral, design, graphic, decorative, white, collection, creative, isolated, set, number, six, five, four, three, two, one, 5, 4, 3, 2, 1, vector, choice, brochure, workflow, 6th, feature, data, part, infographics, project',
    filePath: '/uploads/2609-02.jpg',
    createdAt: '2026-09-02T00:00:00.000Z',
  },
  {
    code: '2609-03',
    year: 2026,
    month: 9,
    seqNumber: 3,
    title: 'Circular Flower Infographic Template with 6 Steps Options for Business Process and Presentation. Vector illustration.',
    keywords: 'infographics, workflow, 6, presentation, infographic, business, step, data, success, process, option, information, flow, report, strategy, work, banner, progress, design, line, template, diagram, marketing, vector, target, concept, brochure, number, project, connection, colorful, chart, management, element, stage, choice, structure, teamwork, organization, team, round, feature, six, network, center, position, central, 6th, cycle, flower',
    filePath: '/uploads/2609-03.jpg',
    createdAt: '2026-09-02T00:00:00.000Z',
  },
  {
    code: '2609-04',
    year: 2026,
    month: 9,
    seqNumber: 4,
    title: 'Minimalist Milestone Infographic Banner with Arrow to Goal for Corporate Marketing Report. Presentation, Banner and Plan. Vector illustration.',
    keywords: '3, infographics, infographic, arrow, drive, growth, forward, movement, target, banner, brochure, business, chart, data, development, diagram, element, evolution, flow, goal, graphic, information, management, marketing, next, number, option, options, plan, pointer, presentation, process, processes, productivity, progress, project, report, sequence, stage, startup, step, strategy, success, succession, technology, template, three, timeline, workflow, cross',
    filePath: '/uploads/2609-04.jpg',
    createdAt: '2026-09-02T00:00:00.000Z',
  },
  {
    code: '2609-05',
    year: 2026,
    month: 9,
    seqNumber: 5,
    title: 'Creative Donut Infographic Design with 6 Connected Arrow Steps for Marketing Plan Timeline. Presentation, Plan and Workflow. Vector illustration.',
    keywords: 'infographic, presentation, infographics, 6, banner, circular, planning, template, advertising, business, chart, choice, circle, concept, creative, cycle, data, design, diagram, finance, information, layout, management, marketing, number, option, part, plan, process, progress, project, report, round, six, statistic, step, strategy, structure, success, workflow, work, team, flow, brochure, feature, stage, target, teamwork, arrow',
    filePath: '/uploads/2609-05.jpg',
    createdAt: '2026-09-02T00:00:00.000Z',
  },
];

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`=== RESTORING 9 MISSING ARTWORKS (DryRun: ${isDryRun}) ===`);

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

  console.log('\n--- Step 3: Post-mutation SQLite Backup ---');
  const postBackup = await createDbBackup();
  console.log('Post-backup created at:', postBackup);

  const finalCount = await prisma.image.count();
  console.log(`\n>>> Final Verification: Total images in database: ${finalCount} (Target: 2973) <<<`);
}

main()
  .catch((err) => {
    console.error('Restoration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
