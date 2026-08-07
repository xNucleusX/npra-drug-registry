import type { ReactNode } from 'react'

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Splits `text` on any of `terms` (case-insensitive) and wraps matches in <mark>.
 * Terms are pre-escaped and sorted longest-first so overlapping terms don't fragment matches.
 */
export function highlightMatches(text: string, terms: string[]): ReactNode {
  const cleanTerms = [...new Set(terms.map((t) => t.trim()).filter(Boolean))].sort((a, b) => b.length - a.length)
  if (cleanTerms.length === 0) return text

  const pattern = new RegExp(`(${cleanTerms.map(escapeRegExp).join('|')})`, 'gi')
  const parts = text.split(pattern)
  if (parts.length === 1) return text

  // text.split() with a capturing group alternates [non-match, match, non-match, match, ...]
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded-sm bg-primary/20 text-inherit">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}
