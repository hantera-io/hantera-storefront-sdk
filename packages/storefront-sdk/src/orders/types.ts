export interface OrderLookupRequest {
  reference: string
  email: string
}

export interface OrderLookupAddress {
  name?: string
  careOf?: string
  attention?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  countryCode?: string
  email?: string
  phone?: string
}

export interface OrderLookupItem {
  cartItemId?: string
  productNumber: string
  description?: string
  image?: string
  quantity: number
  reservedQuantity: number
  unitPrice: number
  total: number
  tax: number
  discount: number
  deliveryNumber?: string
}

export interface OrderLookupPromotion {
  calculatedTotal: number
  description: string
  messageRendered?: string
  messageTemplate?: string
  messageType?: string
}

export interface OrderLookupPayment {
  reference?: string
  provider?: string
  amount: number
}

/**
 * Customer-facing representation returned by the public Commerce order lookup.
 * Cart properties are absent when the originating cart has been deleted or the
 * order was created outside Commerce.
 */
export interface OrderLookup {
  cartId?: string
  cartNumber?: string
  cartState?: string
  profileKey?: string
  orderId: string
  orderNumber: string
  channelKey?: string
  currencyCode: string
  taxIncluded: boolean
  coupons: string[]
  invalidCoupons: string[]
  productTotal: number
  orderTotal: number
  orderTaxTotal: number
  shippingDiscount: number
  shippingTotal: number
  shippingTax: number
  locale?: string
  email?: string
  phone?: string
  address?: OrderLookupAddress
  invoiceRecipient?: OrderLookupAddress
  promotions: OrderLookupPromotion[]
  payments: OrderLookupPayment[]
  fields: Record<string, unknown>
  items: OrderLookupItem[]
}

export interface OrderLookupError {
  error: {
    code: string
    message: string
  }
}

export type OrderLookupResponse = OrderLookup | OrderLookupError

export function isOrderLookupError(response: unknown): response is OrderLookupError {
  return (
    response != null &&
    typeof response === 'object' &&
    'error' in response &&
    typeof (response as { error?: unknown }).error === 'object'
  )
}