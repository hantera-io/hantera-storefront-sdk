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
import { isCartErrors } from './types'

export interface CartClientOptions extends HttpClientOptions {}

export class CartClient {
  private http: HttpClient
  private eventHandlers = new Map<string, CartEventHandlers>()

  constructor(options: CartClientOptions) {
    this.http = new HttpClient(options)
  }

  private notifyUpdate(cartId: string, response: CartMutationResponse): void {
    if (!isCartErrors(response)) {
      this.eventHandlers.get(cartId)?.onUpdate?.(response)
    }
  }

  async getCartProfiles(): Promise<string[]> {
    return this.http.request<string[]>('GET', '/ingress/commerce/cart-profiles')
  }

  async createCart(request: CreateCartRequest): Promise<CreateCartResponse> {
    return this.http.request<CreateCartResponse>('POST', '/ingress/commerce/carts', request)
  }

  async getCart(cartId: string): Promise<Cart | CartErrors> {
    return this.http.request<Cart | CartErrors>('GET', `/ingress/commerce/carts/${cartId}`)
  }

  async addItem(cartId: string, request: AddItemRequest): Promise<CartMutationResponse> {
    const response = await this.http.request<CartMutationResponse>(
      'POST',
      `/ingress/commerce/carts/${cartId}/add-item`,
      request,
    )
    this.notifyUpdate(cartId, response)
    return response
  }

  async removeItem(cartId: string, request: RemoveItemRequest): Promise<CartMutationResponse> {
    const response = await this.http.request<CartMutationResponse>(
      'POST',
      `/ingress/commerce/carts/${cartId}/remove-item`,
      request,
    )
    this.notifyUpdate(cartId, response)
    return response
  }

  async setQuantity(cartId: string, request: SetQuantityRequest): Promise<CartMutationResponse> {
    const response = await this.http.request<CartMutationResponse>(
      'POST',
      `/ingress/commerce/carts/${cartId}/set-quantity`,
      request,
    )
    this.notifyUpdate(cartId, response)
    return response
  }

  async addCoupon(cartId: string, couponCode: string): Promise<CartMutationResponse> {
    const response = await this.http.request<CartMutationResponse>(
      'POST',
      `/ingress/commerce/carts/${cartId}/add-coupon`,
      { couponCode },
    )
    this.notifyUpdate(cartId, response)
    return response
  }

  async removeCoupon(cartId: string, couponCode: string): Promise<CartMutationResponse> {
    const response = await this.http.request<CartMutationResponse>(
      'POST',
      `/ingress/commerce/carts/${cartId}/remove-coupon`,
      { couponCode },
    )
    this.notifyUpdate(cartId, response)
    return response
  }

  async setAddress(cartId: string, request: SetAddressRequest): Promise<CartMutationResponse> {
    const response = await this.http.request<CartMutationResponse>(
      'POST',
      `/ingress/commerce/carts/${cartId}/address`,
      request,
    )
    this.notifyUpdate(cartId, response)
    return response
  }

  async setEmail(cartId: string, email: string): Promise<CartMutationResponse> {
    const response = await this.http.request<CartMutationResponse>(
      'POST',
      `/ingress/commerce/carts/${cartId}/email`,
      { email },
    )
    this.notifyUpdate(cartId, response)
    return response
  }

  async setPhone(cartId: string, phone: string): Promise<CartMutationResponse> {
    const response = await this.http.request<CartMutationResponse>(
      'POST',
      `/ingress/commerce/carts/${cartId}/phone`,
      { phone },
    )
    this.notifyUpdate(cartId, response)
    return response
  }

  async setField(cartId: string, key: string, request: SetFieldRequest): Promise<CartMutationResponse> {
    const response = await this.http.request<CartMutationResponse>(
      'POST',
      `/ingress/commerce/carts/${cartId}/set-field/${encodeURIComponent(key)}`,
      request,
    )
    this.notifyUpdate(cartId, response)
    return response
  }

  async deleteField(cartId: string, key: string): Promise<CartMutationResponse> {
    const response = await this.http.request<CartMutationResponse>(
      'POST',
      `/ingress/commerce/carts/${cartId}/remove-field/${encodeURIComponent(key)}`,
    )
    this.notifyUpdate(cartId, response)
    return response
  }

  subscribeToCartEvents(cartId: string, handlers: CartEventHandlers): EventSource {
    this.eventHandlers.set(cartId, handlers)

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

  unsubscribeFromCartEvents(cartId: string): void {
    this.eventHandlers.delete(cartId)
  }
}

export function createCartClient(options: CartClientOptions): CartClient {
  return new CartClient(options)
}
