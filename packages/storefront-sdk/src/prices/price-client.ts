import { HttpClient, type HttpClientOptions } from '../common/http-client'
import type { PriceLookupRequest, PriceLookupResponse, PriceErrorResponse } from './types'

export interface PriceClientOptions extends HttpClientOptions {}

export class PriceClient {
  private http: HttpClient

  constructor(options: PriceClientOptions) {
    this.http = new HttpClient(options)
  }

  async lookup(request: PriceLookupRequest): Promise<PriceLookupResponse | PriceErrorResponse> {
    return this.http.request<PriceLookupResponse | PriceErrorResponse>(
      'POST',
      '/ingress/prices/lookup',
      request,
    )
  }
}

export function createPriceClient(options: PriceClientOptions): PriceClient {
  return new PriceClient(options)
}
