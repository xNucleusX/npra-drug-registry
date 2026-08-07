import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Product } from './types'

const DB_NAME = 'npra-registry-db'
const DB_VERSION = 1
const PRODUCTS_STORE = 'products'
const META_STORE = 'meta'

interface RegistryDB extends DBSchema {
  products: {
    key: string
    value: Product
  }
  meta: {
    key: string
    value: string | number
  }
}

let dbPromise: Promise<IDBPDatabase<RegistryDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<RegistryDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(PRODUCTS_STORE)) {
          db.createObjectStore(PRODUCTS_STORE, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE)
        }
      },
    })
  }
  return dbPromise
}

export async function getAllProducts(): Promise<Product[]> {
  const db = await getDB()
  return db.getAll(PRODUCTS_STORE)
}

export async function putProducts(products: Product[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(PRODUCTS_STORE, 'readwrite')
  await Promise.all(products.map((product) => tx.store.put(product)))
  await tx.done
}

export async function clearProducts(): Promise<void> {
  const db = await getDB()
  await db.clear(PRODUCTS_STORE)
}

export async function getMeta(key: string): Promise<string | number | undefined> {
  const db = await getDB()
  return db.get(META_STORE, key)
}

export async function setMeta(key: string, value: string | number): Promise<void> {
  const db = await getDB()
  await db.put(META_STORE, value, key)
}

export async function countProducts(): Promise<number> {
  const db = await getDB()
  return db.count(PRODUCTS_STORE)
}
