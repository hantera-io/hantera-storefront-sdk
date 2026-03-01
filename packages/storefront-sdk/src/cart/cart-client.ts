import { HttpClient, type HttpClientOptions } from '../common/http-client'
import type {
  AddItemRequest,
  Cart,
  CartErrors,
  CartEventHandlers,
  CartMutationResponse,
  CreateCartRequest,
  CreateCartResponse,
  RemoveItemRequest,
  SetAddressRequest,
  SetFieldRequest,
  SetQuantityRequest,
} from './types'

export interface CartClientOptions extends HttpClientOptions {}

export class CartClient {
  private http: HttpClient

  constructor(options: CartClientOptions) {
    this.http = new HttpClient(options)
  }

  async createCart(request: CreateCartRequest): Promise<CreateCartResponse> {
    return this.http.request<CreateCartResponse>('POST', '/ingress/commerce/carts', request)
  }

  async getCart(cartId: string): Promise<Cart | CartErrors> {
    return this.http.request<Cart | CartErrors>('GET', `/ingress/commerce/carts/${cartId}`)
  }

  async addItem(cartId: string, request: AddItemRequest): Promise<CartMutationResponse> {
    return this.http.request<CartMutationResponse>(
      'POST',
      `/ingress/commerce/carts/${cartId}/add-item`,
      request,
    )
  }

  async removeItem(cartId: string, request: RemoveItemRequest): Promise<CartMutationResponse> {
    return this.http.request<CartMutationResponse>(
      'POST',
      `/ingress/commerce/carts/${cartId}/remove-item`,
      request,
    )
  }

  async setQuantity(cartId: string, request: SetQuantityRequest): Promise<CartMutationResponse> {
    return this.http.request<CartMutationResponse>(
      'POST',
      `/ingress/commerce/carts/${cartId}/set-quantity`,
      request,
    )
  }

  async addCoupon(cartId: string, couponCode: string): Promise<CartMutationResponse> {
    return this.http.request<CartMutationResponse>(
      'POST',
      `/ingress/commerce/carts/${cartId}/add-coupon`,
      { couponCode },
    )
  }

  async removeCoupon(cartId: string, couponCode: string): Promise<CartMutationResponse> {
    return this.http.request<CartMutationResponse>(
      'POST',
      `/ingress/commerce/carts/${cartId}/remove-coupon`,
      { couponCode },
    )
  }

  async setAddress(cartId: string, request: SetAddressRequest): Promise<CartMutationResponse> {
    return this.http.request<CartMutationResponse>(
      'POST',
      `/ingress/commerce/carts/${cartId}/address`,
      request,
    )
  }

  async setEmail(cartId: string, email: string): Promise<CartMutationResponse> {
    return this.http.request<CartMutationResponse>(
      'POST',
      `/ingress/commerce/carts/${cartId}/email`,
      { email },
    )
  }

  async setPhone(cartId: string, phone: string): Promise<CartMutationResponse> {
    return this.http.request<CartMutationResponse>(
      'POST',
      `/ingress/commerce/carts/${cartId}/phone`,
      { phone },
    )
  }

  async setField(cartId: string, key: string, request: SetFieldRequest): Promise<CartMutationResponse> {
    return this.http.request<CartMutationResponse>(
      'POST',
      `/ingress/commerce/carts/${cartId}/set-field/${encodeURIComponent(key)}`,
      request,
    )
  }

  async deleteField(cartId: string, key: string): Promise<CartMutationResponse> {
    return this.http.request<CartMutationResponse>(
      'POST',
      `/ingress/commerce/carts/${cartId}/remove-field/${encodeURIComponent(key)}`,
    )
  }

  async submitPayment(cartId: string, paymentType: string, body: unknown): Promise<unknown> {
    return this.http.request<unknown>(
      'POST',
      `/ingress/commerce/carts/${cartId}/payment/${paymentType}`,
      body,
    )
  }

  subscribeToCartEvents(cartId: string, handlers: CartEventHandlers): EventSource {
    const eventSource = this.http.createEventSource(`/ingress/commerce/carts/${cartId}/events`)

    eventSource.addEventListener('init', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      handlers.onInit?.(data)
    })

    eventSource.addEventListener('updated', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      handlers.onUpdate?.(data)
    })

    eventSource.addEventListener('error', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      handlers.onError?.(data)
    })

    eventSource.onerror = (e) => {
      handlers.onConnectionError?.(e)
    }

    return eventSource
  }
}

export function createCartClient(options: CartClientOptions): CartClient {
  return new CartClient(options)
}
