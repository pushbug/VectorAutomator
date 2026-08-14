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
    const absolutePath = path.resolve(filePath);

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

    // Read file and return as stream/buffer
    const fileBuffer = await fs.promises.readFile(absolutePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Cache images aggressively for local performance
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving local image:', error);
    return new NextResponse('File not found or unreadable', { status: 404 });
  }
}
