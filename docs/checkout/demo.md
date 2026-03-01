# Demo Checkout

The Demo checkout provides a simulated payment flow for testing and development. It uses the `demo-retail` app's payment handler, which completes the cart without processing a real payment.

::: tip Live Example
See this integration in action in the [Cart Playground](/playground/cart). The source code is available in the [hantera-storefront-sdk repository](https://github.com/hantera-io/hantera-storefront-sdk).
:::

## Prerequisites

- The `demo-retail` app installed on your Hantera instance

## When to Use

Demo checkout is useful for:

- **Development** — Test the full cart-to-order flow without payment provider credentials
- **Integration testing** — Verify that your storefront handles completion events correctly
- **Demos** — Showcase the checkout experience without processing real payments

## Overview

The Demo checkout follows the same pattern as any other checkout integration:

1. **Collect customer information** — email, phone, addresses
2. **Submit payment** with `submitPayment(cartId, 'demo', {})`
3. **Wait for completion** via SSE

No external payment SDK is needed — the "payment" is handled entirely server-side.

## Step 1: Collect Customer Information

Build a form to collect the customer's details and set them on the cart:

```ts
import { createCartClient } from '@hantera/storefront-sdk/cart'

const client = createCartClient({ baseUrl })

await client.setEmail(cartId, 'customer@example.com')
await client.setPhone(cartId, '+46701234567')
await client.setAddress(cartId, {
  deliveryAddress: {
    firstName: 'Anna',
    lastName: 'Svensson',
    addressLine1: 'Storgatan 1',
    postalCode: '54230',
    city: 'Mariestad',
    country: 'SE',
  },
  invoiceAddress: {
    firstName: 'Anna',
    lastName: 'Svensson',
    addressLine1: 'Storgatan 1',
    postalCode: '54230',
    city: 'Mariestad',
    country: 'SE',
  },
})
```

## Step 2: Submit Payment

Call `submitPayment` with the `demo` payment type. No request body is needed:

```ts
await client.submitPayment(cartId, 'demo', {})
```

The `demo-retail` app handles this by immediately creating a payment authorization on the server side.

## Step 3: Wait for Completion

Like all checkout methods, cart completion is asynchronous. Listen for the `completed` state via SSE:

```ts
const eventSource = client.subscribeToCartEvents(cartId, {
  onUpdate: (cartData) => {
    if (cartData.cartState === 'completed') {
      eventSource.close()
      showOrderConfirmation(cartData)
    }
  },
})
```

## Complete Example

```ts
import { createCartClient } from '@hantera/storefront-sdk/cart'

const baseUrl = 'https://core.your-instance.hantera.cloud'
const client = createCartClient({ baseUrl })

// Collect customer info
await client.setEmail(cartId, email)
await client.setPhone(cartId, phone)
await client.setAddress(cartId, {
  deliveryAddress: { firstName, lastName, addressLine1, postalCode, city, country },
  invoiceAddress: { firstName, lastName, addressLine1, postalCode, city, country },
})

// Submit demo payment
await client.submitPayment(cartId, 'demo', {})

// Wait for completion
const eventSource = client.subscribeToCartEvents(cartId, {
  onUpdate: (cartData) => {
    if (cartData.cartState === 'completed') {
      eventSource.close()
      showOrderConfirmation(cartData)
    }
  },
})
```
