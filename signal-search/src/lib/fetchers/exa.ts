import { SearchResult, ExaSearchResult } from "../types";
import { SEARCH_SOURCES } from "@/config/sources.config";

const EXA_API_URL = "https://api.exa.ai/search";

export async function searchExa(
  query: string,
  apiKey: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  if (!apiKey) {
    console.warn("Exa API key not configured, skipping Exa search");
    return [];
  }

  try {
    const response = await fetch(EXA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        query,
        numResults: maxResults,
        useAutoprompt: true,
        type: "auto",
        contents: {
          text: {
            maxCharacters: 2000,
          },
        },
        includeDomains: SEARCH_SOURCES.exaDomains,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Exa API error: ${response.status} - ${errorText}`);
      return [];
    }

    const data = await response.json();
    
    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((result: ExaSearchResult, index: number) => ({
      id: `exa-${index}-${Date.now()}`,
      title: result.title || "Untitled",
      url: result.url,
      snippet: result.text?.slice(0, 300) || "",
      source: new URL(result.url).hostname,
      sourceType: "exa" as const,
      publishedAt: result.publishedDate ? new Date(result.publishedDate) : null,
      engagement: 0, // Exa doesn't provide engagement metrics
      relevanceScore: result.score || 0.5,
      finalScore: 0,
      rawContent: result.text,
      author: result.author,
    }));
  } catch (error) {
    console.error("Exa search error:", error);
    return [];
  }
}