# Orders API Reference

## `createOrdersClient(options)`

Creates an `OrdersClient` for customer self-service order lookup.

```ts
import { createOrdersClient } from '@hantera/storefront-sdk/orders'

const orders = createOrdersClient({
  baseUrl: 'https://core.your-instance.hantera.cloud',
})
```

### Options

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `baseUrl` | `string` | Yes | Base URL of the Hantera instance |

---

## `lookup(request)`

Looks up a customer-facing order representation by a live cart number, order number, or delivery number and a matching e-mail address.

```ts
const result = await orders.lookup({
  reference: 'ORDER-12345',
  email: 'customer@example.com',
})

if (isOrderLookupError(result)) {
  console.error(result.error.code, result.error.message)
  return
}

console.log(result.orderNumber)
console.log(result.items)
```

### Request

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `reference` | `string` | Yes | Live cart number, order number, or delivery number |
| `email` | `string` | Yes | E-mail associated with the cart or order |

### Returns

`Promise<OrderLookupResponse>` — either `OrderLookup` or `OrderLookupError`.

Use `isOrderLookupError(result)` to narrow the result.

| Error code | Meaning |
| --- | --- |
| `ORDER_NOT_FOUND` | The reference was not found or the supplied e-mail does not match. These cases are intentionally indistinguishable. |
| `INVALID_REQUEST` | `reference` or `email` was blank. |

### `OrderLookup`

The response contains order totals, taxes, shipping, customer contact information, promotions, payments, custom fields, and order items.

| Property | Notes |
| --- | --- |
| `orderId`, `orderNumber` | Durable order identity. |
| `items` | Product lines with quantity, prices, totals, tax, discount, and optionally `deliveryNumber`. |
| `cartId`, `cartNumber`, `profileKey` | Present only when Commerce can render a live originating cart. Do not use them as durable order identifiers. |
| `invoiceRecipient`, `address` | Customer addresses when supplied by the order/cart. |
| `promotions`, `payments` | Applied promotion and payment summaries. |

Cart numbers stop resolving after cart deletion. For completed historical orders, store or display the `orderNumber` and delivery numbers instead.