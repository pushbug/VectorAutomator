import { NextRequest } from "next/server";
import { POST } from "@/app/api/file/convert/route";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock child_process and fs/promises
vi.mock("child_process", () => ({
  default: { exec: vi.fn((cmd, cb) => cb(null, { stdout: "", stderr: "" })) },
  exec: vi.fn((cmd, cb) => cb(null, { stdout: "", stderr: "" }))
}));

vi.mock("fs/promises", () => ({
  default: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(() => Buffer.from("mock-jpg-data")),
    unlink: vi.fn(() => Promise.resolve())
  },
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(() => Buffer.from("mock-jpg-data")),
  unlink: vi.fn(() => Promise.resolve())
}));

describe("POST /api/file/convert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 if no EPS file is provided", async () => {
    const formData = new FormData();
    const req = new NextRequest("http://localhost:3000/api/file/convert", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    
    const json = await res.json();
    expect(json.error).toBe("No EPS file provided");
  });

  it("returns 200 and image buffer on success", async () => {
    const formData = new FormData();
    const blob = new Blob(["mock eps data"], { type: "application/postscript" });
    formData.append("eps", blob, "test.eps");
    
    const req = new NextRequest("http://localhost:3000/api/file/convert", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    
    const buffer = await res.arrayBuffer();
    expect(Buffer.from(buffer).toString()).toBe("mock-jpg-data");
  });
});
