import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";

function streamToReadableStream(stream: any) {
  return new ReadableStream({
    start(controller) {
      stream.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      stream.on('end', () => controller.close());
      stream.on('error', (err: any) => controller.error(err));
    },
  });
}

export async function GET(req: NextRequest) {
  const relativePath = req.nextUrl.searchParams.get("path");
  if (!relativePath) return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });

  // Prevent path traversal attacks
  if (relativePath.includes("..") || relativePath.startsWith("/")) {
    return NextResponse.json({ error: "Invalid path format" }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "portfolio_archive", relativePath);

  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) throw new Error("Not a file");
    
    const stream = createReadStream(filePath);
    const webStream = streamToReadableStream(stream);
    
    const filename = path.basename(filePath);
    return new NextResponse(webStream as any, {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/octet-stream",
        "Content-Length": stats.size.toString(),
      },
    });
  } catch (err: any) {
    console.error("Download Error:", err);
    return NextResponse.json({ error: "File not found or cannot be read", details: err.message }, { status: 404 });
  }
}
