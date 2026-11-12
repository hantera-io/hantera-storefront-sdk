export interface OrderLookupRequest {
  reference: string
  customerNumber?: string
}

export interface OrderSearchRequest {
  customerNumber?: string
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
  orderLineNumber: string
  productNumber: string
  description: string | null
  image: string | null
  quantity: number
  returnedQuantity: number
  reservedQuantity: number
  unitPrice: number
  total: number
  tax: number
  discount: number
  deliveryNumber: string
}

export interface OrderLookupPromotion {
  calculatedTotal: number
  description: string
  messageRendered: string | null
  messageTemplate: string | null
  messageType: string | null
}

export interface OrderLookupPayment {
  reference: string | null
  provider: string | null
  amount: number
}

export interface OrderLookup {
  orderId: string
  orderNumber: string
  orderState: string
  createdAt: string
  channelKey: string | null
  currencyCode: string
  taxIncluded: boolean
  productTotal: number
  orderTotal: number
  orderTaxTotal: number
  shippingDiscount: number
  shippingTotal: number
  shippingTax: number
  locale: string | null
  address: OrderLookupAddress | null
  invoiceRecipient: OrderLookupAddress | null
  promotions: OrderLookupPromotion[]
  payments: OrderLookupPayment[]
  itemCount: number
  deliveries: { deliveryNumber: string; deliveryState: string }[]
  items: OrderLookupItem[]
}

export interface OrderLookupError {
  error: {
    code: string
    message: string
  }
}

export type OrderLookupResponse = OrderLookup | OrderLookupError
export type OrderSearchResponse = { orders: OrderLookup[] } | OrderLookupError

export function isOrderLookupError(response: unknown): response is OrderLookupError {
  return (
    response != null &&
    typeof response === 'object' &&
    'error' in response &&
    (response as { error?: unknown }).error != null &&
    typeof (response as { error?: unknown }).error === 'object'
  )
}