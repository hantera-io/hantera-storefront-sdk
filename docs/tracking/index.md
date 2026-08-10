# Conversion Tracking

Hantera's tracking apps ([Google Analytics](https://developer.hantera.io/official-apps/tracking/google-analytics/),
[Meta](https://developer.hantera.io/official-apps/tracking/meta/),
[Awin](https://developer.hantera.io/official-apps/tracking/awin/)) report
conversions **server-side**, from the order rather than from the browser, so they
survive ad blockers and shoppers who close the tab before the thank-you page.

They need one thing only the browser knows: **who the shopper is, in the ad
platform's own terms**. That lives in a cookie or a landing-page query parameter,
so the storefront has to capture it and put it on the cart.

```
browser cookie / query param
        │  storefront captures it
        ▼
cart.setField('tracking:<key>', value)   →  cart.dynamic['field:tracking:<key>']
        │  cart completes
        ▼
order.dynamic['cart:tracking:<key>']     →  tracking app reads it
```

::: warning Without this, the tracking apps report nothing
Each app treats a missing identifier as "this order is not attributable" and skips
the order rather than guessing. This is the step that makes the rest work.
:::

## The identifiers

| Meaning | Source | Cart field key | Used by |
|---|---|---|---|
| GA client id | `_ga` cookie | `tracking:gaClientId` | Google Analytics |
| GA session id | `_ga_<container-id>` cookie | `tracking:gaSessionId:G-XXXXXXXXXX` | Google Analytics |
| Meta browser id | `_fbp` cookie | `tracking:fbp` | Meta |
| Meta click id | `_fbc` cookie / `fbclid` param | `tracking:fbc` | Meta |
| Awin click value | `awc` query parameter | `tracking:awc` | Awin |

The `field:` prefix is added for you — pass the key as shown above.

::: tip One GA session id per property
`_ga` is a single cookie for the whole domain, but GA keeps **session** state in
`_ga_<container-id>`, one cookie per measurement id. A site tagged with a master
property *and* a per-market property has two unrelated session ids, so the key is
suffixed with the measurement id. See [Google Analytics](#google-analytics) below.
:::

Commerce also captures the user-agent, client IP and storefront origin from the
request headers when the cart is created, so you don't send those. For them to be
right, create the cart from the shopper's browser — or forward the shopper's
`User-Agent`, IP and `Origin` if you proxy it server-side.

## The timing problem

Tracking ids and cart lifecycle don't line up:

- The ids are readable on the **landing page**, often before any cart exists.
- `awc` appears **only** on that first page view.
- A tag may load **after** your code runs, or only once consent is granted.
- The cart is often completed by a **PSP callback**, not by your code.

So "read the ids and call `setField`" doesn't survive contact with reality. You
need a small buffer: capture whenever a value appears, flush whenever a cart is
available.

::: info Why the SDK doesn't do this for you
A buffer has to know which cart is active, when consent was granted, and how to
survive navigation. Those are decisions about *your* architecture — Next.js
middleware, a Nuxt plugin and a plain SPA all answer them differently, and several
carts can be open at once. So the SDK stays out of it, and this page gives you a
reference implementation to own.
:::

## A reference buffer

Roughly 40 lines, yours to adapt. Capture writes to `sessionStorage`; the flush
runs whenever a cart becomes available.

```js
// tracking-buffer.js
const KEY = 'hantera:tracking'

let cartClient = null
let activeCartId = null

function read() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

/**
 * Record a tracking id. Safe to call before a cart exists, and safe to call
 * repeatedly — last write wins, so a refreshed GA session id replaces a stale
 * one rather than queueing behind it.
 */
export function trackField(key, value) {
  if (!value) return

  const buffer = read()
  if (buffer[key] === value) return

  buffer[key] = value
  sessionStorage.setItem(KEY, JSON.stringify(buffer))

  if (cartClient && activeCartId) void flush()
}

/** Tell the buffer which cart to write to, and flush what we already have. */
export async function attachCart(client, cartId) {
  cartClient = client
  activeCartId = cartId
  await flush()
}

/** Stop writing once the cart is completed — `set-field` would fail anyway. */
export function detachCart() {
  activeCartId = null
}

async function flush() {
  // Values stay buffered after a successful send: a *new* cart in the same
  // session needs them too, and re-sending an unchanged value is harmless.
  for (const [key, value] of Object.entries(read())) {
    try {
      await cartClient.setField(activeCartId, key, { value })
    } catch {
      // Leave it buffered; the next flush retries it.
    }
  }
}
```

Wire it into the cart lifecycle:

```js
import { createCartClient } from '@hantera/storefront-sdk/cart'
import { attachCart, detachCart } from './tracking-buffer'

const cart = createCartClient({ baseUrl: 'https://core.example.hantera.cloud' })

const { cartId } = await cart.createCart({ profileKey: 'se-webshop', locale: 'sv_se' })
await attachCart(cart, cartId)
```

Call `attachCart` again for a cart restored from storage on a later page load, and
`detachCart()` once the cart completes.

::: warning Several carts at once
`attachCart` targets **one** cart. Don't fan tracking ids across every open cart —
that attributes one shopper's session to unrelated orders, which is the same class
of bug as sharing a session id between properties. If your storefront keeps
several carts, buffer per cart id or re-attach when the shopper switches.
:::

## Capturing from a tag manager

Tags in GTM usually run **before** your bundle loads, and can't `import` from it.
Expose a global that queues early calls, in `<head>` **before** the GTM snippet:

```html
<script>
  window.hanteraTracking = window.hanteraTracking || { q: [] }
  window.hanteraTracking.trackField =
    window.hanteraTracking.trackField ||
    function () { window.hanteraTracking.q.push(arguments) }
</script>
```

Then drain the queue once your bundle is running:

```js
import { trackField } from './tracking-buffer'

const queued = window.hanteraTracking?.q ?? []
window.hanteraTracking = { q: [], trackField }
for (const args of queued) trackField(...args)
```

Now a GTM custom-HTML tag can report ids with no bundle dependency, in any order:

```html
<script>
  window.hanteraTracking.trackField('tracking:fbp', /* … */)
</script>
```

::: danger Skipping the stub loses data silently
A tag that fires before the bundle finds `window.hanteraTracking` undefined and
throws inside the tag, where nobody is watching. The stub is what makes tag order
irrelevant.
:::

## Google Analytics

`gtag('get', …)` takes the measurement id as its target, so it returns that
**property's** ids — exactly what a per-property session id needs. It also avoids
parsing a cookie format that has already changed once between GA versions.

One tag per property, each naming its own measurement id:

```html
<script>
  var MEASUREMENT_ID = 'G-AAAAAAAAAA'

  gtag('get', MEASUREMENT_ID, 'client_id', function (clientId) {
    window.hanteraTracking.trackField('tracking:gaClientId', clientId)
  })

  gtag('get', MEASUREMENT_ID, 'session_id', function (sessionId) {
    window.hanteraTracking.trackField(
      'tracking:gaSessionId:' + MEASUREMENT_ID,
      sessionId
    )
  })
</script>
```

Two properties on the page ⇒ two tags ⇒ two keyed session ids, and each property
receives its own. No configured list of measurement ids is needed anywhere,
because each tag already knows which property it belongs to.

::: tip Session ids go stale on their own
The GA tag re-runs on every page load and reports a fresh session id, overwriting
the buffered value before any new cart exists. No expiry logic required.
:::

### Without a tag manager

Read the cookies directly. `_ga` holds the client id; each `_ga_<container-id>`
holds one property's session id, where the container id is the measurement id
without its `G-` prefix.

```js
function readCookie(name) {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(name + '='))
    ?.split('=')[1]
}

// _ga = GA1.1.1234567890.1712345678  →  client id is the last two segments
trackField('tracking:gaClientId', readCookie('_ga')?.split('.').slice(-2).join('.'))

// _ga_ABCDEF1234 = GS1.1.1712345678.1.1.…  →  session id is index 2
for (const measurementId of ['G-ABCDEF1234']) {
  const container = measurementId.replace(/^G-/, '')
  const sessionId = readCookie(`_ga_${container}`)?.split('.')[2]
  trackField(`tracking:gaSessionId:${measurementId}`, sessionId)
}
```

The cookies only exist once the GA tag has run, so read them after it loads.
Prefer `gtag('get', …)` where you can — the cookie value format is undocumented.

## Meta

Meta's Pixel writes `_fbp`, and `_fbc` when the shopper arrived from an ad. If
`_fbc` is missing but the landing URL carries `fbclid`, Meta's documented format
is `fb.1.<timestamp>.<fbclid>`:

```js
const fbclid = new URLSearchParams(location.search).get('fbclid')

trackField('tracking:fbp', readCookie('_fbp'))
trackField(
  'tracking:fbc',
  readCookie('_fbc') ?? (fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined)
)
```

## Awin

Awin appends `awc` to the landing URL on an affiliate click, and it is present
**only on that page view**. Capture it as soon as the shopper lands — the buffer
holds it until a cart exists:

```js
trackField('tracking:awc', new URLSearchParams(location.search).get('awc'))
```

## Consent

These identifiers are personal data, and the storefront is the only layer that
knows what the shopper agreed to. Gate capture on consent and the whole chain
below stays clean:

```js
if (hasAnalyticsConsent()) {
  trackField('tracking:gaClientId', clientId)
}
```

An id that was never captured is an order the tracking apps quietly skip. When
consent arrives mid-session, capture then — the buffer flushes immediately if a
cart is already attached.

## Verifying

1. **On the cart** — any mutation response echoes the values back under `fields`,
   without the `field:` prefix:
   ```json
   {
     "fields": {
       "tracking:gaClientId": "1234567890.1712345678",
       "tracking:gaSessionId:G-AAAAAAAAAA": "1712345678"
     }
   }
   ```
2. **On the order** — check `dynamic` in the Hantera portal's order view; the keys
   arrive prefixed with `cart:`.
3. **In the job log** — a missing id is reported explicitly, e.g.
   `Order LS123456 has no GA client id; skipping`.

## See Also

- [Cart API Reference](/cart/api) — `setField` and the rest of the cart client
- [Conversion Tracking apps](https://developer.hantera.io/official-apps/tracking/) — what each app sends and when
- [Cart Dynamic Fields](https://developer.hantera.io/official-apps/commerce/dynamic-fields) — how `field:` keys reach the order
