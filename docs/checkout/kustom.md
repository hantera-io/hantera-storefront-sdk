# Kustom Checkout (KCO)

Integrate Kustom (formerly Klarna Checkout) into your checkout flow. Kustom provides an iframe checkout that handles address collection, shipping options, and payment — all in one embedded widget.

::: tip Live Example
See this integration in action in the [Cart Playground](/playground/cart). The source code is available in the [hantera-storefront-sdk repository](https://github.com/hantera-io/hantera-storefront-sdk).
:::

## Prerequisites

- The `kustom` PSP app installed and configured on your Hantera instance
- Kustom API credentials (key ID and password) configured in the app's settings
- Environment set to `playground` (testing) or `production` (live)

## Overview

Unlike Stripe where the storefront controls the payment form, Kustom provides a complete checkout experience in an iframe. The flow is:

1. **Initialize checkout** — POST to the Kustom payment ingress, receive an HTML snippet
2. **Render the iframe** — inject the snippet into the DOM
3. **Handle cart changes** — suspend/resume the iframe when the cart is syncing
4. **Completion** — Kustom calls a webhook on your server, the cart completes via SSE

## How It Works

### Server-Side Order Creation

When the storefront calls the Kustom checkout ingress, the server:

1. Previews the cart to get current items and totals
2. Creates (or fetches) a Kustom order via the Kustom API
3. Stores the `kustomOrderId` on the cart
4. Returns the `htmlSnippet` containing the iframe

### Cart Synchronization

If the customer modifies the cart after the Kustom iframe is loaded (e.g., changes quantity), the system:

1. Detects the change via a rule (`OnTicketCommands`)
2. Schedules a background job to sync the updated cart to Kustom
3. Sets a `kustomDirty` flag on the cart
4. The storefront sees `kustomDirty` via SSE and suspends the iframe
5. After sync completes, the flag is cleared and the iframe resumes

### Payment Completion

When the customer completes payment in the Kustom iframe:

1. Kustom sends a push notification to the webhook ingress
2. The webhook fetches the order from Kustom and creates a Payment in Hantera
3. The cart is completed, and the storefront detects this via SSE

## Step 1: Initialize Checkout

Call the Kustom payment ingress to get the checkout snippet:

```ts
const origin = window.location.origin
const response = await fetch(
  `${baseUrl}/ingress/commerce/carts/${cartId}/payment/kustom`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      termsUrl: `${origin}/terms`,
      checkoutUrl: `${origin}/checkout`,
      confirmationUrl: `${origin}/confirmation`,
    }),
  },
)
const { htmlSnippet } = await response.json()
```

The merchant URLs tell Kustom where to send the customer:

| Parameter | Description |
|---|---|
| `termsUrl` | Link to your terms & conditions page |
| `checkoutUrl` | URL of the checkout page (used if the customer navigates back) |
| `confirmationUrl` | Where to redirect the customer after successful payment |

The push (webhook) URL is constructed automatically on the server from the system registry.

## Step 2: Render the Iframe

Inject the HTML snippet into a container element. Scripts within the snippet need to be re-executed:

```ts
function renderSnippet(container: HTMLElement, htmlSnippet: string) {
  container.innerHTML = htmlSnippet

  const scripts = container.querySelectorAll('script')
  scripts.forEach((oldScript) => {
    const newScript = document.createElement('script')
    Array.from(oldScript.attributes).forEach((attr) =>
      newScript.setAttribute(attr.name, attr.value),
    )
    newScript.textContent = oldScript.textContent
    oldScript.parentNode?.replaceChild(newScript, oldScript)
  })
}
```

::: warning Script Re-execution
Setting `innerHTML` does not execute `<script>` tags. You must clone and replace each script element to trigger execution.
:::

## Step 3: Handle Cart Changes

Monitor the `kustomDirty` field via SSE and suspend/resume the Kustom iframe accordingly:

```ts
import { createCartClient } from '@hantera/storefront-sdk/cart'

const client = createCartClient({ baseUrl })

const eventSource = client.subscribeToCartEvents(cartId, {
  onUpdate: (cart) => {
    if (cart.fields?.kustomDirty) {
      window._klarnaCheckout?.suspend()
    } else {
      window._klarnaCheckout?.resume()
    }
  },
})
```

The `_klarnaCheckout` global is injected by the Kustom iframe script and provides `suspend()` and `resume()` methods.

## Step 4: Handle Completion

Cart completion happens server-side when Kustom sends a push notification. Listen for the `completed` state via SSE:

```ts
const eventSource = client.subscribeToCartEvents(cartId, {
  onUpdate: (cart) => {
    if (cart.cartState === 'completed') {
      eventSource.close()
      showOrderConfirmation(cart)
    }
  },
})
```

::: warning Async Completion
The Kustom iframe may show a "thank you" page before the server has finished processing. Always use SSE to detect the actual `completed` state before showing your own confirmation page.
:::

## Complete Example

```ts
import { createCartClient } from '@hantera/storefront-sdk/cart'

const baseUrl = 'https://core.your-instance.hantera.cloud'
const client = createCartClient({ baseUrl })

// 1. Initialize checkout
const origin = window.location.origin
const response = await fetch(
  `${baseUrl}/ingress/commerce/carts/${cartId}/payment/kustom`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      termsUrl: `${origin}/terms`,
      checkoutUrl: `${origin}/checkout`,
      confirmationUrl: `${origin}/confirmation`,
    }),
  },
)
const { htmlSnippet } = await response.json()

// 2. Render iframe
const container = document.getElementById('kustom-checkout')!
container.innerHTML = htmlSnippet
container.querySelectorAll('script').forEach((old) => {
  const s = document.createElement('script')
  Array.from(old.attributes).forEach((a) => s.setAttribute(a.name, a.value))
  s.textContent = old.textContent
  old.parentNode?.replaceChild(s, old)
})

// 3. Listen for cart changes and completion
const eventSource = client.subscribeToCartEvents(cartId, {
  onUpdate: (cart) => {
    if (cart.fields?.kustomDirty) {
      window._klarnaCheckout?.suspend()
    } else {
      window._klarnaCheckout?.resume()
    }

    if (cart.cartState === 'completed') {
      eventSource.close()
      showOrderConfirmation(cart)
    }
  },
})
```
