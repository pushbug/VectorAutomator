import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const { keyword, competitors } = await req.json();

    if (!keyword || !competitors || !Array.isArray(competitors)) {
      return NextResponse.json({ error: "Missing keyword or competitors data" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in environment variables." },
        { status: 500 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `
    You are an expert microstock vector contributor and data analyst.
    A user wants to create vector graphics related to the keyword: "${keyword}".
    
    ${competitors.length > 0 ? 
      `Here are the titles of the top-ranking images on Adobe Stock right now:
      ${competitors.map((c: any, i: number) => `${i + 1}. ${c.title}`).join("\n")}
      
      Analyze these titles to understand the current trend, common themes, and what buyers are looking for.` : 
      `Analyze the current microstock trends for this keyword based on your vast knowledge.`}
    
    Then, create exactly 3 unique "Daily Briefing Concepts" for the user to draw today.
    The concepts should target high-demand patterns but also try to fill slight gaps in the market (e.g., using a dark mode theme, adding specific elements like 'isometric' or 'neon' if appropriate).
    
    Format your response EXACTLY as a JSON array of objects. Do not use markdown blocks.
    [
      {
        "concept": "Name of the concept (e.g., Infographic with Dark Mode Neon style)",
        "reason": "Why this will sell based on the competitor analysis",
        "keywords": ["10", "highly", "targeted", "keywords"]
      },
      ...
    ]
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Clean up potential markdown formatting from Gemini
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const briefingCards = JSON.parse(cleanJson);

    return NextResponse.json({ briefs: briefingCards });
  } catch (error: any) {
    console.error("AI Briefing Error:", error);
    return NextResponse.json(
      { error: "Failed to generate briefing", details: error.message },
      { status: 500 }
    );
  }
}
