# Orders Module

The orders module provides customer self-service order lookup. It is separate from the cart module because it is a stateless query by customer reference and e-mail, rather than a mutable cart lifecycle operation.

## Import

```ts
import { createOrdersClient } from '@hantera/storefront-sdk/orders'
```

## Creating a Client

```ts
const orders = createOrdersClient({
  baseUrl: 'https://core.your-instance.hantera.cloud',
})
```

## Lookup

Customers provide a reference and e-mail address. The reference may be:

- a live cart number;
- an order number; or
- a delivery number.

```ts
const result = await orders.lookup({
  reference: 'ORDER-12345',
  email: 'customer@example.com',
})

if (isOrderLookupError(result)) {
  console.error(result.error.code, result.error.message)
} else {
  console.log(result.orderNumber, result.items)
}
```

When a cart still exists, the response uses Commerce's cart rendering. When it does not, Commerce returns an order-based representation instead. Cart-specific fields can therefore be absent, while each order-based item can include its `deliveryNumber`.

## Privacy and Reference Behavior

Lookup is public but e-mail-gated. Commerce compares e-mail addresses case-insensitively against the live cart e-mail or, for an order, its invoice recipient and delivery addresses.

`ORDER_NOT_FOUND` deliberately represents both an unknown reference and an e-mail mismatch. Do not attempt to infer which condition occurred.

A cart number is only valid while its cart exists. Commerce intentionally does not copy cart identity or checkout e-mail onto orders, so a deleted cart's number no longer resolves. Use the order number or a delivery number for historical lookup.

See the [API reference](/orders/api) for types and the [Order Lookup Playground](/playground/orders) to test against a live tenant.