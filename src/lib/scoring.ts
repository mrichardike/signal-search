import { SearchResult } from "./types";
import { SCORING_WEIGHTS, RECENCY_DECAY_LAMBDA, SOCIAL_SCORING } from "@/config/sources.config";

/**
 * Calculate hours since publication
 */
export function getHoursSincePublication(publishedAt: Date | null): number {
  if (!publishedAt) return 24 * 365; // Default to 1 year if no date
  const now = new Date();
  const diffMs = now.getTime() - publishedAt.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60));
}

/**
 * Calculate recency score using exponential decay
 * Score = e^(-λ * Δt) where Δt is hours since publication
 */
export function calculateRecencyScore(
  hoursSincePublication: number,
  isSocialSource: boolean = false
): number {
  const lambda = isSocialSource
    ? RECENCY_DECAY_LAMBDA * SOCIAL_SCORING.recencyDecayMultiplier
    : RECENCY_DECAY_LAMBDA;
  
  return Math.exp(-lambda * hoursSincePublication);
}

/**
 * Calculate engagement score using logarithmic scaling
 * Score = ln(engagement + 1)
 */
export function calculateEngagementScore(
  engagement: number,
  isSocialSource: boolean = false
): number {
  const score = Math.log(engagement + 1);
  
  if (isSocialSource) {
    return score * SOCIAL_SCORING.engagementBoostMultiplier;
  }
  
  return score;
}

/**
 * Normalize a score to 0-1 range using min-max normalization
 */
export function normalizeScore(score: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (score - min) / (max - min)));
}

/**
 * Calculate final score for a search result
 * Score = (Relevance × W_rel) + (e^(-λΔt) × W_rec) + (ln(Engagement+1) × W_eng)
 */
export function calculateFinalScore(
  result: SearchResult,
  allResults: SearchResult[]
): number {
  const isSocialSource = result.sourceType === "social";
  
  // Get hours since publication
  const hoursSincePub = getHoursSincePublication(result.publishedAt);
  
  // Calculate individual scores
  const recencyScore = calculateRecencyScore(hoursSincePub, isSocialSource);
  const engagementScore = calculateEngagementScore(result.engagement, isSocialSource);
  
  // Normalize relevance score (assume it's already 0-1 from API)
  const relevanceScore = result.relevanceScore;
  
  // Normalize engagement across all results
  const engagements = allResults.map(r => calculateEngagementScore(r.engagement, r.sourceType === "social"));
  const minEngagement = Math.min(...engagements);
  const maxEngagement = Math.max(...engagements);
  const normalizedEngagement = normalizeScore(engagementScore, minEngagement, maxEngagement);
  
  // Calculate weighted final score
  const finalScore =
    relevanceScore * SCORING_WEIGHTS.relevance +
    recencyScore * SCORING_WEIGHTS.recency +
    normalizedEngagement * SCORING_WEIGHTS.engagement;
  
  return Math.round(finalScore * 1000) / 1000; // Round to 3 decimal places
}

/**
 * Sort results by final score in descending order
 */
export function sortByScore(results: SearchResult[]): SearchResult[] {
  // Calculate scores for all results
  const resultsWithScores = results.map(result => ({
    ...result,
    calculatedScore: calculateFinalScore(result, results)
  }));
  
  // Sort by score descending
  resultsWithScores.sort((a, b) => b.calculatedScore - a.calculatedScore);
  
  // Return with updated finalScore
  return resultsWithScores.map(({ calculatedScore, ...rest }) => ({
    ...rest,
    finalScore: calculatedScore
  }));
}

/**
 * Get a human-readable recency label
 */
export function getRecencyLabel(publishedAt: Date | null): string {
  if (!publishedAt) return "Unknown";
  
  const hours = getHoursSincePublication(publishedAt);
  
  if (hours < 1) return "Just now";
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  if (hours < 48) return "Yesterday";
  if (hours < 168) return `${Math.floor(hours / 24)}d ago`;
  if (hours < 720) return `${Math.floor(hours / 168)}w ago`;
  return `${Math.floor(hours / 720)}mo ago`;
}

/**
 * Get engagement label based on type
 */
export function getEngagementLabel(result: SearchResult): string {
  switch (result.sourceType) {
    case "hackernews":
      return `${result.points ?? 0} pts`;
    case "reddit":
      return `${result.engagement} upvotes`;
    case "social":
      return `${result.engagement} likes`;
    default:
      return `${result.engagement} engagement`;
  }
}