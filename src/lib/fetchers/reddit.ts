import { SearchResult, RedditSearchResult } from "../types";
import { SEARCH_SOURCES } from "@/config/sources.config";

const REDDIT_API = "https://www.reddit.com";

export async function searchReddit(
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  try {
    const subreddits = SEARCH_SOURCES.subreddits;
    const allResults: SearchResult[] = [];

    // Search across configured subreddits
    for (const subreddit of subreddits.slice(0, 3)) { // Limit to 3 subreddits to avoid rate limiting
      try {
        const searchUrl = new URL(`${REDDIT_API}/r/${subreddit}/search.json`);
        searchUrl.searchParams.set("q", query);
        searchUrl.searchParams.set("restrict_sr", "1");
        searchUrl.searchParams.set("sort", "relevance");
        searchUrl.searchParams.set("limit", String(Math.ceil(maxResults / 3)));
        searchUrl.searchParams.set("t", "month"); // Past month

        const response = await fetch(searchUrl.toString(), {
          headers: {
            "User-Agent": "SignalSearch/1.0",
          },
        });

        if (!response.ok) {
          console.warn(`Reddit API error for r/${subreddit}: ${response.status}`);
          continue;
        }

        const data = await response.json();

        if (data.data?.children && Array.isArray(data.data.children)) {
          const results = data.data.children
            .map((child: { data: RedditSearchResult }) => child.data)
            .filter((post: RedditSearchResult) => post.title)
            .map((post: RedditSearchResult) => ({
              id: `reddit-${post.id}`,
              title: post.title,
              url: post.url.startsWith("/r/")
                ? `https://reddit.com${post.permalink}`
                : post.url,
              snippet: post.selftext?.slice(0, 300) || "",
              source: `r/${post.subreddit}`,
              sourceType: "reddit" as const,
              publishedAt: new Date(post.created_utc * 1000),
              engagement: post.score + post.num_comments * 3,
              relevanceScore: Math.min(post.score / 1000, 1),
              finalScore: 0,
              author: post.author,
              points: post.score,
              comments: post.num_comments,
            }));

          allResults.push(...results);
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (subredditError) {
        console.warn(`Error searching r/${subreddit}:`, subredditError);
      }
    }

    // Sort by engagement and return top results
    return allResults
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, maxResults);
  } catch (error) {
    console.error("Reddit search error:", error);
    return [];
  }
}

export async function getRedditPostComments(
  subreddit: string,
  postId: string,
  maxComments: number = 5
): Promise<string[]> {
  try {
    const url = `${REDDIT_API}/r/${subreddit}/comments/${postId}.json?limit=${maxComments}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "SignalSearch/1.0",
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    
    if (Array.isArray(data) && data[1]?.data?.children) {
      return data[1].data.children
        .filter((child: { kind: string }) => child.kind === "t1")
        .map((child: { data: { body: string } }) => child.data.body)
        .filter((body: string) => body && body.length > 10)
        .slice(0, maxComments);
    }

    return [];
  } catch (error) {
    console.error("Error fetching Reddit comments:", error);
    return [];
  }
}