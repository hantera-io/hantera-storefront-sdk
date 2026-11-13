import { HttpClient, type HttpClientOptions } from '../common/http-client'
import type { ClaimCreateRequest, ClaimCreateResponse, ClaimMessagesPage, ClaimUpdate, ClaimsResponse, CustomerClaimMessage, SendClaimMessageRequest, ExchangeProductSearchRequest, ExchangeProductSearchResponse, ReasonEligibilityRequest, ReasonEligibilityResponse, ReturnShippingOptionsResponse, WithdrawalAvailabilityResponse, WithdrawalCreateRequest } from './types'

export interface ReturnsClientOptions extends HttpClientOptions {
  getCustomerToken: () => string | Promise<string>
}

export class ReturnsError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) {
    super(message)
    this.name = 'ReturnsError'
  }
}

async function responseError(response: Response): Promise<ReturnsError> {
  let data: unknown
  try { data = await response.json() } catch { data = null }
  const error = data && typeof data === 'object' && 'error' in data ? data.error : null
  if (error && typeof error === 'object' && 'code' in error && 'message' in error && typeof error.code === 'string' && typeof error.message === 'string') {
    return new ReturnsError(error.message, error.code, response.status)
  }
  return new ReturnsError('Returns request failed', 'HTTP_ERROR', response.status)
}

export class ReturnsClient {
  private readonly http: HttpClient
  private readonly getCustomerToken: ReturnsClientOptions['getCustomerToken']

  constructor(options: ReturnsClientOptions) {
    this.http = new HttpClient(options)
    this.getCustomerToken = options.getCustomerToken
  }

  private async post<T>(path: string, body: unknown, signal?: AbortSignal, authenticated = false): Promise<T> {
    const token = authenticated ? await this.getCustomerToken() : undefined
    signal?.throwIfAborted()
    const response = await fetch(`${this.http.getBaseUrl()}${path}`, {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    })
    if (!response.ok) throw await responseError(response)
    return response.json() as Promise<T>
  }

  lookupClaims(orderNumber: string, signal?: AbortSignal): Promise<ClaimsResponse> {
    return this.post('/ingress/returns/storefront/claims/lookup', { orderNumber }, signal, true)
  }

  lookupClaimMessages(orderNumber: string, claimNumber: string, after?: string, signal?: AbortSignal): Promise<ClaimMessagesPage> {
    return this.post('/ingress/returns/storefront/claims/messages/lookup', {orderNumber, claimNumber, after}, signal, true)
  }

  async getAllClaimMessages(orderNumber: string, claimNumber: string, signal?: AbortSignal): Promise<CustomerClaimMessage[]> {
    const messages: CustomerClaimMessage[] = []
    const seen = new Set<string>()
    let after: string | undefined
    do {
      const page = await this.lookupClaimMessages(orderNumber, claimNumber, after, signal)
      if (!Array.isArray(page.messages) || page.messages.length > 100 || (page.nextCursor !== null && typeof page.nextCursor !== 'string') || page.nextCursor === '') {
        throw new ReturnsError('Invalid message page', 'INVALID_MESSAGE_PAGE', 0)
      }
      messages.push(...page.messages)
      after = page.nextCursor ?? undefined
      if (after && seen.has(after)) throw new ReturnsError('Message pagination did not advance', 'INVALID_CURSOR', 0)
      if (after) seen.add(after)
    } while (after)
    return messages
  }

  async sendClaimMessage(request: SendClaimMessageRequest, signal?: AbortSignal): Promise<{sent: true, messageId: string}> {
    const result = await this.post<{sent?: boolean, messageId?: string}>('/ingress/returns/storefront/claims/messages', request, signal, true)
    if (result.sent !== true || result.messageId !== request.messageId) throw new ReturnsError('Message was not confirmed', 'MESSAGE_NOT_CONFIRMED', 0)
    return {sent: true, messageId: result.messageId}
  }

  reasonEligibility(request: ReasonEligibilityRequest, signal?: AbortSignal): Promise<ReasonEligibilityResponse> {
    return this.post('/ingress/returns/storefront/reason-eligibility', request, signal)
  }

  withdrawalAvailability(orderNumber: string, email: string, signal?: AbortSignal): Promise<WithdrawalAvailabilityResponse> {
    return this.post('/ingress/returns/storefront/withdrawal-availability', { orderNumber, email }, signal)
  }

  createWithdrawal(request: WithdrawalCreateRequest, signal?: AbortSignal): Promise<ClaimCreateResponse> {
    return this.post('/ingress/returns/storefront/withdrawals', request, signal)
  }

  searchExchangeProducts(request: ExchangeProductSearchRequest, signal?: AbortSignal): Promise<ExchangeProductSearchResponse> {
    return this.post('/ingress/returns/storefront/exchange-products/search', request, signal)
  }

