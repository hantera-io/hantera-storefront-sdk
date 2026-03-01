# Prices API Reference

## `createPriceClient(options)`

Creates a new `PriceClient` instance.

```ts
import { createPriceClient } from '@hantera/storefront-sdk/prices'

const prices = createPriceClient({
  baseUrl: 'https://core.your-instance.hantera.cloud',
})
```

### Options

| Property  | Type     | Required | Description                      |
| --------- | -------- | -------- | -------------------------------- |
| `baseUrl` | `string` | Yes      | Base URL of the Hantera instance |

---

## Methods

### `lookup(request)`

Performs a bulk price lookup for multiple products across specified price lists.

```ts
const result = await prices.lookup({
  productNumbers: ['PROD-001', 'PROD-002'],
  priceListKeys: ['RETAIL', 'VIP'],
  currencyCode: 'SEK',
})
```

**Parameters:**

| Field            | Type       | Description                             |
| ---------------- | ---------- | --------------------------------------- |
| `productNumbers` | `string[]` | Product identifiers to look up          |
| `priceListKeys`  | `string[]` | Price list keys to search within        |
| `currencyCode`   | `string`   | ISO currency code (e.g. `SEK`, `EUR`)   |

**Returns:** `Promise<PriceLookupResponse | PriceErrorResponse>`

---

## Types

### `PriceLookupRequest`

```ts
interface PriceLookupRequest {
  productNumbers: string[]
  priceListKeys: string[]
  currencyCode: string
}
```

### `PriceLookupResponse`

```ts
interface PriceLookupResponse {
  currencyCode: string
  prices: ProductPrice[]
}
```

### `ProductPrice`

```ts
interface ProductPrice {
  productNumber: string
  currentPrice: number | null
  lowestPrice: number | null
  priceTimeline: TimelineEntry[] | null
}
```

| Field           | Type                      | Description                                         |
| --------------- | ------------------------- | --------------------------------------------------- |
| `productNumber` | `string`                  | The product identifier                              |
| `currentPrice`  | `number \| null`          | Current effective best price, or `null` if not found |
| `lowestPrice`   | `number \| null`          | Lowest price in the 30-day window                   |
| `priceTimeline` | `TimelineEntry[] \| null` | Chronological price change history                  |

### `TimelineEntry`

```ts
interface TimelineEntry {
  price: number
  at: string
}
```

| Field   | Type     | Description                              |
| ------- | -------- | ---------------------------------------- |
| `price` | `number` | The effective best price at this moment  |
| `at`    | `string` | ISO 8601 timestamp of the price change   |

### `PriceErrorResponse`

```ts
interface PriceErrorResponse {
  error: {
    code: string
    message: string
  }
}
```

### `isPriceError(response)`

Type guard to check if a response is a `PriceErrorResponse`.

```ts
import { isPriceError } from '@hantera/storefront-sdk/prices'

const result = await prices.lookup(request)
if (isPriceError(result)) {
  // result is PriceErrorResponse
}
```
