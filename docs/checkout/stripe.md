# Stripe Checkout

Integrate Stripe's full payment form into your checkout flow using Stripe Elements and the Hantera Storefront SDK.

::: tip Live Example
See this integration in action in the [Cart Playground](/playground/cart). The source code is available in the [hantera-storefront-sdk repository](https://github.com/hantera-io/hantera-storefront-sdk).
:::

## Prerequisites

- The `stripe` PSP app installed and configured on your Hantera instance
- Stripe API keys configured in the app's settings

## Overview

The Stripe checkout flow works in four stages:

1. **Load Stripe.js** and fetch the public key from your Hantera instance
2. **Mount Stripe Elements** — address and payment form
3. **Submit payment** via the SDK to get a `clientSecret`
4. **Confirm payment** with Stripe.js, which may redirect the customer for 3D Secure

## Step 1: Load Stripe.js

Load Stripe.js dynamically and fetch your publishable key from the Hantera Stripe app's public endpoint:

```ts
import Stripe from 'stripe'

// Fetch the publishable key from your Hantera instance
const response = await fetch(`${baseUrl}/ingress/stripe/publicKey`)
const { publicKey } = await response.json()

// Initialize Stripe.js
const stripe = Stripe(publicKey)
```

::: info Endpoint
The Stripe public key endpoint is at `/ingress/stripe/publicKey` — this is registered by the Stripe PSP app independently of the commerce app.
:::

## Step 2: Create Elements and Mount the Form

Create a Stripe Elements instance and mount the payment and address elements:

```ts
const elements = stripe.elements({
  mode: 'payment',
  amount: cart.totalIncVat * 100, // Stripe expects amounts in minor units
  currency: currencyCode.toLowerCase(),
})

// Mount the payment element
const paymentElement = elements.create('payment')
paymentElement.mount('#payment-element')

// Optionally mount address elements for shipping and billing
const addressElement = elements.create('address', {
  mode: 'shipping',
})
addressElement.mount('#shipping-address')
```

The `amount` and `currency` are used for display purposes only — the actual charge amount is determined server-side when the payment intent is created.

## Step 3: Submit Payment

First validate the Elements form, then call `submitPayment` on the SDK to create a payment intent:

```ts
import { createCartClient } from '@hantera/storefront-sdk/cart'

const client = createCartClient({ baseUrl })

// Validate the form
const { error: submitError } = await elements.submit()
if (submitError) {
  // Show validation error to customer
  return
}

// Create payment intent via Hantera
const result = await client.submitPayment(cartId, 'stripe', {})
const { clientSecret } = result
```

The Stripe app's ingress at `/ingress/commerce/carts/{cartId}/payment/stripe` creates a Stripe PaymentIntent and returns `{ clientSecret }`.

## Step 4: Confirm Payment

Use the `clientSecret` to confirm the payment with Stripe.js. This may trigger 3D Secure authentication or redirect the customer:

```ts
const { error } = await stripe.confirmPayment({
  elements,
  clientSecret,
  confirmParams: {
    return_url: `${window.location.origin}/order-confirmation?cartId=${cartId}`,
  },
})

if (error) {
  // Payment failed — show error to customer
  // error.type will be 'card_error' or 'validation_error' for recoverable errors
}

// If no error, the customer was redirected to return_url
```

## Step 5: Handle the Return

After Stripe redirects the customer back to your `return_url`, the cart may not be completed yet — the server processes the payment confirmation asynchronously via webhooks.

Show a loading state and listen for the completion event via SSE:

```ts
const eventSource = client.subscribeToCartEvents(cartId, {
  onUpdate: (cartData) => {
    if (cartData.cartState === 'completed') {
      eventSource.close()
      // Show order confirmation with cartData
    }
  },
  onError: (data) => {
    eventSource.close()
    // Handle payment failure
  },
})
```

::: warning Async Completion
Never assume the cart is completed immediately after redirect. Always use SSE to detect the `completed` state. The server-to-server payment confirmation may take a few seconds.
:::

## Complete Example

```ts
import Stripe from 'stripe'
import { createCartClient } from '@hantera/storefront-sdk/cart'

const baseUrl = 'https://core.your-instance.hantera.cloud'
const client = createCartClient({ baseUrl })

// 1. Load Stripe
const keyResponse = await fetch(`${baseUrl}/ingress/stripe/publicKey`)
const { publicKey } = await keyResponse.json()
const stripe = Stripe(publicKey)

// 2. Create Elements
const elements = stripe.elements({
  mode: 'payment',
  amount: cart.totalIncVat * 100,
  currency: 'sek',
})
elements.create('payment').mount('#payment-element')
elements.create('address', { mode: 'shipping' }).mount('#shipping-address')

// 3. On form submit
async function handleCheckout() {
  const { error: formError } = await elements.submit()
  if (formError) return

  // Set customer info on the cart
  await client.setEmail(cartId, email)
  await client.setAddress(cartId, { deliveryAddress, invoiceAddress })

  // Create payment intent
  const { clientSecret } = await client.submitPayment(cartId, 'stripe', {})

  // 4. Confirm with Stripe
  const { error } = await stripe.confirmPayment({
    elements,
    clientSecret,
    confirmParams: {
      return_url: `${window.location.origin}/confirmation?cartId=${cartId}`,
    },
  })

  if (error) {
    // Show error
  }
}

// 5. On return_url page — listen for completion
function waitForCompletion(cartId: string) {
  const eventSource = client.subscribeToCartEvents(cartId, {
    onUpdate: (cartData) => {
      if (cartData.cartState === 'completed') {
        eventSource.close()
        showOrderConfirmation(cartData)
      }
    },
  })
}
```

## Error Handling

| Error Source | When | How to Handle |
|---|---|---|
| `elements.submit()` | Form validation fails | Show inline validation errors |
| `submitPayment()` | Server rejects the request | Show error message, allow retry |
| `confirmPayment()` | Card declined, 3DS failed | Show Stripe's error message |
| SSE `onError` | Payment processing failed | Show failure message |
