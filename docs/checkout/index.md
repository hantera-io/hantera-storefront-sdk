# Checkout

The Hantera Storefront SDK provides the building blocks for implementing checkout flows with various payment providers. The SDK itself is **payment-agnostic** — you can use it with any payment provider.

::: tip Sample Implementations
This documentation includes Vue-based sample implementations in the [Cart Playground](/playground/cart). You can also clone the [hantera-storefront-sdk repository](https://github.com/hantera-io/hantera-storefront-sdk) on GitHub to explore the source code.
:::

## How Checkout Works

While the general flow is similar across providers, each checkout integration has its own API, client-side requirements, and response format. Refer to the individual integration guides below for specifics.

The high-level pattern is:

1. **Create a cart** and add items to it
2. **Set customer information** — email, phone, address
3. **Initiate checkout** using the payment provider's integration
4. **Cart completes** asynchronously once the server confirms payment

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
| [Kustom (KCO)](/checkout/kustom) | `kustom` | `kustom` PSP app | Iframe checkout with address, shipping & payment |

## Prerequisites

Each checkout method requires the corresponding Hantera app to be installed and configured on your instance:

- **Stripe / Stripe Express** — Install the `stripe` PSP app and configure your Stripe API keys
- **Kustom** — Install the `kustom` PSP app and configure your Kustom API credentials
- **Demo** — Install the `demo-retail` app which includes a simulated payment handler
