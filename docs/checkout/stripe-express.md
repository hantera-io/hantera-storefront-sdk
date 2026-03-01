# Stripe Express Checkout

Stripe's Express Checkout Element provides one-click payment buttons for Apple Pay, Google Pay, and Link — all through a single integration.

::: tip Live Example
See this integration in action in the [Cart Playground](/playground/cart). The source code is available in the [hantera-storefront-sdk repository](https://github.com/hantera-io/hantera-storefront-sdk).
:::

## Prerequisites

- The `stripe` PSP app installed and configured on your Hantera instance
- Stripe API keys configured in the app's registry settings
- For Apple Pay: domain verification in your Stripe dashboard
- For Google Pay: no additional setup required

## Overview

Express Checkout differs from [standard Stripe checkout](/checkout/stripe) in that the payment form is provided by the customer's wallet (Apple Pay, Google Pay, or Stripe Link). The customer confirms payment inside the wallet UI rather than filling out a card form.

The flow:

1. **Load Stripe.js** and create an Express Checkout Element
2. **Mount the button** — Stripe auto-detects available wallets
3. **Handle the `confirm` event** — set addresses, submit payment, confirm
4. **Wait for completion** via SSE

## Step 1: Load Stripe.js and Create Elements

```ts
import Stripe from 'stripe'

const response = await fetch(`${baseUrl}/ingress/stripe/publicKey`)
const { publicKey } = await response.json()
const stripe = Stripe(publicKey)

const elements = stripe.elements({
  mode: 'payment',
  amount: cart.totalIncVat * 100,
  currency: currencyCode.toLowerCase(),
})
```

## Step 2: Mount the Express Checkout Element

```ts
const expressCheckout = elements.create('expressCheckout', {
  buttonType: {
    applePay: 'buy',
    googlePay: 'buy',
  },
})

expressCheckout.mount('#express-checkout')
```

::: info Wallet Availability
The Express Checkout Element only renders buttons for wallets available on the customer's device and browser. If no wallets are available, the element will be empty. Consider showing a fallback message or the [standard Stripe checkout](/checkout/stripe).
:::

## Step 3: Handle Events

The Express Checkout Element emits several events during the payment flow:

### `confirm` — Customer Authorized Payment

This is the main event. The customer has authorized payment in their wallet. Extract their details, set them on the cart, then confirm:

```ts
import { createCartClient } from '@hantera/storefront-sdk/cart'

const client = createCartClient({ baseUrl })

expressCheckout.on('confirm', async (event) => {
  const { billingDetails, shippingAddress, expressPaymentType } = event

  // Set customer info on the cart
  if (billingDetails?.email) {
    await client.setEmail(cartId, billingDetails.email)
  }

  if (shippingAddress) {
    await client.setAddress(cartId, {
      deliveryAddress: {
        firstName: shippingAddress.name?.split(' ')[0] ?? '',
        lastName: shippingAddress.name?.split(' ').slice(1).join(' ') ?? '',
        addressLine1: shippingAddress.address?.line1 ?? '',
        addressLine2: shippingAddress.address?.line2 ?? '',
        postalCode: shippingAddress.address?.postal_code ?? '',
        city: shippingAddress.address?.city ?? '',
        country: shippingAddress.address?.country ?? '',
      },
    })
  }

  // Create payment intent
  const { clientSecret } = await client.submitPayment(cartId, 'stripe', {})

  // Confirm payment
  const { error } = await stripe.confirmPayment({
    elements,
    clientSecret,
    confirmParams: {
      return_url: `${window.location.origin}/confirmation?cartId=${cartId}`,
    },
  })

  if (error) {
    // Show error to customer
  }
})
```

### `cancel` — Customer Dismissed the Wallet

```ts
expressCheckout.on('cancel', () => {
  // Customer closed the wallet UI without paying
  // Reset any loading state
})
```

### `shippingaddresschange` — Customer Changed Address

Respond with available shipping rates for the new address:

```ts
expressCheckout.on('shippingaddresschange', (event) => {
  const { address } = event
  // Optionally look up shipping rates for the new address
  // Then resolve with available rates:
  event.resolve({
    shippingRates: [
      {
        id: 'standard',
        displayName: 'Standard Shipping',
        amount: 4900, // minor units
      },
    ],
  })
})
```

### `shippingratechange` — Customer Selected a Shipping Rate

```ts
expressCheckout.on('shippingratechange', (event) => {
  const { shippingRate } = event
  // Update cart with selected shipping option if needed
  event.resolve()
})
```

## Step 4: Wait for Completion

After `confirmPayment` redirects back, listen for the cart to complete:

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
import Stripe from 'stripe'
import { createCartClient } from '@hantera/storefront-sdk/cart'

const baseUrl = 'https://core.your-instance.hantera.cloud'
const client = createCartClient({ baseUrl })

// 1. Load Stripe
const { publicKey } = await fetch(`${baseUrl}/ingress/stripe/publicKey`).then(r => r.json())
const stripe = Stripe(publicKey)

const elements = stripe.elements({
  mode: 'payment',
  amount: cart.totalIncVat * 100,
  currency: 'sek',
})

// 2. Mount express checkout
const expressCheckout = elements.create('expressCheckout', {
  buttonType: { applePay: 'buy', googlePay: 'buy' },
})
expressCheckout.mount('#express-checkout')

// 3. Handle confirm
expressCheckout.on('confirm', async (event) => {
  const { billingDetails, shippingAddress } = event

  if (billingDetails?.email) {
    await client.setEmail(cartId, billingDetails.email)
  }

  if (shippingAddress) {
    await client.setAddress(cartId, {
      deliveryAddress: {
        firstName: shippingAddress.name?.split(' ')[0] ?? '',
        lastName: shippingAddress.name?.split(' ').slice(1).join(' ') ?? '',
        addressLine1: shippingAddress.address?.line1 ?? '',
        postalCode: shippingAddress.address?.postal_code ?? '',
        city: shippingAddress.address?.city ?? '',
        country: shippingAddress.address?.country ?? '',
      },
    })
  }

  const { clientSecret } = await client.submitPayment(cartId, 'stripe', {})

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
})

expressCheckout.on('cancel', () => {
  // Reset loading state
})

// 4. On return page — wait for completion
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

## Differences from Standard Stripe Checkout

| Aspect | Standard | Express |
|---|---|---|
| **Customer input** | Fills out card + address form | Confirms in wallet UI |
| **Address collection** | Your form or Stripe Address Element | Provided by wallet |
| **Available methods** | All card types | Apple Pay, Google Pay, Link |
| **Device dependent** | No | Yes — wallet must be available |
| **3D Secure** | May redirect | Handled within wallet |
| **Recommended for** | All customers | Returning customers, mobile |
