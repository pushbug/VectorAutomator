import path from 'path';
import fs from 'fs/promises';
import { scheduleAutoBackup } from './dbBackup';

export interface SaveImageFileResult {
  dbFilePath: string;
  physicalPath: string;
}

export interface SyncPhysicalUploadResult {
  syncedCount: number;
  syncedCodes: string[];
}

/**
 * Infers appropriate file extension from filename or mime type.
 */
export function inferImageExtension(file: { name?: string; type?: string }): string {
  let ext = file.name ? path.extname(file.name).toLowerCase() : '';
  if (!ext && file.type) {
    if (file.type === 'image/png') ext = '.png';
    else if (file.type === 'image/webp') ext = '.webp';
    else if (file.type === 'image/gif') ext = '.gif';
    else if (file.type === 'image/svg+xml') ext = '.svg';
    else if (file.type === 'image/jpeg' || file.type === 'image/jpg') ext = '.jpg';
  }
  return ext || '.jpg';
}

/**
 * Saves an uploaded image File buffer to public/uploads with sanitized filename based on image code.
 */
export async function saveImageFile(
  file: File,
  code: string,
  baseDir: string = process.cwd()
): Promise<SaveImageFileResult> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadsDir = path.resolve(baseDir, 'public', 'uploads');
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
  }

  const ext = inferImageExtension(file);
  const finalCode = (code || `img-${Date.now()}`).trim();
  const sanitizedCode = finalCode.replace(/[^a-zA-Z0-9_-]/g, '_');
  const targetFilename = `${sanitizedCode}${ext}`;
  const physicalPath = path.join(uploadsDir, targetFilename);

  await fs.writeFile(physicalPath, buffer);

  return {
    dbFilePath: `/uploads/${targetFilename}`,
    physicalPath,
  };
}

/**
 * Safely unlinks an old image file from disk, catching missing file errors.
 */
export async function deleteOldImageFile(
  filePath?: string | null,
  baseDir: string = process.cwd()
): Promise<void> {
  if (!filePath || typeof filePath !== 'string' || !filePath.trim()) {
    return;
  }
  try {
    const oldFull = path.isAbsolute(filePath) && !filePath.startsWith('/uploads')
      ? filePath
      : path.resolve(baseDir, 'public', filePath.replace(/^\//, ''));
    await fs.unlink(oldFull);
  } catch {
    // Gracefully ignore missing or inaccessible file unlinks
  }
}

/**
 * Scans public/uploads for physical files matching image codes and links them to database records where filePath is missing.
 */
export async function syncPhysicalUploadFiles(
  prismaClient: any,
  baseDir: string = process.cwd()
): Promise<SyncPhysicalUploadResult> {
  const uploadsDir = path.resolve(baseDir, 'public', 'uploads');
  let files: string[] = [];
  try {
    files = await fs.readdir(uploadsDir);
  } catch {
    return { syncedCount: 0, syncedCodes: [] };
  }

  const validExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif']);
  const diskCodeMap = new Map<string, string>();

  for (const filename of files) {
    if (filename.startsWith('.')) continue;
    const ext = path.extname(filename).toLowerCase();
    if (!validExts.has(ext)) continue;
    const nameWithoutExt = path.basename(filename, path.extname(filename));
    const normalizedKey = nameWithoutExt.trim().toLowerCase();
    if (!diskCodeMap.has(normalizedKey)) {
      diskCodeMap.set(normalizedKey, filename);
    }
  }

  if (diskCodeMap.size === 0) {
    return { syncedCount: 0, syncedCodes: [] };
  }

  const targetImages = await prismaClient.image.findMany({
    where: {
      filePath: '',
      code: { not: null },
    },
    select: {
      id: true,
      code: true,
      status: true,
    },
  });

  const syncedCodes: string[] = [];

  for (const img of targetImages) {
    if (!img.code) continue;
    const codeKey = img.code.trim().toLowerCase();
    const sanitizedKey = img.code.trim().replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

    const matchedFilename = diskCodeMap.get(codeKey) || diskCodeMap.get(sanitizedKey);
    if (matchedFilename) {
      const newFilePath = `/uploads/${matchedFilename}`;
      const newStatus = img.status === 'pending' ? 'uploaded' : img.status;

      await prismaClient.image.update({
        where: { id: img.id },
        data: {
          filePath: newFilePath,
          status: newStatus,
        },
      });

      syncedCodes.push(img.code);
    }
  }

  if (syncedCodes.length > 0) {
    scheduleAutoBackup();
  }

  return {
    syncedCount: syncedCodes.length,
    syncedCodes,
  };
}

