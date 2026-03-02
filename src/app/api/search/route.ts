import { NextRequest, NextResponse } from "next/server";
import { searchExa } from "@/lib/fetchers/exa";
import { searchHackerNews, searchHackerNewsByDate } from "@/lib/fetchers/hackernews";
import { searchReddit } from "@/lib/fetchers/reddit";
import { fetchYouTube } from "@/lib/fetchers/youtube";
import { fetchSocial } from "@/lib/fetchers/social";
import { synthesizeWithOpenRouterStream } from "@/lib/openrouter";
import { sortByScore } from "@/lib/scoring";
import { SearchResult, RawSignal } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SearchBody {
  query: string;
  sources?: {
    exa?: boolean;
    hackerNews?: boolean;
    reddit?: boolean;
    youtube?: boolean;
    social?: boolean;
  };
  maxResults?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchBody = await request.json();
    const { query, sources, maxResults = 10 } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Get API keys from environment
    const exaApiKey = process.env.EXA_API_KEY;
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;

    // Default all sources to true if not specified
    const enabledSources = {
      exa: sources?.exa !== false,
      hackerNews: sources?.hackerNews !== false,
      reddit: sources?.reddit !== false,
      youtube: sources?.youtube === true, // YouTube requires extra setup
      social: sources?.social === true, // Social requires extra setup
    };

    // Concurrent fan-out to all sources
    const searchPromises: Promise<SearchResult[] | RawSignal[]>[] = [];

    if (enabledSources.exa && exaApiKey) {
      searchPromises.push(searchExa(query, exaApiKey, maxResults));
    }

    if (enabledSources.hackerNews) {
      searchPromises.push(searchHackerNews(query, maxResults));
      searchPromises.push(searchHackerNewsByDate(query, Math.ceil(maxResults / 2)));
    }

    if (enabledSources.reddit) {
      searchPromises.push(searchReddit(query, maxResults));
    }

    if (enabledSources.youtube) {
      searchPromises.push(fetchYouTube(query, maxResults));
    }

    if (enabledSources.social) {
      searchPromises.push(fetchSocial(query, maxResults));
    }

    // Wait for all searches with Promise.allSettled
    const results = await Promise.allSettled(searchPromises);

    // Helper to convert RawSignal to SearchResult
    const toSearchResult = (signal: RawSignal): SearchResult => ({
      ...signal,
      relevanceScore: 0.5, // Default, will be updated by sortByScore
      finalScore: 0, // Will be calculated by sortByScore
    });

    // Collect successful results
    const allResults: SearchResult[] = [];
    for (const result of results) {
      if (result.status === "fulfilled" && Array.isArray(result.value)) {
        const items = result.value.map((item) => 
          'relevanceScore' in item ? item : toSearchResult(item)
        );
        allResults.push(...items);
      }
    }

    // Deduplicate by URL
    const seenUrls = new Set<string>();
    const uniqueResults = allResults.filter((result) => {
      if (seenUrls.has(result.url)) {
        return false;
      }
      seenUrls.add(result.url);
      return true;
    });

    // Sort by custom scoring algorithm
    const scoredResults = sortByScore(uniqueResults);
    const topResults = scoredResults.slice(0, maxResults);

    // If no OpenRouter API key, return results without synthesis
    if (!openRouterApiKey) {
      return NextResponse.json({
        results: topResults,
        synthesis: "OpenRouter API key not configured. Results returned without synthesis.",
        query,
        timestamp: new Date(),
        totalResults: uniqueResults.length,
      });
    }

    // Return streaming response for synthesis
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // First, send the results as JSON
        const resultsPayload = {
          type: "results",
          data: topResults,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(resultsPayload)}\n\n`));

        // Then stream the synthesis
        try {
          for await (const chunk of synthesizeWithOpenRouterStream(
            topResults,
            query,
            openRouterApiKey
          )) {
            const synthesisPayload = {
              type: "synthesis",
              data: chunk,
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(synthesisPayload)}\n\n`)
            );
          }

          // Send completion signal
          const completePayload = {
            type: "complete",
            data: {
              query,
              timestamp: new Date(),
              totalResults: uniqueResults.length,
            },
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(completePayload)}\n\n`));
          controller.close();
        } catch (error) {
          const errorPayload = {
            type: "error",
            data: error instanceof Error ? error.message : "Synthesis failed",
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorPayload)}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Non-streaming endpoint for simple queries
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const maxResults = parseInt(searchParams.get("maxResults") || "10", 10);

  if (!query) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  // Get API keys from environment
  const exaApiKey = process.env.EXA_API_KEY;

  // Concurrent fan-out to all sources
  const searchPromises: Promise<SearchResult[]>[] = [];

  if (exaApiKey) {
    searchPromises.push(searchExa(query, exaApiKey, maxResults));
  }

  searchPromises.push(searchHackerNews(query, maxResults));
  searchPromises.push(searchReddit(query, maxResults));

  const results = await Promise.allSettled(searchPromises);

  const allResults: SearchResult[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      allResults.push(...result.value);
    }
  }

  const seenUrls = new Set<string>();
  const uniqueResults = allResults.filter((result) => {
    if (seenUrls.has(result.url)) {
      return false;
    }
    seenUrls.add(result.url);
    return true;
  });

  const scoredResults = sortByScore(uniqueResults);
  const topResults = scoredResults.slice(0, maxResults);

  return NextResponse.json({
    results: topResults,
    query,
    timestamp: new Date(),
    totalResults: uniqueResults.length,
  });
}