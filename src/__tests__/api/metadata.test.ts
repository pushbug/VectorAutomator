import { NextRequest } from "next/server";
import { POST } from "@/app/api/ai/metadata/route";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @google/generative-ai
vi.mock("@google/generative-ai", () => {
  const mockGenerateContent = vi.fn().mockResolvedValue({
    response: {
      text: () => JSON.stringify({
        title: "Mock Title",
        keywords: "mock, keywords, here"
      })
    }
  });

  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContent: mockGenerateContent
        };
      }
    }
  };
});

describe("POST /api/ai/metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 if no image is provided", async () => {
    const formData = new FormData();
    const req = new NextRequest("http://localhost:3000/api/ai/metadata", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    
    const json = await res.json();
    expect(json.error).toBe("No image provided");
  });

  it("returns parsed JSON from Gemini", async () => {
    const formData = new FormData();
    const blob = new Blob(["mock img data"], { type: "image/jpeg" });
    formData.append("image", blob, "test.jpg");
    
    const req = new NextRequest("http://localhost:3000/api/ai/metadata", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    
    const json = await res.json();
    expect(json.title).toBe("Mock Title");
    expect(json.keywords).toBe("mock, keywords, here");
  });
});
