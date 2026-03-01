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

if (isCartError(result)) {
  console.error(result.error.message)
} else {
  console.log(result.items)
}
```

**Returns:** `Promise<Cart | CartError>`

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

Sets a custom field on the cart.

```ts
await cart.setField(cartId, 'giftMessage', {
  value: 'Happy birthday!',
})
```

**Returns:** `Promise<CartMutationResponse>`

---

### `deleteField(cartId, key)`

Removes a custom field from the cart.

```ts
await cart.deleteField(cartId, 'giftMessage')
```

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

### `CartError`

```ts
interface CartError {
  error: {
    code: string
    message: string
  }
}
```

### `isCartError(response)`

Type guard to check if a response is a `CartError`.

```ts
import { isCartError } from '@hantera/storefront-sdk/cart'

const result = await cart.getCart(cartId)
if (isCartError(result)) {
  // result is CartError
}
```