  async returnShippingOptions(orderNumber: string, email: string, signal?: AbortSignal): Promise<ReturnShippingOptionsResponse> {
    const query = new URLSearchParams({ orderNumber, email })
    const response = await fetch(`${this.http.getBaseUrl()}/ingress/returns/storefront/return-shipping-options?${query}`, { signal })
    if (!response.ok) throw await responseError(response)
    return response.json() as Promise<ReturnShippingOptionsResponse>
  }

  async createClaim(request: ClaimCreateRequest, signal?: AbortSignal): Promise<ClaimCreateResponse> {
    const pictures: File[] = []
    const lines = request.lines.map(({ pictures: linePictures, ...line }) => {
      const pictureIndexes = (linePictures ?? []).map(picture => {
        pictures.push(picture)
        return pictures.length
      })
      return pictureIndexes.length ? { ...line, pictureIndexes } : line
    })
    const payload = { ...request, lines }
    const form = new FormData()
    form.append('request', JSON.stringify(payload))
    for (const picture of pictures) form.append('pictures', picture, picture.name)
    signal?.throwIfAborted()
    const response = await fetch(`${this.http.getBaseUrl()}/ingress/returns/storefront/claims`, {
      method: 'POST', signal, body: form,
    })
    if (!response.ok) throw await responseError(response)
    return response.json() as Promise<ClaimCreateResponse>
  }

  async streamCustomerClaims(signal: AbortSignal, onUpdate: (update: ClaimUpdate) => void): Promise<void> {
    const token = await this.getCustomerToken()
    signal.throwIfAborted()
    const response = await fetch(`${this.http.getBaseUrl()}/ingress/returns/storefront/claims/events`, {
      method: 'POST', signal,
      headers: { Accept: 'text/event-stream', Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw await responseError(response)
    if (!response.headers.get('content-type')?.includes('text/event-stream') || !response.body) {
      await response.body?.cancel().catch(() => {})
      throw new ReturnsError('Invalid claim updates response', 'INVALID_STREAM', response.status)
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let event = 'message'
    let data: string[] = []
    let size = 0
    try {
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        buffer += decoder.decode(chunk.value, { stream: true })
        if (buffer.length > 65536) throw new ReturnsError('Claim update is too large', 'INVALID_STREAM', 0)
        let newline = buffer.indexOf('\n')
        while (newline !== -1) {
          const line = buffer.slice(0, newline).replace(/\r$/, '')
          buffer = buffer.slice(newline + 1)
          if (!line) {
            if (event === 'error') {
              let detail: { code?: unknown; message?: unknown } = {}
              try { detail = JSON.parse(data.join('\n')) ?? {} } catch { detail = {} }
              throw new ReturnsError(typeof detail.message === 'string' ? detail.message : 'Claim updates are unavailable', typeof detail.code === 'string' ? detail.code : 'STREAM_ERROR', 0)
            }
            if (event === 'updated') {
              let detail: { orderNumber?: unknown; claimNumber?: unknown } = {}
              try { detail = JSON.parse(data.join('\n')) ?? {} } catch { detail = {} }
              if (typeof detail.orderNumber !== 'string' || typeof detail.claimNumber !== 'string') throw new ReturnsError('Invalid claim update', 'INVALID_STREAM', 0)
              onUpdate({ orderNumber: detail.orderNumber, claimNumber: detail.claimNumber })
            }
            event = 'message'
            data = []
            size = 0
          } else if (!line.startsWith(':')) {
            const colon = line.indexOf(':')
            const field = colon === -1 ? line : line.slice(0, colon)
            const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '')
            if (field === 'event') event = value
            if (field === 'data') { data.push(value); size += value.length }
            if (size > 65536) throw new ReturnsError('Claim update is too large', 'INVALID_STREAM', 0)
          }
          newline = buffer.indexOf('\n')
        }
      }
    } finally {
      await reader.cancel().catch(() => {})
      reader.releaseLock()
    }
    if (!signal.aborted) throw new ReturnsError('Claim updates disconnected', 'STREAM_CLOSED', 0)
  }

  subscribeCustomerClaims(onUpdate: (update: ClaimUpdate) => void, onError: (error: unknown) => void = () => {}): () => void {
    const controller = new AbortController()
    let stream: AbortController | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    const connect = async () => {
      if (controller.signal.aborted) return
      stream = new AbortController()
      const current = stream
      // The stream is long-lived; renew well before the token's 30-minute
      // lifetime so each reconnection mints a fresh token.
      const refresh = setTimeout(() => current.abort(), 25 * 60 * 1000)
      try { await this.streamCustomerClaims(current.signal, onUpdate) }
      catch (error) { if (!controller.signal.aborted && !current.signal.aborted) onError(error) }
      finally {
        clearTimeout(refresh)
        if (!controller.signal.aborted) timer = setTimeout(() => void connect(), current.signal.aborted ? 0 : 5000)
      }
    }
    void connect()
    return () => { controller.abort(); stream?.abort(); if (timer) clearTimeout(timer) }
  }
}

export function createReturnsClient(options: ReturnsClientOptions): ReturnsClient {
  return new ReturnsClient(options)
}
