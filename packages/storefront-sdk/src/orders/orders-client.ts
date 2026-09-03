import { HttpClient, type HttpClientOptions } from '../common/http-client'
import type { OrderLookupRequest, OrderLookupResponse } from './types'

export interface OrdersClientOptions extends HttpClientOptions {}

export class OrdersClient {
  private http: HttpClient

  constructor(options: OrdersClientOptions) {
    this.http = new HttpClient(options)
  }

  async lookup(request: OrderLookupRequest): Promise<OrderLookupResponse> {
    return this.http.request<OrderLookupResponse>('POST', '/ingress/commerce/orders/lookup', request)
  }
}

export function createOrdersClient(options: OrdersClientOptions): OrdersClient {
  return new OrdersClient(options)
}