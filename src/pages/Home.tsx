import { useDeferredValue, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, FileText, X, SlidersHorizontal } from 'lucide-react'
import { useData } from '../context/DataContext'
import { highlightMatches } from '../lib/highlight'
import { cn } from '../lib/utils'
import type { Product } from '../lib/types'

const MAX_RESULTS = 200

interface SearchableProduct {
  product: Product
  haystack: string
  nameLower: string
}

function buildIndex(products: Product[]): SearchableProduct[] {
  return products.map((product) => {
    const nameLower = product.productName?.toLowerCase() ?? ''
    const haystack = [
      product.productName,
      product.registrationNumber,
      product.holder,
      product.manufacturer,
      ...(product.activeIngredients ?? []),
    ]
      .filter(Boolean)
      .join(' ␞ ')
      .toLowerCase()
    return { product, haystack, nameLower }
  })
}

export function Home() {
  const { products, syncStatus, totalProducts } = useData()
  const [query, setQuery] = useState('')
  const [insertOnly, setInsertOnly] = useState(false)
  const deferredQuery = useDeferredValue(query)
  const isStale = deferredQuery !== query

  const index = useMemo(() => buildIndex(products), [products])

  const tokens = useMemo(
    () => deferredQuery.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [deferredQuery],
  )

  const results = useMemo(() => {
    if (tokens.length === 0) return []
    const matches = index.filter(({ haystack }) => tokens.every((t) => haystack.includes(t)))
    matches.sort((a, b) => {
      const aStarts = a.nameLower.startsWith(tokens[0]) ? 0 : 1
      const bStarts = b.nameLower.startsWith(tokens[0]) ? 0 : 1
      if (aStarts !== bStarts) return aStarts - bStarts
      return a.product.productName.localeCompare(b.product.productName)
    })
    return matches.map((m) => m.product)
  }, [index, tokens])

  const filteredResults = useMemo(
    () => (insertOnly ? results.filter((p) => p.packageInserts.length > 0) : results),
    [results, insertOnly],
  )

  const visibleResults = filteredResults.slice(0, MAX_RESULTS)
  const hasQuery = query.trim() !== ''

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xl">
      <div className="flex flex-col space-y-1.5 p-6 md:p-8">
        <h1 className="flex items-center text-2xl font-extrabold tracking-tight text-primary">
          NPRA Drug Registry
        </h1>
        <p className="text-sm text-muted-foreground">
          Search registered pharmaceutical products by name, active ingredient, or registration number
        </p>
      </div>
      <div className="space-y-3 px-6 pb-6 md:px-8">
        <div className="relative">
          <label htmlFor="productSearchInput" className="sr-only">
            Search by product name, active ingredient, or registration number
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="productSearchInput"
            type="search"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setQuery('')
            }}
            placeholder="Search by Product Name, Active Ingredient, or Registration No..."
            className="h-11 w-full rounded-md border border-input bg-background pl-12 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          />
          {query !== '' && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {hasQuery && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {filteredResults.length.toLocaleString()}{' '}
              {filteredResults.length === 1 ? 'result' : 'results'}
              {insertOnly ? ' with package insert' : ''} for{' '}
              <span className="font-medium text-foreground">&ldquo;{query.trim()}&rdquo;</span>
            </span>
            <label className="inline-flex cursor-pointer items-center gap-1.5 select-none">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              <input
                type="checkbox"
                checked={insertOnly}
                onChange={(e) => setInsertOnly(e.target.checked)}
                className="h-3.5 w-3.5 accent-primary"
              />
              Has package insert only
            </label>
          </div>
        )}
      </div>
      <div className={cn('p-0 transition-opacity', isStale && 'opacity-60')}>
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b [&_tr]:border-border">
              <tr>
                <th className="w-[35%] px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                  Product Name
                </th>
                <th className="w-[30%] px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                  Active Ingredient(s)
                </th>
                <th className="w-[20%] px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                  Registration No
                </th>
                <th className="w-[15%] px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                  Insert
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {visibleResults.map((product) => (
                <tr key={product.id} className="border-b border-border transition-colors hover:bg-accent/50">
                  <td className="px-6 py-4">
                    <Link
                      to={`/product/${product.id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {highlightMatches(product.productName, tokens)}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {product.activeIngredients.length > 0
                      ? highlightMatches(product.activeIngredients.join(', '), tokens)
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {highlightMatches(product.registrationNumber, tokens)}
                  </td>
                  <td className="px-6 py-4">
                    {product.packageInserts.length > 0 ? (
                      <FileText className="h-4 w-4 text-primary" aria-label="Package insert available" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!hasQuery && (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            {syncStatus === 'syncing'
              ? 'Loading product registry…'
              : `Start typing to search ${totalProducts.toLocaleString()} products.`}
          </div>
        )}
        {hasQuery && filteredResults.length === 0 && (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            No products found matching &ldquo;{query.trim()}&rdquo;
            {insertOnly ? ' with a package insert' : ''}.
          </div>
        )}
        {filteredResults.length > MAX_RESULTS && (
          <div className="border-t border-border px-6 py-3 text-center text-xs text-muted-foreground">
            Showing {MAX_RESULTS} of {filteredResults.length.toLocaleString()} matches — refine your search for
            more precise results.
          </div>
        )}
      </div>
    </div>
  )
}
