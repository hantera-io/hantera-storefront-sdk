# Cart Module

The cart module provides a complete client for Hantera's cart and checkout APIs, including real-time SSE event subscriptions.

## Import

```ts
import { createCartClient } from '@hantera/storefront-sdk/cart'
```

## Creating a Client

```ts
const cart = createCartClient({
  baseUrl: 'https://core.your-instance.hantera.cloud',
})
```

## Lifecycle

1. **Create a cart** with a currency and channel
2. **Subscribe to events** for real-time cart updates via SSE
3. **Add items** by product number and quantity
4. **Set customer info** — email, phone, delivery/invoice addresses
5. **Submit payment** through your [payment provider integration](/checkout/)
6. **Cart completes** automatically when payment is confirmed

## Real-time Updates

The cart supports Server-Sent Events (SSE) for real-time state synchronization:

```ts
const eventSource = cart.subscribeToCartEvents(cartId, {
  onInit: (cartData) => {
    // Full cart state on connection
  },
  onUpdate: (cartData) => {
    // Cart state after mutations
  },
  onError: (data) => {
    // Application-level errors
  },
  onConnectionError: (event) => {
    // Connection lost
  },
})

// Clean up when done
eventSource.close()
```

See the [API Reference](/cart/api) for the full method list.

## Checkout

Once items are in the cart and customer info is set, proceed to checkout using `submitPayment`:

```ts
const result = await cart.submitPayment(cartId, 'stripe', {})
```

The SDK supports multiple payment providers through a consistent interface. See the [Checkout documentation](/checkout/) for integration guides:

- [Stripe](/checkout/stripe) — Card payments with Stripe Elements
- [Stripe Express](/checkout/stripe-express) — Apple Pay, Google Pay, Link
- [Demo](/checkout/demo) — Simulated payment for testing
