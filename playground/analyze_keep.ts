import fs from 'fs';
import path from 'path';

const keepDir = path.resolve(process.cwd(), 'data/Keep');
const files = fs.readdirSync(keepDir).filter(f => f.endsWith('.json'));

for (const file of files) {
  const content = JSON.parse(fs.readFileSync(path.join(keepDir, file), 'utf-8'));
  const labels: string[] = (content.labels || []).map((l: any) => l.name);
  const isVector = labels.some(l => /^Vector 202\d$/i.test(l)) || (!labels.includes('Knowledge') && content.attachments?.length > 0);

  if (!isVector) continue;
  if (!content.attachments || content.attachments.length === 0) continue;

  const text = content.textContent || '';
  const kwMatch = text.match(/Keyword:\s*([\s\S]*?)(?=\n\nNote:|\nNote:|$)/i);
  const kw = kwMatch ? kwMatch[1].trim() : '';
  if (!kw) {
    console.log(`Artwork with empty keywords: ${file}`);
    console.log('Title:', content.title);
    console.log('Text:', text);
  }
}
