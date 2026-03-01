# Checkout

The Hantera Storefront SDK provides the building blocks for implementing checkout flows with various payment providers. The SDK itself is **payment-agnostic** — you can use it with any payment provider.

::: tip Sample Implementations
This documentation includes Vue-based sample implementations in the [Cart Playground](/playground/cart). You can also clone the [hantera-storefront-sdk repository](https://github.com/hantera-io/hantera-storefront-sdk) on GitHub to explore the source code.
:::

## How Checkout Works

Checkout in Hantera follows a consistent pattern regardless of which payment provider you use:

1. **Create a cart** and add items to it
2. **Set customer information** — email, phone, addresses
3. **Submit payment** via `submitPayment(cartId, paymentType, body)`
4. **Handle the PSP response** — redirect, confirm, or wait
5. **Cart completes** asynchronously once the server confirms payment

```ts
import { createCartClient } from '@hantera/storefront-sdk/cart'

const cart = createCartClient({ baseUrl: 'https://core.your-instance.hantera.cloud' })

// Step 3: Submit payment — response depends on the PSP
const result = await cart.submitPayment(cartId, 'stripe', {})
```

## The `submitPayment` Convention

Payment provider apps in Hantera register an ingress at:

```
/ingress/commerce/carts/{cartId}/payment/{paymentType}
```

The SDK's `submitPayment` method calls this endpoint. The request body and response format are defined by the PSP app — the SDK simply passes them through.

For example, the Stripe app returns `{ clientSecret }` which you use with Stripe.js to confirm the payment on the client side.

## Completion Flow

Cart completion happens **asynchronously** on the server side. After the customer completes payment (e.g., Stripe confirms via webhook), the cart transitions to `completed` state.

Use SSE events to detect completion in real time:

```ts
const eventSource = cart.subscribeToCartEvents(cartId, {
  onUpdate: (cartData) => {
    if (cartData.cartState === 'completed') {
      // Show order confirmation
    }
  },
})
```

::: warning
After a payment redirect (e.g., from Stripe), reconnect to SSE and show a loading state. The cart may not be completed immediately — the server processes the payment asynchronously.
:::

## Available Integrations

| Integration | Payment Type | App Required | Guide |
|---|---|---|---|
| [Stripe](/checkout/stripe) | `stripe` | `stripe` PSP app | Card payments with Stripe Elements |
| [Stripe Express](/checkout/stripe-express) | `stripe` | `stripe` PSP app | Apple Pay, Google Pay, Link |
| [Demo](/checkout/demo) | `demo` | `demo-retail` app | Simulated payment for testing |

## Prerequisites

Each checkout method requires the corresponding Hantera app to be installed and configured on your instance:

- **Stripe / Stripe Express** — Install the `stripe` PSP app and configure your Stripe API keys
- **Demo** — Install the `demo-retail` app which includes a simulated payment handler
