# Returns API

Reason eligibility responses also expose merchant-configured `claimTypes` (`{ key, label, description?: string | null }`) and each
reason's `claimTypes` keys. Submitting a `claimType` validates membership; an omitted type retains
the legacy request behavior. Descriptions are optional plain text; existing responses may omit them.
`uncategorized` represents reasons with no assigned types.

`withdrawalAvailability(orderNumber, email, signal?)` checks the server's current withdrawal window
and returns remaining claimable line quantities. `createWithdrawal({ orderNumber, email,
returnShippingOptionKey? }, signal?)` asks the server to recheck and create a withdrawal for all
remaining quantities. The response is a `ClaimCreateResponse`; requesting a refund does not imply approval.

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

`lookupClaimMessages(orderNumber, claimNumber, after?, signal?)` returns a page with `messages` and
`nextCursor`; follow the cursor until null, or use `getAllClaimMessages(orderNumber, claimNumber, signal?)`.
Public messages expose their ID, time, text and `customer`/`operator` author kind, not an operator identity.
`sendClaimMessage({orderNumber, claimNumber, messageId, body}, signal?)` posts as the authenticated
customer. Generate a UUID for each message and reuse it for retries. A retry can return
`MESSAGE_NOT_CONFIRMED` after an ambiguous successful write; re-read the conversation and match the ID
before deciding what happened. Subscribe to claim invalidations and re-fetch messages; also refresh
periodically when streaming is unavailable. This messaging integration is awaiting live verification.

`reasonEligibility({ orderNumber, email, orderLineNumber })` and `createClaim(request)` wrap the existing
Returns public registration APIs. They use order-number-plus-email ownership checks, **not** customer tokens;
claim submission is controlled by the Returns `publicCreateClaimEnabled` setting. There is currently no
order-wide eligible-lines endpoint.

Each discovered reason includes `pictureRequired`. Supply selected browser `File` objects in the
corresponding `createClaim` line's `pictures` array when required. The client always sends multipart to
`/returns/storefront/claims`, including when there are no pictures; direct HTTP clients must send one JSON
`request` part and optional `pictures` parts. The previous JSON-only contract and `/claims/with-pictures`
route are removed. A nonblank claim-level `comment` is trimmed and becomes the first customer message;
the maximum is 4000 characters. The JSON part is limited to 128 KiB. The server rechecks the policy, validates
image signatures and limits uploads to five JPEG, PNG or WebP files, 5 MiB each and 10 MiB total request.
Picture upload requires a Core server with multipart token support and a Returns app with safe orphan
cleanup; the current integration is not yet production-ready.

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