import { SearchResult, HNSearchResult } from "../types";
import { SEARCH_SOURCES } from "@/config/sources.config";

const HN_ALGOLIA_API = "https://hn.algolia.com/api/v1";

export async function searchHackerNews(
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  try {
    const { minPoints, maxAgeDays } = SEARCH_SOURCES.hackerNews;
    const minTimestamp = Math.floor(
      (Date.now() - maxAgeDays * 24 * 60 * 60 * 1000) / 1000
    );

    // Search both stories and posts
    const searchUrl = new URL(`${HN_ALGOLIA_API}/search`);
    searchUrl.searchParams.set("query", query);
    searchUrl.searchParams.set("tags", "story");
    searchUrl.searchParams.set("hitsPerPage", String(maxResults));
    searchUrl.searchParams.set("numericFilters", `points>=${minPoints},created_at_i>=${minTimestamp}`);

    const response = await fetch(searchUrl.toString());

    if (!response.ok) {
      console.error(`HN API error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.hits || !Array.isArray(data.hits)) {
      return [];
    }

    return data.hits
      .filter((hit: HNSearchResult) => hit.title && hit.url)
      .map((hit: HNSearchResult, index: number) => ({
        id: `hn-${hit.objectID}`,
        title: hit.title,
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        snippet: hit.story_text?.slice(0, 300) || "",
        source: "Hacker News",
        sourceType: "hackernews" as const,
        publishedAt: hit.created_at ? new Date(hit.created_at) : null,
        engagement: hit.points + hit.num_comments * 2, // Weight comments more
        relevanceScore: Math.min(hit.points / 500, 1), // Normalize points to 0-1
        finalScore: 0,
        author: hit.author,
        points: hit.points,
        comments: hit.num_comments,
      }));
  } catch (error) {
    console.error("Hacker News search error:", error);
    return [];
  }
}

export async function searchHackerNewsByDate(
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  try {
    const { minPoints, maxAgeDays } = SEARCH_SOURCES.hackerNews;
    const minTimestamp = Math.floor(
      (Date.now() - maxAgeDays * 24 * 60 * 60 * 1000) / 1000
    );

    // Search by date (recency) instead of relevance
    const searchUrl = new URL(`${HN_ALGOLIA_API}/search_by_date`);
    searchUrl.searchParams.set("query", query);
    searchUrl.searchParams.set("tags", "story");
    searchUrl.searchParams.set("hitsPerPage", String(maxResults));
    searchUrl.searchParams.set("numericFilters", `points>=${minPoints},created_at_i>=${minTimestamp}`);

    const response = await fetch(searchUrl.toString());

    if (!response.ok) {
      console.error(`HN API error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.hits || !Array.isArray(data.hits)) {
      return [];
    }

    return data.hits
      .filter((hit: HNSearchResult) => hit.title && hit.url)
      .map((hit: HNSearchResult, index: number) => ({
        id: `hn-${hit.objectID}`,
        title: hit.title,
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        snippet: hit.story_text?.slice(0, 300) || "",
        source: "Hacker News",
        sourceType: "hackernews" as const,
        publishedAt: hit.created_at ? new Date(hit.created_at) : null,
        engagement: hit.points + hit.num_comments * 2,
        relevanceScore: Math.min(hit.points / 500, 1),
        finalScore: 0,
        author: hit.author,
        points: hit.points,
        comments: hit.num_comments,
      }));
  } catch (error) {
    console.error("Hacker News search error:", error);
    return [];
  }
}