export const SEARCH_SOURCES = {
  exaDomains: [
    "simonwillison.net",
    "latent.space",
    "anthropic.com/news",
    "openai.com/blog",
    "deepmind.com/blog",
    "ai.googleblog.com",
    "huggingface.co/blog",
    "blog.cohere.com",
    "scale.com/blog",
    "mistral.ai/news",
    "stability.ai/news",
    "inflection.ai/news",
    "character.ai/blog",
    "smol.ai",
    "thezvi.wordpress.com",
    "bigtechnology.com",
    "stratechery.com",
    "bensmith.substack.com",
    "garymarcus.substack.com",
  ],
  subreddits: ["LocalLLM", "MachineLearning", "ArtificialInteligence", "OpenAI", "ChatGPT", "ClaudeAI"],
  youtubeChannels: [
    "UCv83tO5ceSyJDSZL", // Example - AI Explained
    "UCSHZKyawb77iyD7pPg4xNVg", // Andrej Karpathy
    "UC9HBaENPPw44Ym7L8P6eKAQ", // Redpoint Ventures
    "UCsBK2objvKWOmRgdZK-bevg", // Cognitive Revolution
    "UC0s7HV4GF-8ly1Nu3TOo4Vg", // Yannic Kilcher
    "UCL5EUbZTHLoE1vlwUmcJf7g", // Two Minute Papers
  ],
  hackerNews: {
    minPoints: 50,
    maxAgeDays: 90,
  },
} as const;

export type SourceHandler = "transcriber" | "deep-text" | "social" | "community";

export interface SourceConfig {
  type: SourceHandler;
  sources: string[];
  tooling: string;
}

export const SOURCE_HANDLERS: Record<SourceHandler, SourceConfig> = {
  transcriber: {
    type: "transcriber",
    sources: ["YouTube Channels (Redpoint, AI Explained, etc.)"],
    tooling: "youtube-transcript-api",
  },
  "deep-text": {
    type: "deep-text",
    sources: ["Simon Willison", "The Zvi", "Smol.ai", "Big Technology"],
    tooling: "Exa API (Text Mode)",
  },
  social: {
    type: "social",
    sources: ["X.com / Following"],
    tooling: "SocialData.tools API",
  },
  community: {
    type: "community",
    sources: ["Hacker News", "Reddit"],
    tooling: "Algolia HN API / Reddit API",
  },
};

// Scoring weights
export const SCORING_WEIGHTS = {
  relevance: 0.4, // W_rel
  recency: 0.4, // W_rec (high for AI news)
  engagement: 0.2, // W_eng
} as const;

// Recency decay lambda (higher = faster decay)
export const RECENCY_DECAY_LAMBDA = 0.01; // per hour

// Social-specific scoring adjustments
export const SOCIAL_SCORING = {
  recencyDecayMultiplier: 1.5, // Social content decays faster
  engagementBoostMultiplier: 1.3, // But viral content gets more boost
} as const;