PRD: SignalSearch (Next.js + OpenRouter)Objective: A high-speed, web-based search aggregator that pulls from curated, high-signal sources and synthesizes a "recency-first" summary.

1. Core Tech StackFramework: Next.js 14+ (App Router).Language: TypeScript (Strict).Styling: Tailwind CSS + Shadcn/UI.LLM Gateway: OpenRouter API (Claude 3.5 Sonnet as default).Search Engine: Exa AI (Neural search for specific domains/blogs).API Client: Standard fetch (avoiding heavy SDKs where possible to keep agent context clean).

2. Source Configuration (sources.config.ts)The agent must use a centralized configuration file to manage your whitelists.TypeScriptexport const SEARCH_SOURCES = {
  exaDomains: [
    "simonwillison.net",
    "latent.space",
    "anthropic.com/news",
    "openai.com/blog",
    // Add more here
  ],
  subreddits: ["LocalLLM", "MachineLearning", "ArtificialInteligence"],
  youtubeChannels: [
    "UCv83tO5ceSyJDSZL", // Example ID
  ],
  hackerNews: {
    minPoints: 50,
    maxAgeDays: 90
  }
};
3. The Backend: POST /api/searchThe backend must handle concurrent requests and apply a custom ranking algorithm.A. Concurrent Fan-outUse Promise.allSettled to fetch from Exa, Algolia (HN), and Reddit. This ensures that one slow API doesn't hang the entire request.B. Scoring LogicNormalize all results to a 0–1 score based on relevance, then apply a decay function for recency and a logarithmic boost for engagement.$$Score = (Relevance \cdot W_{rel}) + (e^{-\lambda \Delta t} \cdot W_{rec}) + (\ln(Engagement + 1) \cdot W_{eng})$$$\Delta t$: Hours since publication.$W_{rec}$: Weight for recency (set this high for your AI workscape needs).C. OpenRouter SynthesisPass the top 10 results to OpenRouter with a strict system prompt:"Summarize the following search results for a Head of Product. Prioritize technical novelty, architectural decisions, and recency. Ignore SEO-laden 'Ultimate Guide' content. Use Markdown with inline citations."

4. UI/UX: The "Arc-Optimized" DashboardSince you use the Arc browser, the UI should be designed to live in a pinned tab or a split-view.Global Command Bar: A centered input (like Cmd+K) that stays fixed.Dual-Pane View:Left Column (Synthesis): The OpenRouter response, streaming in real-time.Right Column (Raw Signal): A scannable list of the 10 sources used, sorted by your custom score, with "Recency" and "Engagement" badges.Source Filters: Simple toggles to enable/disable HN, Reddit, or Blogs on the fly.

5. Development Directives for AntigravityStep 1: Scaffolding"Initialize a Next.js App Router project with Tailwind and Shadcn. Create a lib/ directory for API logic and a components/ directory for the UI."Step 2: API Integration"Implement a SearchOrchestrator in app/api/search/route.ts. Use fetch to query Exa AI and Algolia. Implement the scoring function to rank results by recency and engagement."Step 3: OpenRouter Integration"Connect to OpenRouter using the fetch API. Stream the response using a Server-Sent Events (SSE) pattern so the UI updates as Claude thinks."Step 4: UI Polish"Build a clean, dark-mode dashboard using Shadcn. Ensure the layout is responsive and scannable for high-density information."

6. Multimedia Content Extraction (The YouTube/Podcast Pivot)Standard web scraping will only see metadata for ~60% of your sources. The system must now ingest the actual spoken content.Requirement: Integrate a YouTube Transcript Worker. Before passing a YouTube URL to the LLM, the orchestrator must attempt to fetch the .srt or plain text transcript.Fallback: If no manual transcript exists, the system should use the YouTube description and top comments as a secondary signal.Podcast Logic: For Latent Space and Cognitive Revolution, the system must prioritize their official "Transcript" pages (via Exa's text search mode) rather than just the landing page.

7. Specialized Social Ingestion (The X/Twitter Gap)Standard fetch will fail on X.com following lists.Requirement: Implement a dedicated Social Scraper Module. Use a third-party wrapper (e.g., SocialData.tools or a lightweight Apify actor) to pull the last 20 tweets/replies from x.com/mrichardike/following.Scoring Weight: X-returns should have a higher Recency Decay (penalty grows faster) but a higher Engagement Boost to capture viral technical breakthroughs

8. "Density Extraction" Synthesis (OpenRouter Prompting)Generic summarization will destroy the value of sources like The Zvi or Simon Willison.Requirement: The OpenRouter System Prompt must be strictly defined to prevent "Abbreviation Bias."Instruction Set:Pattern Recognition: Identify specific code libraries, CLI tools, or model weights mentioned.Architectural Mapping: Extract system design decisions (e.g., "Used Qdrant for vector storage because...").No Fluff Rule: Explicitly forbid phrases like "In this video..." or "The author discusses...". Start directly with the technical insight.

9. Categorized Source Mapping (sources.config.ts)The orchestrator must route queries to different "Handlers" based on the source type to ensure the correct extraction method is used.Handler TypeSourcesToolingTranscriberYouTube Channels (Redpoint, AI Explained, etc.)youtube-transcript-apiDeep-TextSimon Willison, The Zvi, Smol.ai, Big TechnologyExa API (Text Mode)SocialX.com / FollowingSocialData.tools APICommunityHacker NewsAlgolia HN API5. UI Requirement: "Source Context" TooltipsBecause your sources are high-authority, the UI must allow you to verify the context of a summary.Requirement: Each cited insight in the AI Synthesis must have a hover-state that shows the Raw Snippet or Transcript Segment it was derived from. This prevents "hallucinated technicalities" by allowing instant verification.