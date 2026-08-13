import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const keyword = searchParams.get("q");

  if (!keyword) {
    return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
  }

  try {
    const encodedKeyword = encodeURIComponent(keyword);
    // Use Adobe Stock as the primary source for scraping
    const url = `https://stock.adobe.com/search?k=${encodedKeyword}`;
    
    // Set headers to mimic a real browser to avoid basic bot blocks
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      console.warn(`Scraper got ${response.status} from Adobe Stock. Cloudflare block likely. Falling back to Gemini knowledge.`);
      return NextResponse.json({
        query: keyword,
        source: "Adobe Stock",
        items: [] // Empty items will force Gemini to use its own knowledge
      });
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const results: any[] = [];
    
    // Adobe Stock typically uses specific class names for results, this is a best-effort extraction
    // based on typical microstock DOM structures.
    $("[data-t='search-result-asset']").each((i, el) => {
      if (i >= 10) return false; // Get top 10 only
      
      const title = $(el).find("meta[itemprop='name']").attr("content") || 
                    $(el).find("img").attr("alt") || 
                    $(el).attr("data-title") ||
                    "Untitled";
                    
      const id = $(el).attr("data-content-id") || "";
      
      results.push({
        id,
        title,
        rank: i + 1
      });
    });

    // Fallback if specific attributes fail (e.g., site structure changed)
    if (results.length === 0) {
      $("img").each((i, el) => {
        if (i >= 15) return false;
        const alt = $(el).attr("alt");
        if (alt && alt.length > 10) {
          results.push({
            id: `img_${i}`,
            title: alt,
            rank: results.length + 1
          });
        }
      });
    }

    return NextResponse.json({
      query: keyword,
      source: "Adobe Stock",
      items: results.slice(0, 10)
    });
  } catch (error: any) {
    console.error("Scraper API Error:", error);
    return NextResponse.json(
      { error: "Failed to scrape data", details: error.message },
      { status: 500 }
    );
  }
}
