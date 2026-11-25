export type Category = {
  id: string
  name: string
  active: boolean
  order: number
}

export type MenuItem = {
  id: string
  name: string
  description: string
  price: number
  categoryId: string
  type: 'veg' | 'nonveg'
  image: string
  available: boolean
  bestseller?: boolean
  special?: boolean
  keywords?: string[]
}

export type ComboItem = { itemId: string; name: string; quantity: number }
export type Combo = {
  id: string
  name: string
  description: string
  includedItems: ComboItem[]
  price: number
  originalPrice?: number
  image: string
  active: boolean
}

export type RestaurantSettings = {
  name: string
  tagline: string
  logo: string
  phone: string
  address: string
  openingHours: string
  gstPercent: number
  extraCharge: number
  tables: string[]
  open: boolean
}

export type CartLine = {
  id: string
  kind: 'item' | 'combo'
  quantity: number
}

export type OrderLine = {
  id: string
  kind: 'item' | 'combo'
  name: string
  description: string
  image: string
  unitPrice: number
  quantity: number
  total: number
  contents?: ComboItem[]
}

export type Order = {
  id: string
  createdAt: string
  customerName: string
  mobile: string
  tableNumber: string
  lines: OrderLine[]
  subtotal: number
  tax: number
  extraCharge: number
  total: number
  paymentMethod: string
  paymentStatus: 'DEMO PAID'
  status: 'Confirmed' | 'Preparing' | 'Ready to Serve' | 'Completed'
  statusHistory: { status: string; at: string }[]
  demo: true
}

export type PaymentRecord = {
  id: string
  orderId: string | null
  amount: number
  method: string
  status: 'Pending' | 'Success' | 'Failed' | 'Cancelled'
  createdAt: string
  demo: true
}


export type CustomerFeedback = {
  id: string
  rating: number
  presetComments: string[]
  comment: string
  createdAt: string
}
