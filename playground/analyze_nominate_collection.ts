import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  const collectionId = 'cmt6z6kda0066fnvbbrvkjayx';
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: { items: { include: { image: { include: { stats: true } } } } },
  });

  if (!collection) {
    console.error('Adobe Nominate 2026 collection not found.');
    return;
  }

  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(now.getFullYear() - 1);

  const items = collection.items.map((it) => {
    const img = it.image;
    const stats = (img.stats || []).filter((s) => s.platform.toLowerCase().includes('adobe'));

    let totalAdobe = 0;
    let ltm = 0;
    let y2026 = 0;
    let y2025 = 0;
    let y2024 = 0;
    let y2023 = 0;

    stats.forEach((s) => {
      const amt = Number(s.earnings || 0);
      totalAdobe += amt;
      const d = new Date(s.date);
      if (d >= oneYearAgo && d <= now) ltm += amt;
      if (d.getFullYear() === 2026) y2026 += amt;
      if (d.getFullYear() === 2025) y2025 += amt;
      if (d.getFullYear() === 2024) y2024 += amt;
      if (d.getFullYear() === 2023) y2023 += amt;
    });

    return {
      id: img.id,
      code: img.code || '',
      asId: img.asId || '',
      title: img.title || '',
      year: img.year || 2023,
      totalAdobe: Number(totalAdobe.toFixed(2)),
      ltm: Number(ltm.toFixed(2)),
      y2026: Number(y2026.toFixed(2)),
      y2025: Number(y2025.toFixed(2)),
      y2024: Number(y2024.toFixed(2)),
      y2023: Number(y2023.toFixed(2)),
    };
  });

  // Model 2: Strict Asset Protection (Lifetime >= $10 OR LTM >= $4 OR 2026 Rising Star)
  const tier1Protect = items.filter((it) => {
    return it.totalAdobe >= 10.0 || it.ltm >= 4.0 || (it.year === 2026 && it.y2026 >= 2.5);
  });

  const tier2Nominate4 = items.filter((it) => {
    if (tier1Protect.includes(it)) return false;
    return it.totalAdobe >= 3.0 || it.ltm >= 0.50 || it.y2026 > 0;
  });

  const tier3Nominate10 = items.filter((it) => {
    return !tier1Protect.includes(it) && !tier2Nominate4.includes(it);
  });

  const sumEarnings = (arr: typeof items) => arr.reduce((sum, it) => sum + it.totalAdobe, 0);

  const t1Rev = sumEarnings(tier1Protect);
  const t2Rev = sumEarnings(tier2Nominate4);
  const t3Rev = sumEarnings(tier3Nominate10);
  const instantPayout = tier2Nominate4.length * 4 + tier3Nominate10.length * 10;
  const instantPayoutThb = Math.round(instantPayout * 36.5);

  console.log(`--- MODEL 2 SUMMARY (${tier1Protect.length} / ${tier2Nominate4.length} / ${tier3Nominate10.length}) ---`);
  console.log(`Tier 1 Protect: ${tier1Protect.length} items (Total Revenue in DB: $${t1Rev.toFixed(2)})`);
  console.log(`Tier 2 Nominate 1-Year $4: ${tier2Nominate4.length} items (Total Revenue in DB: $${t2Rev.toFixed(2)})`);
  console.log(`Tier 3 Nominate Perpetual $10: ${tier3Nominate10.length} items (Total Revenue in DB: $${t3Rev.toFixed(2)})`);
  console.log(`Instant Payout: $${instantPayout.toFixed(2)} (~${instantPayoutThb.toLocaleString('th-TH')} THB)`);

  // Write new docs/nominate.md
  const mdContent = `# Adobe Stock Free Collection Nomination Strategy (Model 2: Asset Protection)

**Collection Name:** Adobe Nominate 2026  
**Strategy Type:** Asset Protection & Risk-Optimized (Model 2: ${tier1Protect.length} / ${tier2Nominate4.length} / ${tier3Nominate10.length})  
**Total Artworks:** ${items.length}

---

## Executive Comparison: Model 1 vs Model 2 (Updated with 2023–2026 Lifetime Sales)

| Feature | Model 1 (Velocity-Only) | Model 2 (${tier1Protect.length} / ${tier2Nominate4.length} / ${tier3Nominate10.length}) [RECOMMENDED] |
| :--- | :--- | :--- |
| **Philosophy** | มองเฉพาะ **สถิติ 12 เดือนล่าสุด (Velocity)** | มอง **มูลค่าสะสมตลอดกาล (Lifetime $\\ge \\$10$) + ดาวรุ่ง 2026** |
| **🛡️ Tier 1: Protect** | **43 รูป** ($380.34)<br>*เฉพาะดาวรุ่งปี 2026* | **${tier1Protect.length} รูป** ($${t1Rev.toFixed(2)})<br>*คุ้มครอง Top Seller และรูปที่เคยทำเงิน $\\ge \\$10 ทุกรูป* |
| **⭐ Tier 2: 1-Year $4.00** | **550 รูป** ($5,469.77)<br>*รวมรูปที่เคยดังแต่ปีนี้แผ่ว* | **${tier2Nominate4.length} รูป** ($${t2Rev.toFixed(2)})<br>*เฉพาะรูปเกรด B ($3-10) ทำเงินปานกลาง* |
| **💎 Tier 3: Perpetual $10** | **192 รูป** ($841.96) | **${tier3Nominate10.length} รูป** ($${t3Rev.toFixed(2)})<br>*เฉพาะสต็อกตายสนิทจริง (< $3 ตลอดกาล)* |
| **💵 เงินสดรับทันที** | **$4,120.00** (~150,380 บาท) | **$${instantPayout.toFixed(2)}** (~${instantPayoutThb.toLocaleString('th-TH')} บาท) |
| **ระดับความเสี่ยง** | เสี่ยงเสียรูปอดีต Best Seller ไปให้โหลดฟรี 1 ปี | **ปลอดภัย 100%** คุ้มครองรูปเกรด A ทุกรูปในพอร์ต ไม่เสียสิทธิ์ถาวร |

---

## Comma-Separated ID Lists (Model 2: ${tier1Protect.length} / ${tier2Nominate4.length} / ${tier3Nominate10.length})

### 🛡️ List 1: Protect Proven Winners & Rising Stars (${tier1Protect.length} Assets)
\`\`\`text
${tier1Protect.map((it) => it.asId || it.code).join(', ')}
\`\`\`

---

### ⭐ List 2: Nominate 1-Year $4.00 (${tier2Nominate4.length} Assets)
\`\`\`text
${tier2Nominate4.map((it) => it.asId || it.code).join(', ')}
\`\`\`

---

### 💎 List 3: Nominate Perpetual $10.00 (${tier3Nominate10.length} Assets)
\`\`\`text
${tier3Nominate10.map((it) => it.asId || it.code).join(', ')}
\`\`\`
`;

  const outputPath = path.join(__dirname, '../docs/nominate.md');
  fs.writeFileSync(outputPath, mdContent, 'utf-8');
  console.log(`Updated ${outputPath}`);

  // Synchronize collections into Database inside atomic transaction
  console.log('\n--- SYNCHRONIZING DATABASE COLLECTIONS ---');

  const tier1Name = `Adobe Nominate - Tier 1: Protect (${tier1Protect.length})`;
  const tier2Name = `Adobe Nominate - Tier 2: 1-Year $4 (${tier2Nominate4.length})`;
  const tier3Name = `Adobe Nominate - Tier 3: Perpetual $10 (${tier3Nominate10.length})`;

  await prisma.$transaction(async (tx) => {
    // 1. Cleanup stale 0-item legacy test collection if present
    await tx.collection.deleteMany({
      where: {
        name: { in: ['Protect Proven Winners & Rising Stars (130 Assets)'] },
      },
    });

    // Helper to upsert collection and items
    async function syncCollection(name: string, description: string, targetItems: typeof items) {
      let col = await tx.collection.findFirst({ where: { name } });
      if (!col) {
        col = await tx.collection.create({
          data: {
            name,
            description,
          },
        });
      } else {
        await tx.collection.update({
          where: { id: col.id },
          data: { description },
        });
      }

      // Refresh items
      await tx.collectionItem.deleteMany({ where: { collectionId: col.id } });
      await tx.collectionItem.createMany({
        data: targetItems.map((it) => ({
          collectionId: col.id,
          imageId: it.id,
        })),
      });

      console.log(`Synced DB Collection: "${name}" -> ${targetItems.length} items`);
    }

    await syncCollection(
      tier1Name,
      'Top Sellers, Cash Cows (Lifetime >= $10), and 2026 Rising Stars (Asset Protection)',
      tier1Protect
    );

    await syncCollection(
      tier2Name,
      'Moderate Performers (Grade B: $3-$10 Lifetime or active LTM) nominated for 1-year free collection',
      tier2Nominate4
    );

    await syncCollection(
      tier3Name,
      'Stagnant assets (Lifetime < $3) nominated for perpetual free collection ($10 buyout)',
      tier3Nominate10
    );
  });

  console.log('Database synchronization completed successfully.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
