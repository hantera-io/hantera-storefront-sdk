export interface CartItem {
  cartItemId: string
  productNumber: string
  quantity: number
  description?: string
  image?: string
  total: number
  tax: number
  unitPrice: number
}

export interface Address {
  name?: string
  careOf?: string
  attention?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  countryCode?: string
}

export interface OrderLine {
  productNumber: string
  quantity: number
  unitPrice: number
  rowAmount: number
}

export interface Discount {
  amount: number
  name: string
}

export interface OrderPreview {
  orderLines: OrderLine[]
  deliveryAddress?: Address
  discounts: Discount[]
  subtotal: number
  discountTotal: number
  total: number
}

export interface Cart {
  cartId: string
  cartNumber: string
  orderNumber: string
  cartState: string
  channelKey: string
  currencyCode: string
  customer?: Record<string, unknown>
  deliveryAddress?: Address
  invoiceAddress?: Address
  items: CartItem[]
  fields?: Record<string, unknown>
  taxIncluded: boolean
  orderTotal: number
  orderTaxTotal: number
  email?: string
  phone?: string
}

export interface CartErrorItem {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface CartErrors {
  errors: CartErrorItem[]
}

export type CartMutationResponse = Cart | CartErrors

export interface CreateCartRequest {
  currencyCode: string
  channelKey: string
}

export interface CreateCartResponse {
  cartId: string
}

export interface AddItemRequest {
  productNumber: string
  quantity: number
}

export interface RemoveItemRequest {
  cartItemId: string
}

export interface SetAddressRequest {
  deliveryAddress?: Address | 'unset'
  invoiceAddress?: Address | 'unset'
}

export interface SetQuantityRequest {
  cartItemId: string
  quantity: number
}

export interface SetFieldRequest {
  value: unknown
}

export interface CartEventHandlers {
  onInit?: (cart: Cart) => void
  onUpdate?: (cart: Cart) => void
  onError?: (data: unknown) => void
  onConnectionError?: (error: Event) => void
}

export function isCartErrors(response: unknown): response is CartErrors {
  return (
    response != null &&
    typeof response === 'object' &&
    'errors' in response &&
    Array.isArray((response as any).errors)
  )
}
