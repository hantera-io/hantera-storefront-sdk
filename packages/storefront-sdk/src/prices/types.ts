export interface PriceLookupRequest {
  productNumbers: string[]
  priceListKeys: string[]
  currencyCode: string
}

export interface TimelineEntry {
  price: number
  at: string
}

export interface ProductPrice {
  productNumber: string
  currentPrice: number | null
  lowestPrice: number | null
  priceTimeline: TimelineEntry[] | null
}

export interface PriceLookupResponse {
  currencyCode: string
  prices: ProductPrice[]
}

export interface PriceErrorResponse {
  error: {
    code: string
    message: string
  }
}

export function isPriceError(response: unknown): response is PriceErrorResponse {
  return response != null && typeof response === 'object' && 'error' in response
}
