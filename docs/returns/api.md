# Returns API

Import `createReturnsClient` from `@hantera/storefront-sdk/returns`. Install the Returns and Storefront apps;
the host backend must authenticate the customer and supply Storefront customer tokens.

```ts
import { createReturnsClient } from '@hantera/storefront-sdk/returns'

const returns = createReturnsClient({
  baseUrl: 'https://core.example.com',
  getCustomerToken: () => getTokenFromYourBackend(),
})
const { claims } = await returns.lookupClaims('ORDER-123')
const stop = returns.subscribeClaims('ORDER-123', () => {
  void returns.lookupClaims('ORDER-123').then(updateClaims)
}, showConnectionError)
// Call stop when the view closes or the customer context changes.
```

Lookup and `streamClaims(orderNumber, signal, onChange)` obtain a token per call. `subscribeClaims`
automatically reconnects with a fresh callback token, periodically reconnects to resynchronize actor paths,
and returns an unsubscribe function. Stream events are invalidations, not complete claim snapshots. Delivery
is best-effort; applications should also refresh periodically. `ReturnsError` carries `code` and HTTP `status`;
SSE errors use status zero. Cancellation is signaled by the provided `AbortSignal`.

`reasonEligibility({ orderNumber, email, orderLineNumber })` and `createClaim(request)` wrap the existing
Returns public registration APIs. They use order-number-plus-email ownership checks, **not** customer tokens;
claim submission is controlled by the Returns `publicCreateClaimEnabled` setting. There is currently no
order-wide eligible-lines endpoint.

`searchExchangeProducts({ orderNumber, email, orderLineNumber, reason, phrase?, locale }, signal?)` searches
products for an exchange-eligible line. Omit the phrase to load initial choices. The response contains up to
100 products and `hasMore`: true when another eligible product was observed, or null when the provider's
completeness is unknown. A null or empty result does not prove that there are no other matches. Search is
best effort and does not reserve stock. Pass the chosen `exchangeProductNumber` on the relevant `createClaim`
line. Submission re-evaluates the first matching exchange policy and checks target labels through product lookup
when matching categories are configured. `returnShippingOptions(orderNumber, email, signal?)` returns customer-selectable
shipping options. These registration operations use order-number-plus-email checks, not customer tokens.

The current Storefront token implementation and demo issuer are proofs of concept, not a production security
boundary. Follow Storefront's hardening guidance before using real customer data.