export interface PackageInsert {
  filename: string
  path: string
  sourceUrl: string
}

export interface Product {
  id: string
  registrationNumber: string
  productName: string
  holder: string | null
  manufacturer: string | null
  activeIngredients: string[]
  packageInserts: PackageInsert[]
}

export interface ProductDataFile {
  metadata: {
    generatedAt: string
    source: string
    totalProducts: number
  }
  products: Product[]
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'ready'
