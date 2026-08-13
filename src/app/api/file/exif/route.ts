import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { mkdir, writeFile } from "fs/promises";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const epsFile = formData.get("eps") as File;
    const jpgFile = formData.get("jpg") as File;
    const title = formData.get("title") as string;
    const keywords = formData.get("keywords") as string;

    if (!epsFile && !jpgFile) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Set up temp directory
    const tempDir = path.join(process.cwd(), "tmp_uploads");
    await mkdir(tempDir, { recursive: true });

    const safeTitleName = title
      ? title
          .replace(/[^a-zA-Z0-9\s-]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 240)
      : "untitled";

    const processFile = async (file: File) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = path.extname(file.name);
      
      // Use the exact title for the filename, no original filename mixed in
      const safeFilename = `${safeTitleName}${ext}`;
      
      const filePath = path.join(tempDir, safeFilename);
      await writeFile(filePath, buffer);

      // Construct ExifTool command
      // -Title="title" -Description="title" -Subject="keywords" -Keywords="keywords"
      const exifCmd = `exiftool -overwrite_original -Title="${title}" -Description="${title}" -Subject="${keywords}" -Keywords="${keywords}" "${filePath}"`;
      
      try {
        await execAsync(exifCmd);
        return { success: true, filePath, filename: safeFilename };
      } catch (err: any) {
        console.error(`ExifTool error on ${file.name}:`, err);
        return { success: false, error: err.message };
      }
    };

    const results = [];
    if (epsFile) results.push(await processFile(epsFile));
    if (jpgFile) results.push(await processFile(jpgFile));

    // Wait, ideally we move the files to Year > Month > Date folder after processing
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const archiveDir = path.join(process.cwd(), "portfolio_archive", year, month, `${year}${month}${day}`);
    
    await mkdir(archiveDir, { recursive: true });

    const archivedFiles = [];
    const errors = [];
    for (const res of results) {
      if (res.success && res.filePath) {
        const destPath = path.join(archiveDir, res.filename);
        fs.renameSync(res.filePath, destPath);
        
        // Return a relative path to the client instead of the absolute local path
        const relativePath = path.join(year, month, `${year}${month}${day}`, res.filename);
        archivedFiles.push(relativePath);
      } else if (res.error) {
        errors.push(res.error);
      }
    }

    if (archivedFiles.length === 0) {
      return NextResponse.json({ error: "Failed to embed metadata in any files", details: errors.join(", ") }, { status: 500 });
    }

    return NextResponse.json({
      message: "Metadata embedded successfully",
      archivedFiles,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error("Exif API Error:", error);
    return NextResponse.json(
      { error: "Failed to embed metadata", details: error.message },
      { status: 500 }
    );
  }
}
