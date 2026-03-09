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
4. **Completion** — Kustom redirects to the confirmation URL; the frontend calls the confirm ingress to finalize the order immediately

## How It Works

### Server-Side Order Creation

When the storefront calls the Kustom checkout ingress, the server:

1. Previews the cart to get current items and totals
2. Creates (or fetches) a Kustom order via the Kustom API
3. Stores the `kustomOrderId` on the cart
4. Returns the `htmlSnippet` containing the iframe

### Cart Synchronization

If the customer modifies the cart after the Kustom iframe is loaded (e.g., changes quantity), the system:

1. Detects the change via the `OnCartMutation` hook (fired by Commerce on every cart mutation)
2. Computes a hash of the Kustom payload and compares it to the stored `kustomSyncHash`
3. If the hash differs, sets `kustomPendingHash` on the cart and schedules a background sync job
4. The storefront detects mismatched hashes via SSE and suspends the iframe
5. After sync completes, `kustomSyncHash` is updated to match, and the iframe resumes

### Payment Completion

When the customer completes payment in the Kustom iframe:

1. Kustom redirects the browser to the `confirmationUrl` with query parameters
2. The frontend detects the redirect and calls the **confirm ingress** (`POST /ingress/commerce/carts/{cartId}/payment/kustom/confirm`)
3. The confirm ingress fetches the Kustom order, and if its status is `checkout_complete`:
   - Creates a Payment with authorization in Hantera
   - Links the payment to the cart and completes it
   - Sends an acknowledgement to Kustom (`POST /ordermanagement/v1/orders/{id}/acknowledge`)
4. The cart completion triggers an SSE update, and the storefront shows the confirmation page

Kustom also sends an asynchronous push notification (typically 2–5 minutes later) to the push notification webhook. The webhook acts as a fallback: if the cart is already completed, it simply acknowledges to Kustom and returns. If the browser-initiated confirm didn't happen (e.g., browser closed), the webhook completes the cart instead.

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
      confirmationUrl: `${origin}/confirmation?redirect_status=succeeded&cart=${cartId}`,
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
| `confirmationUrl` | Where to redirect the customer after successful payment. Include query params so the frontend can detect the redirect and trigger confirmation. |

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

Monitor the cart's sync hashes via SSE and suspend/resume the Kustom iframe when a sync is in progress. The cart has two hash fields: `kustomPendingHash` (set when a sync is needed) and `kustomSyncHash` (set when the sync completes). When they differ, the Kustom order is being updated.

```ts
import { createCartClient } from '@hantera/storefront-sdk/cart'

const client = createCartClient({ baseUrl })

function isKustomSyncing(cart) {
  const pending = cart.fields?.kustomPendingHash
  const synced = cart.fields?.kustomSyncHash
  return pending != null && pending !== synced
}

const eventSource = client.subscribeToCartEvents(cartId, {
  onUpdate: (cart) => {
    window._klarnaCheckout?.((api) => {
      isKustomSyncing(cart) ? api.suspend() : api.resume()
    })
  },
})
```

The `_klarnaCheckout` global is injected by the Kustom iframe script. It's a callback function — call it with a function that receives the `api` object with `suspend()` and `resume()` methods.

## Step 4: Handle Completion via Confirm Ingress

When Kustom redirects the browser to the `confirmationUrl`, detect the redirect and call the confirm ingress. The confirm ingress reads the `kustomOrderId` from the cart, fetches the order from Kustom, and if the status is `checkout_complete`, creates the payment and completes the cart.

```ts
function isRedirectCallback(cartId: string): boolean {
  const params = new URLSearchParams(window.location.search)
  return params.get('redirect_status') === 'succeeded' && params.get('cart') === cartId
}

async function confirmWithKustom(baseUrl: string, cartId: string, attempt = 1) {
  const maxAttempts = 5
  const backoffMs = [0, 1000, 2000, 4000, 8000]

  const res = await fetch(`${baseUrl}/ingress/commerce/carts/${cartId}/payment/kustom/confirm`, { method: 'POST' })
  const data = await res.json()

  if (data?.status === 'checkout_complete') {
    // Cart is now completed — SSE will fire the update
    return
  }

  // Kustom hasn't finalized yet; retry with backoff
  if (attempt < maxAttempts) {
    await new Promise((r) => setTimeout(r, backoffMs[attempt] ?? 4000))
    return confirmWithKustom(baseUrl, cartId, attempt + 1)
  }
}
```

The confirm ingress returns `{ status: "<kustom_order_status>" }`. When the status is `checkout_complete`, the server has already created the payment, completed the cart, and acknowledged to Kustom. The frontend then detects the `completed` cart state via SSE.

::: tip Retry with Backoff
In rare cases, Kustom may redirect the browser before the order status is fully `checkout_complete` on their end. The retry logic handles this by polling the confirm ingress with exponential backoff.
:::

Also listen for the `completed` state via SSE as the primary trigger for showing the confirmation page:

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

### Push Webhook Fallback

The push webhook (`POST /ingress/kustom/webhook/push`) still operates as a safety net. If the browser-based confirm didn't run (browser closed, network issue, etc.), the push notification from Kustom will complete the cart. If the cart is already completed by the time the push arrives, the webhook simply acknowledges to Kustom and returns OK.

## Complete Example

```ts
import { createCartClient } from '@hantera/storefront-sdk/cart'

const baseUrl = 'https://core.your-instance.hantera.cloud'
const client = createCartClient({ baseUrl })

// Check if this is a redirect callback from Kustom
function isRedirectCallback(): boolean {
  const params = new URLSearchParams(window.location.search)
  return params.get('redirect_status') === 'succeeded' && params.get('cart') === cartId
}

if (isRedirectCallback()) {
  // Confirm payment immediately via the confirm ingress
  confirmWithKustom(baseUrl, cartId)
} else {
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
        confirmationUrl: `${origin}/confirmation?redirect_status=succeeded&cart=${cartId}`,
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
}

// 3. Listen for cart changes and completion
function isKustomSyncing(cart) {
  const pending = cart.fields?.kustomPendingHash
  const synced = cart.fields?.kustomSyncHash
  return pending != null && pending !== synced
}

const eventSource = client.subscribeToCartEvents(cartId, {
  onUpdate: (cart) => {
    window._klarnaCheckout?.((api) => {
      isKustomSyncing(cart) ? api.suspend() : api.resume()
    })

    if (cart.cartState === 'completed') {
      eventSource.close()
      showOrderConfirmation(cart)
    }
  },
})

// Confirm helper with retry
async function confirmWithKustom(baseUrl: string, cartId: string, attempt = 1) {
  const maxAttempts = 5
  const backoffMs = [0, 1000, 2000, 4000, 8000]

  try {
    const res = await fetch(`${baseUrl}/ingress/commerce/carts/${cartId}/payment/kustom/confirm`, { method: 'POST' })
    const data = await res.json()

    if (data?.status === 'checkout_complete') return

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, backoffMs[attempt] ?? 4000))
      return confirmWithKustom(baseUrl, cartId, attempt + 1)
    }
  } catch {
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, backoffMs[attempt] ?? 4000))
      return confirmWithKustom(baseUrl, cartId, attempt + 1)
    }
  }
}
```
