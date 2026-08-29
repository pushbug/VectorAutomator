import { prisma } from '../src/lib/prisma';

async function main() {
  const collectionId = 'cmt6z6kda0066fnvbbrvkjayx';
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: { items: { include: { image: { include: { stats: true } } } } },
  });

  if (!collection) return;

  const now = new Date('2026-08-28');
  const oneYearAgo = new Date('2025-08-28');

  const items = collection.items.map((it) => {
    const img = it.image;
    const stats = (img.stats || []).filter((s) => s.platform.toLowerCase().includes('adobe'));

    let totalAdobe = 0;
    let ltm = 0;
    let y2026 = 0;
    let y2025 = 0;

    stats.forEach((s) => {
      const amt = Number(s.earnings || 0);
      totalAdobe += amt;
      const d = new Date(s.date);
      if (d >= oneYearAgo && d <= now) ltm += amt;
      if (d.getFullYear() === 2026) y2026 += amt;
      if (d.getFullYear() === 2025) y2025 += amt;
    });

    return {
      code: img.code,
      asId: img.asId,
      year: img.year,
      totalAdobe: Number(totalAdobe.toFixed(2)),
      ltm: Number(ltm.toFixed(2)),
      y2026: Number(y2026.toFixed(2)),
      y2025: Number(y2025.toFixed(2)),
    };
  });

  // Strict Cash Cow (Lifetime >= $10)
  const tier1Protect10 = items.filter((it) => {
    return it.totalAdobe >= 10.0 || it.ltm >= 4.0 || (it.year === 2026 && it.y2026 >= 2.5);
  });

  const tier2Nominate4 = items.filter((it) => {
    if (tier1Protect10.includes(it)) return false;
    return it.totalAdobe >= 3.0 || it.ltm >= 0.50 || it.y2026 > 0;
  });

  const tier3Nominate10 = items.filter((it) => {
    return !tier1Protect10.includes(it) && !tier2Nominate4.includes(it);
  });

  console.log(`With Lifetime >= $10:`);
  console.log(`🛡️ Protect (>= $10 Lifetime or Strong 2026): ${tier1Protect10.length} items`);
  console.log(`⭐ Nominate 1-Year $4: ${tier2Nominate4.length} items`);
  console.log(`💎 Nominate Perpetual $10: ${tier3Nominate10.length} items`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
