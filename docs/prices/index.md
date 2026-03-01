# Prices Module

The prices module provides a client for Hantera's price lookup API, including current prices and 30-day price timeline data for EU Omnibus Directive compliance.

## Import

```ts
import { createPriceClient } from '@hantera/storefront-sdk/prices'
```

## Creating a Client

```ts
const prices = createPriceClient({
  baseUrl: 'https://core.your-instance.hantera.cloud',
})
```

## Price Lookup

Look up prices for multiple products across one or more price lists:

```ts
const result = await prices.lookup({
  productNumbers: ['PROD-001', 'PROD-002'],
  priceListKeys: ['RETAIL', 'VIP'],
  currencyCode: 'SEK',
})

if (isPriceError(result)) {
  console.error(result.error.message)
  return
}

for (const product of result.prices) {
  console.log(`${product.productNumber}: ${product.currentPrice} SEK`)
  console.log(`  30-day low: ${product.lowestPrice} SEK`)
}
```

## Price Timeline

Every price lookup includes the 30-day price timeline per product. This tracks how the effective best price has changed over the last 30 days — useful for displaying "lowest price in last 30 days" per the EU Omnibus Directive:

```ts
for (const product of result.prices) {
  if (product.priceTimeline) {
    for (const entry of product.priceTimeline) {
      console.log(`  ${entry.at}: ${entry.price} SEK`)
    }
  }
}
```

See the [API Reference](/prices/api) for the full type definitions.
