"use client"

import * as React from "react"
import { SearchBar } from "@/components/SearchBar"
import { SourceFilter, type SourceFilters } from "@/components/SourceFilter"
import { ResultCard } from "@/components/ResultCard"
import { SynthesisPanel } from "@/components/SynthesisPanel"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SearchResult } from "@/lib/types"

export default function HomePage() {
  const [isLoading, setIsLoading] = React.useState(false)
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [synthesis, setSynthesis] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState("")

  const [filters, setFilters] = React.useState<SourceFilters>({
    exa: true,
    hackerNews: true,
    reddit: true,
    youtube: false,
    social: false,
  })

  const handleSearch = async (searchQuery: string) => {
    setIsLoading(true)
    setError(null)
    setResults([])
    setSynthesis("")
    setQuery(searchQuery)

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchQuery,
          sources: filters,
          maxResults: 10,
        }),
      })

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`)
      }

      // Check if response is a stream
      const contentType = response.headers.get("content-type")
      if (contentType?.includes("text/event-stream")) {
        // Handle streaming response
        const reader = response.body?.getReader()
        if (!reader) throw new Error("No reader available")

        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            const trimmedLine = line.trim()
            if (trimmedLine.startsWith("data: ")) {
              try {
                const data = JSON.parse(trimmedLine.slice(6))
                
                switch (data.type) {
                  case "results":
                    setResults(data.data)
                    break
                  case "synthesis":
                    setSynthesis((prev) => prev + data.data)
                    break
                  case "complete":
                    setIsLoading(false)
                    break
                  case "error":
                    setError(data.data)
                    setIsLoading(false)
                    break
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      } else {
        // Handle JSON response (non-streaming fallback)
        const data = await response.json()
        setResults(data.results || [])
        setSynthesis(data.synthesis || "")
        setIsLoading(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setIsLoading(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="container max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-foreground">
                SignalSearch
              </h1>
              <p className="text-sm text-muted-foreground">
                High-signal AI/ML search aggregator
              </p>
            </div>
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
            <div className="mt-3">
              <SourceFilter filters={filters} onFilterChange={setFilters} />
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="container max-w-7xl mx-auto px-4 py-6">
          {/* Error display */}
          {error && (
            <div className="mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && results.length === 0 && !synthesis && (
            <div className="text-center py-12">
              <div className="text-muted-foreground text-lg mb-2">
                Search for AI/ML topics
              </div>
              <p className="text-sm text-muted-foreground">
                Try queries like "RAG improvements", "LLM benchmarks", or "new model releases"
              </p>
            </div>
          )}

          {/* Dual-pane view */}
          {(results.length > 0 || synthesis || isLoading) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column: Synthesis */}
              <div className="lg:sticky lg:top-[180px] lg:self-start">
                <SynthesisPanel synthesis={synthesis} isLoading={isLoading} />
              </div>

              {/* Right column: Raw signals */}
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground mb-3">
                  Raw Signals {results.length > 0 && `(${results.length} results)`}
                </h2>
                {results.length === 0 && isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="h-24 rounded-xl bg-muted animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  results.map((result, index) => (
                    <ResultCard key={result.id} result={result} index={index} />
                  ))
                )}
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-border mt-12">
          <div className="container max-w-7xl mx-auto px-4 py-6">
            <p className="text-xs text-muted-foreground text-center">
              SignalSearch — Aggregating high-signal AI/ML sources with Claude-powered synthesis
            </p>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}