import { HttpClient, type HttpClientOptions } from '../common/http-client'
import type { OrderLookupRequest, OrderLookupResponse, OrderSearchRequest, OrderSearchResponse } from './types'

export interface OrdersClientOptions extends HttpClientOptions {
  getCustomerToken: () => string | Promise<string>
}

export class OrdersClient {
  private http: HttpClient
  private getCustomerToken: OrdersClientOptions['getCustomerToken']

  constructor(options: OrdersClientOptions) {
    this.http = new HttpClient(options)
    this.getCustomerToken = options.getCustomerToken
  }

  async lookup(request: OrderLookupRequest): Promise<OrderLookupResponse> {
    const token = await this.getCustomerToken()
    return this.http.request<OrderLookupResponse>('POST', '/ingress/storefront/order-lookup', request, {
      Authorization: `Bearer ${token}`,
    })
  }

  async search(request: OrderSearchRequest = {}): Promise<OrderSearchResponse> {
    const token = await this.getCustomerToken()
    return this.http.request<OrderSearchResponse>('POST', '/ingress/storefront/order-search', request, {
      Authorization: `Bearer ${token}`,
    })
  }
}

export function createOrdersClient(options: OrdersClientOptions): OrdersClient {
  return new OrdersClient(options)
}