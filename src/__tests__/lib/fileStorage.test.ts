import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inferImageExtension, saveImageFile, deleteOldImageFile, syncPhysicalUploadFiles } from '@/lib/fileStorage';
import fs from 'fs/promises';

vi.mock('fs/promises', () => ({
  default: {
    access: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
    readdir: vi.fn(),
  },
  access: vi.fn(),
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  readdir: vi.fn(),
}));

vi.mock('@/lib/dbBackup', () => ({
  scheduleAutoBackup: vi.fn(),
}));

describe('File Storage Utilities (UT-LIB-STORAGE-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('inferImageExtension', () => {
    it('infers from filename extension first', () => {
      expect(inferImageExtension({ name: 'art.png', type: 'image/jpeg' })).toBe('.png');
      expect(inferImageExtension({ name: 'photo.JPEG', type: '' })).toBe('.jpeg');
      expect(inferImageExtension({ name: 'icon.webp' })).toBe('.webp');
    });

    it('infers from mime type if filename has no extension', () => {
      expect(inferImageExtension({ name: 'blob', type: 'image/png' })).toBe('.png');
      expect(inferImageExtension({ name: 'blob', type: 'image/webp' })).toBe('.webp');
      expect(inferImageExtension({ name: 'blob', type: 'image/gif' })).toBe('.gif');
      expect(inferImageExtension({ name: 'blob', type: 'image/svg+xml' })).toBe('.svg');
      expect(inferImageExtension({ name: 'blob', type: 'image/jpeg' })).toBe('.jpg');
    });

    it('defaults to .jpg for unknown extensions and mime types', () => {
      expect(inferImageExtension({ name: '', type: '' })).toBe('.jpg');
      expect(inferImageExtension({})).toBe('.jpg');
    });
  });

  describe('saveImageFile', () => {
    it('creates uploads directory if missing and writes file buffer', async () => {
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
      vi.mocked(fs.mkdir).mockResolvedValueOnce(undefined as any);
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined as any);

      const fakeFile = {
        name: 'test-art.png',
        type: 'image/png',
        arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
      } as unknown as File;

      const result = await saveImageFile(fakeFile, '2608-15', '/app');

      expect(fs.mkdir).toHaveBeenCalledWith('/app/public/uploads', { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/app/public/uploads/2608-15.png',
        expect.any(Buffer)
      );
      expect(result).toEqual({
        dbFilePath: '/uploads/2608-15.png',
        physicalPath: '/app/public/uploads/2608-15.png',
      });
    });

    it('sanitizes special characters in code', async () => {
      vi.mocked(fs.access).mockResolvedValueOnce(undefined as any);
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined as any);

      const fakeFile = {
        name: 'art.jpg',
        type: 'image/jpeg',
        arrayBuffer: async () => new Uint8Array([10, 20]).buffer,
      } as unknown as File;

      const result = await saveImageFile(fakeFile, '2608/15:special!', '/root');

      expect(result.dbFilePath).toBe('/uploads/2608_15_special_.jpg');
    });
  });

  describe('deleteOldImageFile', () => {
    it('deletes relative public path', async () => {
      vi.mocked(fs.unlink).mockResolvedValueOnce(undefined as any);
      await deleteOldImageFile('/uploads/old.jpg', '/root');
      expect(fs.unlink).toHaveBeenCalledWith('/root/public/uploads/old.jpg');
    });

    it('gracefully handles unlink failure', async () => {
      vi.mocked(fs.unlink).mockRejectedValueOnce(new Error('ENOENT'));
      await expect(deleteOldImageFile('/uploads/missing.jpg', '/root')).resolves.toBeUndefined();
    });

    it('ignores null or empty path', async () => {
      await deleteOldImageFile(null);
      await deleteOldImageFile('');
      expect(fs.unlink).not.toHaveBeenCalled();
    });
  });
});

describe('Physical Upload File Synchronization (UT-LIB-STORAGE-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('scans uploads directory and links matched files with case-insensitive extensions', async () => {
    vi.mocked(fs.readdir).mockResolvedValueOnce([
      '.gitkeep',
      '1604-01.jpg',
      '2002-01.JPG',
      '2005-02.png',
      '2005-03.PNG',
      'unknown.txt',
    ] as any);

    const mockPrisma = {
      image: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'img-1', code: '1604-01', status: 'pending' },
          { id: 'img-2', code: '2002-01', status: 'pending' },
          { id: 'img-3', code: '2005-02', status: 'uploaded' },
          { id: 'img-4', code: '2005-03', status: 'pending' },
          { id: 'img-5', code: '2006-01', status: 'pending' },
        ]),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    const result = await syncPhysicalUploadFiles(mockPrisma, '/app');

    expect(result.syncedCount).toBe(4);
    expect(result.syncedCodes).toEqual(['1604-01', '2002-01', '2005-02', '2005-03']);

    expect(mockPrisma.image.update).toHaveBeenCalledWith({
      where: { id: 'img-1' },
      data: { filePath: '/uploads/1604-01.jpg', status: 'uploaded' },
    });

    expect(mockPrisma.image.update).toHaveBeenCalledWith({
      where: { id: 'img-2' },
      data: { filePath: '/uploads/2002-01.JPG', status: 'uploaded' },
    });

    expect(mockPrisma.image.update).toHaveBeenCalledWith({
      where: { id: 'img-3' },
      data: { filePath: '/uploads/2005-02.png', status: 'uploaded' },
    });

    expect(mockPrisma.image.update).toHaveBeenCalledWith({
      where: { id: 'img-4' },
      data: { filePath: '/uploads/2005-03.PNG', status: 'uploaded' },
    });
  });

  it('returns zero synced when uploads folder cannot be read', async () => {
    vi.mocked(fs.readdir).mockRejectedValueOnce(new Error('ENOENT'));
    const mockPrisma = {
      image: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
    };

    const result = await syncPhysicalUploadFiles(mockPrisma, '/app');
    expect(result).toEqual({ syncedCount: 0, syncedCodes: [] });
    expect(mockPrisma.image.findMany).not.toHaveBeenCalled();
  });
});

