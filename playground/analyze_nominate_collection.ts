import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

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
    let y2024 = 0;

    stats.forEach((s) => {
      const amt = Number(s.earnings || 0);
      totalAdobe += amt;
      const d = new Date(s.date);
      if (d >= oneYearAgo && d <= now) ltm += amt;
      if (d.getFullYear() === 2026) y2026 += amt;
      if (d.getFullYear() === 2025) y2025 += amt;
      if (d.getFullYear() === 2024) y2024 += amt;
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

  console.log('--- MODEL 2 SUMMARY (130 / 524 / 131) ---');
  console.log(`Tier 1 Protect: ${tier1Protect.length} items (Total Revenue in DB: $${tier1Protect.reduce((sum, it) => sum + it.totalAdobe, 0).toFixed(2)})`);
  console.log(`Tier 2 Nominate 1-Year $4: ${tier2Nominate4.length} items (Total Revenue in DB: $${tier2Nominate4.reduce((sum, it) => sum + it.totalAdobe, 0).toFixed(2)})`);
  console.log(`Tier 3 Nominate Perpetual $10: ${tier3Nominate10.length} items (Total Revenue in DB: $${tier3Nominate10.reduce((sum, it) => sum + it.totalAdobe, 0).toFixed(2)})`);

  // Write new nominate_v2.md
  const mdContent = `# Adobe Stock Free Collection Nomination Strategy (Model 2: Asset Protection)

**Collection Name:** Adobe Nominate 2026  
**Strategy Type:** Asset Protection & Risk-Optimized (Model 2: 130 / 524 / 131)  
**Total Artworks:** 785

---

## Executive Comparison: Model 1 vs Model 2

| Feature | Model 1 (43 / 550 / 192) | Model 2 (130 / 524 / 131) [RECOMMENDED] |
| :--- | :--- | :--- |
| **Philosophy** | มองเฉพาะ **สถิติ 12 เดือนล่าสุด (Velocity)** | มอง **มูลค่าสะสมตลอดกาล (Lifetime $\\ge \\$10$) + ดาวรุ่ง 2026** |
| **🛡️ Tier 1: Protect** | **43 รูป** ($380.34)<br>*เฉพาะดาวรุ่งปี 2026* | **130 รูป** ($3,248.50)<br>*คุ้มครอง Top Seller และรูปที่เคยทำเงิน $\\ge \\$10 ทุกรูป* |
| **⭐ Tier 2: 1-Year $4.00** | **550 รูป** ($5,469.77)<br>*รวมรูปที่เคยดังแต่ปีนี้แผ่ว* | **524 รูป** ($3,212.10)<br>*เฉพาะรูปเกรด B ($3-10) ทำเงินปานกลาง* |
| **💎 Tier 3: Perpetual $10** | **192 รูป** ($841.96) | **131 รูป** ($231.47)<br>*เฉพาะสต็อกตายสนิทจริง (< $3 ตลอดกาล)* |
| **💵 เงินสดรับทันที** | **$4,120.00** (~150,380 บาท) | **$3,406.00** (~124,300 บาท) |
| **ระดับความเสี่ยง** | เสี่ยงเสียรูปอดีต Best Seller ไปให้โหลดฟรี 1 ปี | **ปลอดภัย 100%** คุ้มครองรูปเกรด A ทุกรูปในพอร์ต |

---

## Comma-Separated ID Lists (Model 2: 130 / 524 / 131)

### 🛡️ List 1: Protect Proven Winners & Rising Stars (130 Assets)
\`\`\`text
${tier1Protect.map((it) => it.asId || it.code).join(', ')}
\`\`\`

---

### ⭐ List 2: Nominate 1-Year $4.00 (524 Assets)
\`\`\`text
${tier2Nominate4.map((it) => it.asId || it.code).join(', ')}
\`\`\`

---

### 💎 List 3: Nominate Perpetual $10.00 (131 Assets)
\`\`\`text
${tier3Nominate10.map((it) => it.asId || it.code).join(', ')}
\`\`\`
`;

  const outputPath = path.join(__dirname, '../docs/nominate.md');
  fs.writeFileSync(outputPath, mdContent, 'utf-8');
  console.log(`Updated ${outputPath}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
