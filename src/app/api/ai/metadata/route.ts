import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get("image") as File;
    const additionalKeywords = formData.get("keywords") as string;

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const imageBuffer = await image.arrayBuffer();
    const base64Data = Buffer.from(imageBuffer).toString("base64");

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `
      You are an expert microstock contributor specializing in vector illustrations and infographics.
      Analyze the attached image and generate a highly converting Title and Keywords for Adobe Stock and Shutterstock.
      
      Requirements:
      1. Title: Descriptive, max 200 characters.
      2. Keywords: Exactly 50 words, comma-separated. The first 5 words must be the most relevant and important.
      3. ${additionalKeywords ? `Make sure to incorporate or be inspired by these competitor keywords: ${additionalKeywords}` : "Include relevant niche keywords for infographics and business concepts."}
      
      Respond strictly in JSON format:
      {
        "title": "...",
        "keywords": "..."
      }
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: image.type,
        },
      },
    ]);

    const text = result.response.text();
    // Safely parse JSON from markdown code block if present
    const jsonMatch = text.match(/```(?:json)?([\s\S]*?)```/) || [null, text];
    const jsonStr = jsonMatch[1].trim();
    
    const parsed = JSON.parse(jsonStr);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate metadata", details: error.message },
      { status: 500 }
    );
  }
}
