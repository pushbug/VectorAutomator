import path from 'path';
import fs from 'fs/promises';

export interface SaveImageFileResult {
  dbFilePath: string;
  physicalPath: string;
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
