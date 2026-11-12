# Customer Tokens from a Trusted Server

The Orders client needs a **customer token** identifying the Hantera customer numbers whose orders it may read. The SDK does not authenticate shoppers or mint these tokens. A trusted backend authenticates the shopper, determines which customer numbers they may access, and asks Hantera's Storefront app to mint a token for that scope.

There are two different credentials in this flow:

1. A **Hantera OAuth access token** authorizes your backend to call the private mint ingress. Never expose this token or the OAuth client secret to the browser.
2. A **Storefront customer token** is issued for authorized customer numbers and passed to the Orders SDK. It is a bearer token: anyone holding it can use its scope until it expires. It is signed, not encrypted, so its payload is visible to the holder.

## Configure the backend client

Install and activate `apps.storefront` on the test tenant. Its key-rotation job must have created the first key before token issuance will work. Orders also need a `customerNumber` matching the customer's scope.

Create a confidential Hantera [OAuth client](https://developer.hantera.io/resources/iam/clients) with the `client_credentials` grant, provision a client secret, and grant the client (directly or through a role) permission to call the mint ingress:

```text
http/ingress/apps/storefront/mint-token:call
```

The permission uses the ingress **resource ID** `apps/storefront/mint-token`, not its HTTP route. Request that permission as the OAuth scope too: a session's effective permissions are limited by both the requested scope and the client's grants. Use a dedicated client with no broader permissions than needed.

Current Core accepts the canonical permission above and the legacy `ingresses/apps/storefront/mint-token:http` spelling during migration. Older deployments may only support the legacy spelling; if so, grant and request that spelling instead, and verify against the target server. See [Hantera authentication](https://developer.hantera.io/learn/authentication) and [access control](https://developer.hantera.io/learn/access-control).

## Mint on the server

The example below uses `fetch` and `URLSearchParams` available in Node.js 18+. It deliberately accepts only numbers **already authorized by your backend**; integrate it into a server route that authenticates the current shopper and resolves their Hantera customer numbers from your own trusted identity/account mapping. Never let the browser choose an unrestricted number to be signed.

```ts
// customer-token-server.ts — server only
export type CustomerToken = { token: string; expiresAt: number }

export async function mintCustomerToken(
  authorizedCustomerNumbers: string[],
): Promise<CustomerToken> {
  const baseUrl = process.env.HANTERA_BASE_URL?.replace(/\/+$/, '')
  const clientId = process.env.HANTERA_CLIENT_ID
  const clientSecret = process.env.HANTERA_CLIENT_SECRET
  if (!baseUrl || !clientId || !clientSecret) {
    throw new Error('Hantera server credentials are not configured')
  }
  if (
    authorizedCustomerNumbers.length < 1 ||
    authorizedCustomerNumbers.length > 20 ||
    authorizedCustomerNumbers.some((number) => !number.trim() || number.length > 128)
  ) {
    throw new Error('Invalid customer scope')
  }

  const oauthResponse = await fetch(`${baseUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'http/ingress/apps/storefront/mint-token:call',
    }),
  })
  if (!oauthResponse.ok) throw new Error(`Hantera authentication failed (${oauthResponse.status})`)
  const oauth: unknown = await oauthResponse.json()
  if (!oauth || typeof oauth !== 'object' || !('access_token' in oauth) || typeof oauth.access_token !== 'string' || !oauth.access_token) {
    throw new Error('Hantera authentication returned an invalid response')
  }

  const mintResponse = await fetch(`${baseUrl}/ingress/storefront/session`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${oauth.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ customerNumbers: authorizedCustomerNumbers }),
  })
  if (!mintResponse.ok) throw new Error(`Customer token mint failed (${mintResponse.status})`)
  const minted: unknown = await mintResponse.json()
  if (
    !minted || typeof minted !== 'object' ||
    !('token' in minted) || typeof minted.token !== 'string' || !minted.token ||
    !('expiresAt' in minted) || typeof minted.expiresAt !== 'number' ||
    !Number.isFinite(minted.expiresAt) || minted.expiresAt <= Date.now() / 1000
  ) {
    throw new Error('Customer token mint returned an invalid response')
  }
  return { token: minted.token, expiresAt: minted.expiresAt }
}
```

The client ID is the Hantera OAuth client UUID; use the OAuth base URL configured for the target tenant. The OAuth endpoint accepts form-encoded `client_secret_post`, not a JSON body. This example requests a fresh service token each time for clarity; a backend may cache it server-side until shortly before its OAuth `expires_in`. Client-credentials sessions do not issue a refresh token—request a new access token instead.

The mint request sends `{ "customerNumbers": ["CUST-1"] }`. The current issuer accepts 1–20 nonblank numbers, each at most 128 characters. It returns `{ "token": "…", "expiresAt": 1234567890 }`, where `expiresAt` is **Unix seconds**, not milliseconds. Customer tokens currently expire after 30 minutes. If the key has not been initialized, or the scope is invalid, the mint returns `503 TOKEN_UNAVAILABLE`; malformed requests can also fail before the component runs.

## Supply the token to the SDK

Your server route must authenticate the shopper on every mint request, determine the allowed customer numbers on the server, call `mintCustomerToken`, and return only `{ token, expiresAt }` to that shopper over HTTPS with `Cache-Control: no-store`. The route and authentication mechanism are specific to your application; they are **not** supplied by the SDK. If using cookie authentication, apply your application's CSRF and origin protections.

For example, if your backend exposes `POST /api/customer-token` on the storefront's own origin:

```ts
import { createOrdersClient, isOrderLookupError } from '@hantera/storefront-sdk/orders'

const orders = createOrdersClient({
  baseUrl: 'https://core.your-test-tenant.hantera.cloud',
  getCustomerToken: async () => {
    const response = await fetch('/api/customer-token', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`Customer session unavailable (${response.status})`)
    const data: unknown = await response.json()
    if (!data || typeof data !== 'object' || !('token' in data) || typeof data.token !== 'string' || !data.token) {
      throw new Error('Customer session returned an invalid token')
    }
    return data.token
  },
})

const result = await orders.search()
if (isOrderLookupError(result)) throw new Error(result.error.message)
```

The SDK calls `getCustomerToken` for each request and sends its result as the bearer token to Storefront order ingresses. The example does not cache customer tokens; if you cache them in memory, key the cache by tenant, signed-in shopper and authorized scope, renew shortly before `expiresAt`, and clear it on logout, account switch or authorization changes. The SDK does not automatically refresh or retry after a `401`. An already-issued token remains usable until expiry, even if the shopper signs out; shortening that exposure or immediate revocation requires additional design.

## Troubleshooting and handling credentials

- OAuth `400`/`401`: verify the confidential client's ID, secret, grant type and requested scope. Do not return provider error bodies or credentials to the browser.
- Mint `401`: verify the OAuth session's effective permission and the ingress resource ID. On older servers, verify the supported permission spelling.
- Mint `503`: check the requested numbers and that the Storefront key-rotation job has produced a key. Never return an unscoped token as a fallback.
- Empty order search: check that imported or seeded orders have a `customerNumber` in the token's scope and that you are targeting the correct tenant.

Store the OAuth secret in server-side secret management; never embed it in client code, URLs, source control or logs. Redact authorization headers and token response bodies in your proxy, application and Hantera traffic/dev-session logs. Use HTTPS, prevent shared caching, avoid logging customer tokens or their payloads, and restrict access to the backend route. The SDK's order APIs and the separate Returns APIs have different authorization paths; a customer token does not automatically authorize Returns operations.