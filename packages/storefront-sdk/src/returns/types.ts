export interface CustomerClaimLine {
  productNumber: string | null
  description: string | null
  orderLineNumber: string | null
  image: string | null
  quantity: number | null
  reason: string | null
  resolution: string | null
  status: string | null
  decided: boolean
  returnRequired: boolean | null
  authorizedQuantity: number | null
  receivedQuantity: number | null
  rejected: boolean
  settlement: null
}

export interface CustomerClaim {
  claimNumber: string
  state: string
  claimType: string | null
  lines: CustomerClaimLine[]
  shipments: null
}

export interface ClaimsResponse {
  orderNumber: string
  claims: CustomerClaim[]
}

export interface CustomerClaimMessage {
  id: string
  createdAt: string
  author: 'customer' | 'operator'
  body: string
}

export interface ClaimMessagesPage {
  messages: CustomerClaimMessage[]
  nextCursor: string | null
}

export interface SendClaimMessageRequest {
  orderNumber: string
  claimNumber: string
  messageId: string
  body: string
}

export interface ReasonEligibilityRequest {
  orderNumber: string
  email: string
  orderLineNumber: string
}

export interface ReasonEligibilityResponse {
  orderNumber: string
  orderLineNumber: string
  claimableQuantity: number
  reasons: { reason: string; label: string; resolutions: string[]; pictureRequired: boolean; claimTypes: string[] }[]
  claimTypes: { key: string; label: string; description?: string | null }[]
}

export interface ClaimCreateRequest {
  orderNumber: string
  email: string
  claimType?: string
  comment?: string
  returnShippingOptionKey?: string
  lines: { orderLineNumber: string; quantity: number; reason: string; resolution?: string; exchangeProductNumber?: string; description?: string; metadata?: Record<string, unknown>; pictures?: File[] }[]
}

export interface ExchangeProductSearchRequest extends ReasonEligibilityRequest {
  reason: string
  phrase?: string
  locale: string
}

export interface ExchangeProductSearchResponse {
  products: { productNumber: string; description: string | null; imageUrl: string | null }[]
  hasMore: boolean | null
}

export interface ReturnShippingOptionsResponse {
  orderNumber: string
  options: { optionKey: string; label: string; shippingFee: number }[]
}

export interface ClaimCreateResponse {
  claimNumber: string | null
  claimState: string
  orderNumber: string
  claimType: string | null
  lineCount: number
}

export interface WithdrawalAvailabilityResponse {
  orderNumber: string
  available: boolean
  lines: { orderLineNumber: string; quantity: number }[]
}

export interface WithdrawalCreateRequest {
  orderNumber: string
  email: string
  returnShippingOptionKey?: string
}