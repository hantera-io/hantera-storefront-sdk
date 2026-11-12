# Orders API Reference

`createOrdersClient({ baseUrl, getCustomerToken })` requires a callback that returns the current customer token, synchronously or asynchronously. The callback is invoked on each request; the host handles renewal.

For the server-side OAuth client-credentials request and customer-token mint, see [Customer Tokens](/orders/customer-tokens).

```ts
import { createOrdersClient, isOrderLookupError } from '@hantera/storefront-sdk/orders'

const orders = createOrdersClient({
  baseUrl: 'https://core.your-instance.hantera.cloud',
  getCustomerToken: () => getTokenFromYourBackend(),
})

const found = await orders.lookup({ reference: 'ORDER-12345' })
const history = await orders.search({ customerNumber: 'CUST-1' })
if (isOrderLookupError(found)) console.error(found.error.message)
if (isOrderLookupError(history)) console.error(history.error.message)
```

`lookup` accepts an order or delivery reference. `search` returns at most 50 newest orders. Both accept an optional `customerNumber` to narrow the token's scope; omitting it uses all scoped accounts. A number outside the scope returns `FORBIDDEN`. Unknown and out-of-scope orders return `ORDER_NOT_FOUND`.

The Storefront app must be installed, and each order needs `customerNumber`. The response is order-based, with order state, deliveries, lines, amounts, promotions and payments; it does not contain cart identity or support cart references.