"use client";

import { useState } from "react";
import { Brain, Search, Target, Palette, TrendingUp, AlertCircle, Copy, CheckCircle2 } from "lucide-react";

interface BriefCard {
  concept: string;
  reason: string;
  keywords: string[];
}

export default function BriefingPage() {
  const [keyword, setKeyword] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [briefs, setBriefs] = useState<BriefCard[]>([]);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generateBriefing = async () => {
    if (!keyword.trim()) return;
    
    setIsAnalyzing(true);
    setError("");
    setBriefs([]);
    
    try {
      // 1. Scrape Adobe Stock
      const scrapeRes = await fetch(`/api/scraper?q=${encodeURIComponent(keyword)}`);
      const scrapeData = await scrapeRes.json();
      
      if (!scrapeRes.ok) throw new Error(scrapeData.error || "Failed to scrape data");

      // 2. Send to Gemini AI Briefing
      const aiRes = await fetch("/api/ai/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          competitors: scrapeData.items
        })
      });
      
      const aiData = await aiRes.json();
      if (!aiRes.ok) throw new Error(aiData.error || "Failed to generate briefing");
      
      setBriefs(aiData.briefs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="mb-10 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4">
          <Brain className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-3">AI Daily Briefing</h1>
        <p className="text-muted max-w-xl mx-auto">
          Enter a broad keyword and let AI analyze the top-ranking competitors to give you 
          unique, high-conversion design concepts to draw today.
        </p>
      </header>

      {/* Search Section */}
      <div className="bg-surface border border-border p-6 rounded-2xl shadow-sm">
        <div className="flex gap-4 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-5 h-5" />
            <input 
              type="text" 
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generateBriefing()}
              placeholder="E.g., timeline, business infographic, milestone..."
              className="w-full bg-background border border-border rounded-xl pl-12 pr-4 py-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-lg"
            />
          </div>
          <button 
            onClick={generateBriefing}
            disabled={isAnalyzing || !keyword.trim()}
            className="bg-primary hover:bg-blue-700 text-primary-foreground px-8 py-4 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap text-lg shadow-sm"
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                วิเคราะห์เทรนด์...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                สร้างโจทย์วันนี้
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Results Section */}
      {briefs.length > 0 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Recommended Concepts
          </h2>
          
          <div className="grid gap-6">
            {briefs.map((brief, i) => (
              <div key={i} className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm hover:border-primary/50 transition-colors">
                <div className="border-b border-border p-6 bg-surface-hover">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-2 leading-tight">
                        {brief.concept}
                      </h3>
                      <p className="text-muted leading-relaxed">
                        {brief.reason}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Target className="w-4 h-4 text-orange-500" />
                      Target Keywords
                    </h4>
                    <button 
                      onClick={() => copyToClipboard(brief.keywords.join(", "), i)}
                      className="text-xs flex items-center gap-1.5 text-muted hover:text-primary transition-colors bg-background px-3 py-1.5 rounded-lg border border-border"
                    >
                      {copiedIndex === i ? (
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Copied!</span>
                      ) : (
                        <span className="flex items-center gap-1.5"><Copy className="w-3.5 h-3.5" /> Copy All</span>
                      )}
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {brief.keywords.map((kw, j) => (
                      <span 
                        key={j} 
                        className="px-3 py-1 bg-background border border-border text-foreground text-sm rounded-full"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
