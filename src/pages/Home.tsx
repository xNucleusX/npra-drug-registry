import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, FileText } from 'lucide-react'
import { useData } from '../context/DataContext'

const MAX_RESULTS = 200

export function Home() {
  const { products, syncStatus, totalProducts } = useData()
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return products.filter(
      (p) =>
        p.productName?.toLowerCase().includes(q) ||
        p.registrationNumber?.toLowerCase().includes(q) ||
        p.activeIngredients?.some((ai) => ai.toLowerCase().includes(q)),
    )
  }, [products, query])

  const visibleResults = results.slice(0, MAX_RESULTS)

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
      <div className="px-6 pb-6 md:px-8">
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Product Name, Active Ingredient, or Registration No..."
            className="h-11 w-full rounded-md border border-input bg-background pl-12 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          />
        </div>
      </div>
      <div className="p-0">
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
                      {product.productName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {product.activeIngredients.join(', ') || '—'}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{product.registrationNumber}</td>
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

        {query.trim() === '' && (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            {syncStatus === 'syncing'
              ? 'Loading product registry…'
              : `Start typing to search ${totalProducts.toLocaleString()} products.`}
          </div>
        )}
        {query.trim() !== '' && results.length === 0 && (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            No products found matching "{query}".
          </div>
        )}
        {results.length > MAX_RESULTS && (
          <div className="border-t border-border px-6 py-3 text-center text-xs text-muted-foreground">
            Showing {MAX_RESULTS} of {results.length} matches — refine your search for more precise results.
          </div>
        )}
      </div>
    </div>
  )
}
