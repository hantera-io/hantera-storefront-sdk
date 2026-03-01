# Cart API Reference

## `createCartClient(options)`

Creates a new `CartClient` instance.

```ts
import { createCartClient } from '@hantera/storefront-sdk/cart'

const cart = createCartClient({
  baseUrl: 'https://core.your-instance.hantera.cloud',
})
```

### Options

| Property  | Type     | Required | Description                      |
| --------- | -------- | -------- | -------------------------------- |
| `baseUrl` | `string` | Yes      | Base URL of the Hantera instance |

---

## Methods

All mutation methods return a `CartMutationResponse` (`Cart | CartErrors`), providing the updated cart state immediately. This means you can update your UI from the mutation response without waiting for an SSE event round-trip.

### `createCart(request)`

Creates a new cart.

```ts
const { cartId } = await cart.createCart({
  currencyCode: 'SEK',
  channelKey: 'web-se',
})
```

**Parameters:**

| Field          | Type     | Description                    |
| -------------- | -------- | ------------------------------ |
| `currencyCode` | `string` | ISO currency code (e.g. `SEK`) |
| `channelKey`   | `string` | Sales channel identifier       |

**Returns:** `Promise<CreateCartResponse>` — `{ cartId: string }`

---

### `getCart(cartId)`

Fetches the current cart state.

```ts
const result = await cart.getCart(cartId)

if (isCartErrors(result)) {
  result.errors.forEach((e) => console.error(e.code, e.message))
} else {
  console.log(result.items)
}
```

**Returns:** `Promise<Cart | CartErrors>`

---

### `addItem(cartId, request)`

Adds an item to the cart.

```ts
await cart.addItem(cartId, {
  productNumber: 'PROD-001',
  quantity: 2,
})
```

**Parameters:**

| Field           | Type     | Description        |
| --------------- | -------- | ------------------ |
| `productNumber` | `string` | Product identifier |
| `quantity`      | `number` | Quantity to add    |

**Returns:** `Promise<CartMutationResponse>`

---

### `removeItem(cartId, request)`

Removes an item from the cart.

```ts
await cart.removeItem(cartId, {
  cartItemId: 'item-uuid-here',
})
```

**Parameters:**

| Field        | Type     | Description          |
| ------------ | -------- | -------------------- |
| `cartItemId` | `string` | Cart item identifier |

**Returns:** `Promise<CartMutationResponse>`

---

### `setQuantity(cartId, request)`

Sets the quantity of an existing cart item. The cart is re-validated (including price lookup) before applying the change.

```ts
await cart.setQuantity(cartId, {
  cartItemId: 'item-uuid-here',
  quantity: 3,
})
```

**Parameters:**

| Field        | Type     | Description              |
| ------------ | -------- | ------------------------ |
| `cartItemId` | `string` | Cart item identifier     |
| `quantity`   | `number` | New quantity for the item |

**Returns:** `Promise<CartMutationResponse>`

---

### `addCoupon(cartId, couponCode)`

Adds a coupon code to the cart.

```ts
await cart.addCoupon(cartId, 'SUMMER2026')
```

**Returns:** `Promise<CartMutationResponse>`

---

### `removeCoupon(cartId, couponCode)`

Removes a previously added coupon from the cart.

```ts
await cart.removeCoupon(cartId, 'SUMMER2026')
```

**Parameters:**

| Field        | Type     | Description              |
| ------------ | -------- | ------------------------ |
| `couponCode` | `string` | The coupon code to remove |

**Returns:** `Promise<CartMutationResponse>`

---

### `setAddress(cartId, request)`

Sets delivery and/or invoice addresses. Pass `'unset'` to clear an address.

```ts
await cart.setAddress(cartId, {
  deliveryAddress: {
    name: 'John Doe',
    addressLine1: 'Storgatan 1',
    city: 'Stockholm',
    postalCode: '11122',
    countryCode: 'SE',
  },
  invoiceAddress: 'unset',
})
```

**Parameters:**

| Field             | Type                    | Description                          |
| ----------------- | ----------------------- | ------------------------------------ |
| `deliveryAddress` | `Address \| 'unset'`    | Delivery address or `'unset'`        |
| `invoiceAddress`  | `Address \| 'unset'`    | Invoice address or `'unset'`         |

**Returns:** `Promise<CartMutationResponse>`

---

### `setEmail(cartId, email)`

Sets the customer email on the cart.

```ts
await cart.setEmail(cartId, 'john@example.com')
```

