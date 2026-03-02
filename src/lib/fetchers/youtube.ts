/**
 * YouTube Data API v3 fetcher
 * Fetches video metadata and transcriptions from YouTube
 */

import { RawSignal, SourceType } from "../types"

interface YouTubeSearchResult {
  kind: string
  etag: string
  id: {
    kind: string
    videoId: string
  }
  snippet: {
    publishedAt: string
    channelId: string
    title: string
    description: string
    thumbnails: {
      default: { url: string; width: number; height: number }
      medium: { url: string; width: number; height: number }
      high: { url: string; width: number; height: number }
    }
    channelTitle: string
  }
  statistics?: {
    viewCount: number
    likeCount: number
    commentCount: number
  }
}

interface YouTubeSearchResponse {
  kind: string
  etag: string
  nextPageToken: string
  items: YouTubeSearchResult[]
}

export async function fetchYouTube(
  query: string,
  maxResults: number = 10
): Promise<RawSignal[]> {
  const apiKey = process.env.YOUTUBE_API_KEY

  if (!apiKey) {
    console.warn("YouTube API key not configured, skipping YouTube fetch")
    return []
  }

  try {
    // Search for videos
    const searchUrl = new URL(
      "https://www.googleapis.com/youtube/v3/search"
    )
    searchUrl.searchParams.set("part", "snippet")
    searchUrl.searchParams.set("q", query)
    searchUrl.searchParams.set("type", "video")
    searchUrl.searchParams.set("maxResults", String(maxResults))
    searchUrl.searchParams.set("order", "relevance")
    searchUrl.searchParams.set("videoEmbeddable", "true")
    searchUrl.searchParams.set("key", apiKey)

    const searchResponse = await fetch(searchUrl.toString())

    if (!searchResponse.ok) {
      console.error(
        `YouTube search failed: ${searchResponse.status} ${searchResponse.statusText}`
      )
      return []
    }

    const searchData: YouTubeSearchResponse = await searchResponse.json()

    if (!searchData.items?.length) {
      return []
    }

    // Get video IDs for statistics
    const videoIds = searchData.items
      .map((item) => item.id.videoId)
      .filter(Boolean)
      .join(",")

    // Fetch video statistics
    const statsUrl = new URL(
      "https://www.googleapis.com/youtube/v3/videos"
    )
    statsUrl.searchParams.set("part", "statistics,contentDetails")
    statsUrl.searchParams.set("id", videoIds)
    statsUrl.searchParams.set("key", apiKey)

    const statsResponse = await fetch(statsUrl.toString())
    const statsData = await statsResponse.json()

    // Create a map of video ID to statistics
    const statsMap = new Map<
      string,
      { viewCount: number; likeCount: number; commentCount: number }
    >()
    
    if (statsData.items) {
      for (const item of statsData.items) {
        statsMap.set(item.id, {
          viewCount: parseInt(item.statistics.viewCount || "0", 10),
          likeCount: parseInt(item.statistics.likeCount || "0", 10),
          commentCount: parseInt(item.statistics.commentCount || "0", 10),
        })
      }
    }

    // Convert to RawSignals
    const signals: RawSignal[] = searchData.items.map((item) => {
      const stats = statsMap.get(item.id.videoId) || {
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
      }

      return {
        id: `youtube-${item.id.videoId}`,
        sourceType: "youtube" as SourceType,
        source: item.snippet.channelTitle,
        title: item.snippet.title,
        snippet: item.snippet.description.slice(0, 500),
        rawContent: item.snippet.description,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        publishedAt: new Date(item.snippet.publishedAt),
        engagement: stats.viewCount,
        points: stats.likeCount,
        comments: stats.commentCount,
        author: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      }
    })

    return signals
  } catch (error) {
    console.error("YouTube fetch error:", error)
    return []
  }
}