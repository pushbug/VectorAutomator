import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import { randomBytes } from "crypto";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const epsFile = formData.get("eps") as File;

    if (!epsFile) {
      return NextResponse.json({ error: "No EPS file provided" }, { status: 400 });
    }

    // Prepare temp dir
    const tempDir = path.join(process.cwd(), "tmp_uploads");
    await mkdir(tempDir, { recursive: true });

    // Save EPS locally
    const buffer = Buffer.from(await epsFile.arrayBuffer());
    const uniqueId = randomBytes(4).toString("hex");
    const safeBaseName = epsFile.name.replace(/[^a-zA-Z0-9.-]/g, "_").split(".")[0];
    
    const inputPath = path.join(tempDir, `${safeBaseName}_${uniqueId}.eps`);
    const outputPath = path.join(tempDir, `${safeBaseName}_${uniqueId}.jpg`);

    await writeFile(inputPath, buffer);

    // Run ImageMagick conversion
    // 1000x means width 1000px, height auto to maintain aspect ratio
    // -density 300 to ensure crisp rasterization of vector (300 DPI)
    const cmd = `magick -colorspace sRGB -density 300 "${inputPath}" -resize 1000x -quality 100 "${outputPath}"`;
    
    await execAsync(cmd);

    // Read the converted JPG
    const jpgBuffer = await readFile(outputPath);

    // Clean up temp files (fire and forget)
    unlink(inputPath).catch(console.error);
    unlink(outputPath).catch(console.error);

    // Return the image
    return new NextResponse(jpgBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": jpgBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error("Convert API Error:", error);
    return NextResponse.json(
      { error: "Failed to convert EPS", details: error.message },
      { status: 500 }
    );
  }
}
