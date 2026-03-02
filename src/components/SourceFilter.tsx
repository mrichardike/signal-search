"use client"

import * as React from "react"
import { Globe, MessageSquare, Newspaper, Youtube, Twitter } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export interface SourceFilters {
  exa: boolean
  hackerNews: boolean
  reddit: boolean
  youtube: boolean
  social: boolean
}

interface SourceFilterProps {
  filters: SourceFilters
  onFilterChange: (filters: SourceFilters) => void
}

const sources = [
  { id: "exa" as const, label: "Blogs", icon: Globe },
  { id: "hackerNews" as const, label: "HN", icon: Newspaper },
  { id: "reddit" as const, label: "Reddit", icon: MessageSquare },
  { id: "youtube" as const, label: "YouTube", icon: Youtube },
  { id: "social" as const, label: "X/Twitter", icon: Twitter },
] as const

export function SourceFilter({ filters, onFilterChange }: SourceFilterProps) {
  // Get active source IDs as array for ToggleGroup value
  const activeSources = sources
    .filter(({ id }) => filters[id])
    .map(({ id }) => id)

  const handleValueChange = (value: string[]) => {
    const newFilters: SourceFilters = {
      exa: false,
      hackerNews: false,
      reddit: false,
      youtube: false,
      social: false,
    }
    
    value.forEach((id) => {
      if (id in newFilters) {
        newFilters[id as keyof SourceFilters] = true
      }
    })
    
    onFilterChange(newFilters)
  }

  return (
    <ToggleGroup 
      type="multiple" 
      value={activeSources}
      onValueChange={handleValueChange}
      className="flex flex-wrap gap-2"
    >
      {sources.map(({ id, label, icon: Icon }) => (
        <ToggleGroupItem
          key={id}
          value={id}
          variant="outline"
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary"
        >
          <Icon className="h-4 w-4" />
          <span className="text-sm">{label}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}