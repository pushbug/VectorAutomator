import { prisma } from '../src/lib/prisma';

async function main() {
  const targetIds = ['615651722', '622146829'];

  const images = await prisma.image.findMany({
    where: { asId: { in: targetIds } },
    include: {
      stats: {
        orderBy: { date: 'asc' },
      },
      serpItems: {
        include: { serpQuery: true },
      },
    },
  });

  console.log(`Found ${images.length} images.`);

  for (const img of images) {
    console.log(`\n======================================================`);
    console.log(`CODE: ${img.code} | AS ID: ${img.asId} | UPLOADED: ${img.year}-${img.month}`);
    console.log(`TITLE: "${img.title}"`);
    console.log(`TOTAL DLs (All platforms): ${img.totalDownloads} | ADOBE DLs: ${img.asDownloads}`);
    console.log(`======================================================`);

    const stats = img.stats || [];
    const adobeStats = stats.filter((s) => s.platform.toLowerCase().includes('adobe'));

    console.log('\n--- ADOBE MONTHLY STATS HISTORY ---');
    let totalAdobeEarnings = 0;
    let totalAdobeDownloads = 0;

    adobeStats.forEach((s) => {
      totalAdobeEarnings += s.earnings;
      totalAdobeDownloads += s.downloads;
      console.log(`Date: ${s.date.toISOString().slice(0, 10)} | Earnings: $${s.earnings.toFixed(2)} | DLs: ${s.downloads}`);
    });

    console.log(`\nTotal Adobe Recorded in DB: $${totalAdobeEarnings.toFixed(2)} (${totalAdobeDownloads} DLs)`);

    // Yearly Breakdown
    const byYear: Record<number, { earnings: number; dls: number }> = {};
    adobeStats.forEach((s) => {
      const y = new Date(s.date).getFullYear();
      if (!byYear[y]) byYear[y] = { earnings: 0, dls: 0 };
      byYear[y].earnings += s.earnings;
      byYear[y].dls += s.downloads;
    });

    console.log('\n--- YEARLY BREAKDOWN (ADOBE) ---');
    Object.keys(byYear).sort().forEach((y) => {
      const yr = Number(y);
      console.log(`Year ${yr}: $${byYear[yr].earnings.toFixed(2)} (${byYear[yr].dls} DLs) - Avg $${(byYear[yr].earnings / Math.max(1, byYear[yr].dls)).toFixed(2)}/DL`);
    });

    // Check SERP Rank
    if (img.serpItems && img.serpItems.length > 0) {
      console.log('\n--- SERP RANKING TELEMETRY ---');
      img.serpItems.forEach((sp) => {
        console.log(`Keyword: "${sp.serpQuery.keyword}" | Page: ${sp.serpQuery.pageNumber} | Rank: ${sp.rank} | Date: ${sp.serpQuery.searchedAt.toISOString().slice(0, 10)}`);
      });
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
