import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'dev.db');
const db = new Database(dbPath);

console.log('Current table info for Image:');
const columns = db.prepare(`PRAGMA table_info(Image)`).all() as { name: string; type: string }[];
console.log(columns.map(c => c.name));

const colNames = columns.map(c => c.name);
if (!colNames.includes('code')) {
  console.log('Adding code column...');
  db.prepare(`ALTER TABLE Image ADD COLUMN code TEXT`).run();
}
if (!colNames.includes('year')) {
  console.log('Adding year column...');
  db.prepare(`ALTER TABLE Image ADD COLUMN year INTEGER`).run();
}
if (!colNames.includes('month')) {
  console.log('Adding month column...');
  db.prepare(`ALTER TABLE Image ADD COLUMN month INTEGER`).run();
}
if (!colNames.includes('seqNumber')) {
  console.log('Adding seqNumber column...');
  db.prepare(`ALTER TABLE Image ADD COLUMN seqNumber INTEGER`).run();
}

console.log('Creating unique index on code if not exists...');
db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS Image_code_key ON Image(code)`).run();

console.log('Updated table info:');
console.log(db.prepare(`PRAGMA table_info(Image)`).all());
db.close();
