import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filePath = searchParams.get('path');

  if (!filePath) {
    return new NextResponse('Missing path parameter', { status: 400 });
  }

  // Prevent basic path traversal attacks
  if (filePath.includes('\0') || filePath.includes('..')) {
    return new NextResponse('Invalid path', { status: 400 });
  }

  try {
    let absolutePath = path.isAbsolute(filePath) && !filePath.startsWith('/uploads')
      ? filePath
      : path.resolve(process.cwd(), 'public', filePath.replace(/^\//, ''));

    if (!fs.existsSync(absolutePath)) {
      // Fallback try direct resolve
      absolutePath = path.resolve(filePath);
    }

    // Ensure the file exists and is a file
    const stat = await fs.promises.stat(absolutePath);
    if (!stat.isFile()) {
      return new NextResponse('Not a file', { status: 404 });
    }

    const ext = path.extname(absolutePath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else {
      return new NextResponse('Unsupported file type', { status: 415 });
    }

    const etag = `W/"${stat.size}-${Math.floor(stat.mtimeMs)}"`;
    const ifNoneMatch = request.headers.get('if-none-match');

    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': 'no-cache, must-revalidate',
        },
      });
    }

    // Read file and return as stream/buffer
    const fileBuffer = await fs.promises.readFile(absolutePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'ETag': etag,
        'Cache-Control': 'no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error serving local image:', error);
    return new NextResponse('File not found or unreadable', { status: 404 });
  }
}

