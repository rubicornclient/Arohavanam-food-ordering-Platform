import { defaultCategories, defaultCombos, defaultMenu, defaultSettings } from './data'
import type { CartLine, Category, Combo, MenuItem, Order, PaymentRecord, RestaurantSettings } from './types'

export const STORE_KEYS = {
  settings: 'rrr_settings', categories: 'rrr_categories', menu: 'rrr_menu_items', combos: 'rrr_combos', tables: 'rrr_tables', cart: 'rrr_cart', orders: 'rrr_orders', payments: 'rrr_payment_records', history: 'rrr_order_status_history', feedback: 'rrr_feedback',
} as const

type StoreKey = typeof STORE_KEYS[keyof typeof STORE_KEYS]
const STORE_VERSION = 1
const localDefaults: Record<StoreKey, unknown> = {
  [STORE_KEYS.settings]: defaultSettings,
  [STORE_KEYS.categories]: defaultCategories,
  [STORE_KEYS.menu]: defaultMenu,
  [STORE_KEYS.combos]: defaultCombos,
  [STORE_KEYS.tables]: defaultSettings.tables,
  [STORE_KEYS.cart]: [],
  [STORE_KEYS.orders]: [],
  [STORE_KEYS.payments]: [],
  [STORE_KEYS.history]: [],
  [STORE_KEYS.feedback]: [],
}

function migrateRestaurantSettings(settings: RestaurantSettings): RestaurantSettings {
  if (!settings?.name?.startsWith('RRR')) return settings
  return {
    ...defaultSettings,
    ...settings,
    name: defaultSettings.name,
    tagline: defaultSettings.tagline,
    logo: defaultSettings.logo,
    address: settings.address === 'Restaurant address to be added' ? defaultSettings.address : settings.address,
    phone: settings.phone === 'Demo contact number' ? defaultSettings.phone : settings.phone,
    openingHours: settings.openingHours?.startsWith('Daily') ? defaultSettings.openingHours : settings.openingHours,
  }
}

export function getData<T>(key: StoreKey): T {
  const fallback = localDefaults[key] as T
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (parsed && parsed.version === STORE_VERSION && 'data' in parsed) {
      const data = key === STORE_KEYS.settings ? migrateRestaurantSettings(parsed.data as RestaurantSettings) : parsed.data
      if (data !== parsed.data) localStorage.setItem(key, JSON.stringify({ version: STORE_VERSION, data }))
      return data as T
    }
    // Read the early flat format once, then migrate it into the versioned store.
    if (Array.isArray(parsed) || (parsed && typeof parsed === 'object')) {
      const data = key === STORE_KEYS.settings ? migrateRestaurantSettings(parsed as RestaurantSettings) : parsed
      localStorage.setItem(key, JSON.stringify({ version: STORE_VERSION, data }))
      return data as T
    }
  } catch (error) {
    console.warn(`Resetting invalid demo data in ${key}`, error)
  }
  setData(key, fallback)
  return fallback
}

export function setData<T>(key: StoreKey, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ version: STORE_VERSION, data: value }))
    window.dispatchEvent(new CustomEvent('rrr-storage-change', { detail: key }))
  } catch (error) {
    console.error(`Could not save ${key}. Local browser storage may be full.`, error)
    throw error
  }
}

export function resetDemoData() {
  Object.keys(STORE_KEYS).forEach((name) => localStorage.removeItem(STORE_KEYS[name as keyof typeof STORE_KEYS]))
  Object.values(STORE_KEYS).forEach((key) => getData(key))
  window.dispatchEvent(new CustomEvent('rrr-storage-change'))
}

export const readSettings = () => getData<RestaurantSettings>(STORE_KEYS.settings)
export const readCategories = () => getData<Category[]>(STORE_KEYS.categories)
export const readMenu = () => getData<MenuItem[]>(STORE_KEYS.menu)
export const readCombos = () => getData<Combo[]>(STORE_KEYS.combos)
export const readCart = () => getData<CartLine[]>(STORE_KEYS.cart)
export const readOrders = () => getData<Order[]>(STORE_KEYS.orders)
export const readPayments = () => getData<PaymentRecord[]>(STORE_KEYS.payments)

const DB_NAME = 'rrr-demo-images'
const DB_VERSION = 1
function openImageDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => request.result.createObjectStore('images')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveUploadedImage(file: File): Promise<string> {
  const source = await createImageBitmap(file)
  const scale = Math.min(1, 1400 / Math.max(source.width, source.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(source.width * scale)
  canvas.height = Math.round(source.height * scale)
  canvas.getContext('2d')?.drawImage(source, 0, 0, canvas.width, canvas.height)
  source.close()
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not process this image')), 'image/webp', 0.82))
  const key = `image-${crypto.randomUUID()}`
  const db = await openImageDB()
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction('images', 'readwrite').objectStore('images').put(blob, key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
  db.close()
  return `idb:${key}`
}

export async function getUploadedImage(path: string): Promise<string | null> {
  if (!path.startsWith('idb:')) return null
  const db = await openImageDB()
  const value = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = db.transaction('images').objectStore('images').get(path.slice(4))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  db.close()
  return value ? URL.createObjectURL(value) : null
}