**Returns:** `Promise<CartMutationResponse>`

---

### `setPhone(cartId, phone)`

Sets the customer phone number on the cart.

```ts
await cart.setPhone(cartId, '+46701234567')
```

**Returns:** `Promise<CartMutationResponse>`

---

### `setField(cartId, key, request)`

Sets a custom field on the cart. Custom fields are namespaced internally to prevent collisions with standard cart properties — the key you provide is stored with a `field:` prefix, which is automatically stripped in the `fields` property of the cart response.

```ts
await cart.setField(cartId, 'giftMessage', {
  value: 'Happy birthday!',
})

// The cart response will include: { fields: { giftMessage: 'Happy birthday!' } }
```

**Parameters:**

| Field   | Type      | Description                |
| ------- | --------- | -------------------------- |
| `key`   | `string`  | Custom field key           |
| `value` | `unknown` | Value to store for the key |

**Returns:** `Promise<CartMutationResponse>`

---

### `deleteField(cartId, key)`

Removes a custom field from the cart.

```ts
await cart.deleteField(cartId, 'giftMessage')
```

**Parameters:**

| Field | Type     | Description                  |
| ----- | -------- | ---------------------------- |
| `key` | `string` | Custom field key to remove   |

**Returns:** `Promise<CartMutationResponse>`

---

### `submitPayment(cartId, paymentType, body)`

Submits a payment for checkout.

```ts
await cart.submitPayment(cartId, 'stripe', {
  token: 'tok_visa',
})
```

**Parameters:**

| Field         | Type      | Description                         |
| ------------- | --------- | ----------------------------------- |
| `paymentType` | `string`  | Payment provider key (e.g. `stripe`) |
| `body`        | `unknown` | Provider-specific payment payload   |

**Returns:** `Promise<unknown>`

---

### `subscribeToCartEvents(cartId, handlers)`

Subscribes to real-time cart updates via Server-Sent Events.

```ts
const eventSource = cart.subscribeToCartEvents(cartId, {
  onInit: (cart) => console.log('Connected', cart),
  onUpdate: (cart) => console.log('Updated', cart),
  onError: (data) => console.error('Error', data),
  onConnectionError: (event) => console.error('Connection lost', event),
})

// Clean up
eventSource.close()
```

**Event Handlers:**

| Handler             | Argument  | Description                   |
| ------------------- | --------- | ----------------------------- |
| `onInit`            | `Cart`    | Full cart state on connection |
| `onUpdate`          | `Cart`    | Cart state after a mutation   |
| `onError`           | `unknown` | Application-level error       |
| `onConnectionError` | `Event`   | SSE connection error          |

**Returns:** `EventSource` — call `.close()` to unsubscribe.

---

## Types

### `Cart`

```ts
interface Cart {
  cartId: string
  cartNumber: string
  orderNumber: string
  cartState: string
  channelKey: string
  currencyCode: string
  customer?: Record<string, unknown>
  deliveryAddress?: Address
  invoiceAddress?: Address
  items: CartItem[]
  fields?: Record<string, unknown>
  taxIncluded: boolean
  orderTotal: number
  orderTaxTotal: number
  email?: string
  phone?: string
}
```

### `CartItem`

```ts
interface CartItem {
  cartItemId: string
  productNumber: string
  quantity: number
  description?: string
  image?: string
  total: number
  tax: number
  unitPrice: number
}
```

### `Address`

```ts
interface Address {
  name?: string
  careOf?: string
  attention?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  countryCode?: string
}
```

### `SetQuantityRequest`

```ts
interface SetQuantityRequest {
  cartItemId: string
  quantity: number
}
```

### `SetFieldRequest`

```ts
interface SetFieldRequest {
  value: unknown
}
```

### `CartErrors`

Represents an error response from the Hantera API. The runtime wraps ingress errors into this shape automatically.

```ts
interface CartErrors {
  errors: CartErrorItem[]
}
```

### `CartErrorItem`

```ts
interface CartErrorItem {
  code: string
  message: string
  details?: Record<string, unknown>
}
```

### `isCartErrors(response)`

Type guard to check if a response is a `CartErrors`.

```ts
import { isCartErrors } from '@hantera/storefront-sdk/cart'

const result = await cart.addItem(cartId, { productNumber: 'PROD-001', quantity: 2 })
if (isCartErrors(result)) {
  result.errors.forEach((e) => console.error(e.code, e.message))
}
```
