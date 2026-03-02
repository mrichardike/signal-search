"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface SynthesisPanelProps {
  synthesis: string
  isLoading: boolean
  className?: string
}

export function SynthesisPanel({ synthesis, isLoading, className }: SynthesisPanelProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          AI Synthesis
          {isLoading && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && !synthesis ? (
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded animate-pulse w-full" />
            <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
            <div className="h-4 bg-muted rounded animate-pulse w-4/6" />
            <div className="h-4 bg-muted rounded animate-pulse w-full" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {synthesis.split("\n").map((line, i) => {
              // Handle headers
              if (line.startsWith("### ")) {
                return (
                  <h3 key={i} className="text-base font-semibold mt-4 mb-2 text-foreground">
                    {line.replace("### ", "")}
                  </h3>
                )
              }
              if (line.startsWith("## ")) {
                return (
                  <h2 key={i} className="text-lg font-semibold mt-4 mb-2 text-foreground">
                    {line.replace("## ", "")}
                  </h2>
                )
              }
              // Handle bullet points
              if (line.startsWith("- ")) {
                return (
                  <li key={i} className="text-sm text-muted-foreground ml-4">
                    <RenderMarkdown text={line.replace("- ", "")} />
                  </li>
                )
              }
              // Handle numbered lists
              if (/^\d+\.\s/.test(line)) {
                return (
                  <li key={i} className="text-sm text-muted-foreground ml-4 list-decimal">
                    <RenderMarkdown text={line.replace(/^\d+\.\s/, "")} />
                  </li>
                )
              }
              // Handle empty lines
              if (!line.trim()) {
                return <div key={i} className="h-2" />
              }
              // Regular paragraph
              return (
                <p key={i} className="text-sm text-muted-foreground mb-2">
                  <RenderMarkdown text={line} />
                </p>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Helper component to render inline markdown
function RenderMarkdown({ text }: { text: string }) {
  // Handle bold text **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </strong>
          )
        }
        // Handle citations [N]
        const citationParts = part.split(/(\[\d+\])/g)
        return citationParts.map((cite, j) => {
          if (/^\[\d+\]$/.test(cite)) {
            return (
              <sup key={`${i}-${j}`} className="text-primary font-medium cursor-pointer hover:underline">
                {cite}
              </sup>
            )
          }
          return <span key={`${i}-${j}`}>{cite}</span>
        })
      })}
    </>
  )
}