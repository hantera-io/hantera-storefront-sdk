export interface CartItem {
  cartItemId: string
  productNumber: string
  quantity: number
  description?: string
  image?: string
  total: number
  tax: number
  unitPrice: number
  discount: number
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

export interface InvoiceRecipient extends Address {
  taxId?: string
  taxIdType?: string
  taxCountryCode?: string
}

export interface Cart {
  cartId: string
  cartNumber: string
  orderNumber: string
  cartState: string
  profileKey?: string
  channelKey: string
  currencyCode: string
  locale?: string
  customer?: Record<string, unknown>
  address?: Address
  invoiceRecipient?: InvoiceRecipient
  items: CartItem[]
  fields?: Record<string, unknown>
  taxIncluded: boolean
  productTotal: number
  orderTotal: number
  orderTaxTotal: number
  shippingDiscount: number
  shippingTotal: number
  shippingTax: number
  email?: string
  phone?: string
  promotions: [{
    calculatedTotal: number,
    description: string,
    messageRendered: string | null,
    messageTemplate: string | null,
    messageType: string | null
  }]
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
  profileKey: string
  countryCode?: string
  locale: string
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
  address?: Address
  invoiceRecipient?: InvoiceRecipient | 'unset'
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
