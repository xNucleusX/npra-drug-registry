import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Download } from 'lucide-react'
import { useData } from '../context/DataContext'

export function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const { productById, syncStatus } = useData()
  const product = id ? productById.get(id) : undefined

  if (syncStatus === 'syncing' && !product) {
    return <p className="p-8 text-center text-muted-foreground">Loading product registry…</p>
  }

  if (!product) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="mb-4 text-lg font-semibold">Product not found</p>
        <p className="mb-6 text-sm text-muted-foreground">
          This entry isn't in the local (capped-sample) registry, or the database hasn't finished loading yet.
        </p>
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to search
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to search
      </Link>

      <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xl">
        <div className="space-y-2 border-b border-border p-6 md:p-8">
          <h1 className="text-2xl font-extrabold text-primary">{product.productName}</h1>
          <p className="text-sm text-muted-foreground">
            Registration No: <span className="font-mono text-foreground">{product.registrationNumber}</span>
          </p>
          {product.holder && (
            <p className="text-sm text-muted-foreground">
              Holder: <span className="text-foreground">{product.holder}</span>
            </p>
          )}
          {product.manufacturer && (
            <p className="text-sm text-muted-foreground">
              Manufacturer: <span className="text-foreground">{product.manufacturer}</span>
            </p>
          )}
        </div>

        <div className="p-6 md:p-8">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Active Ingredient(s)
          </h2>
          {product.activeIngredients.length > 0 ? (
            <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
              {product.activeIngredients.map((ai) => (
                <li key={ai}>{ai}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No active ingredients listed.</p>
          )}
        </div>

        <div className="border-t border-border p-6 md:p-8">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Proposed Package Insert
          </h2>
          {product.packageInserts.length > 0 ? (
            <ul className="space-y-2">
              {product.packageInserts.map((insert) => (
                <li key={insert.path}>
                  <a
                    href={`${import.meta.env.BASE_URL}data/${insert.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:border-primary hover:text-primary"
                  >
                    <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{insert.filename}</span>
                    <Download className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No proposed package insert is available for this product in QUEST3+.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
