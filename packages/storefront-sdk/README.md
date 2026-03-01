# @hantera/storefront-sdk

Cart, checkout, and price lookup for headless storefronts powered by [Hantera](https://www.hantera.io).

## Installation

```bash
npm install @hantera/storefront-sdk
```

## Quick Start

```ts
import { createCartClient, createPriceClient } from '@hantera/storefront-sdk'

const cart = createCartClient({
  baseUrl: 'https://core.your-instance.hantera.cloud',
})

const prices = createPriceClient({
  baseUrl: 'https://core.your-instance.hantera.cloud',
})

// Create a cart
const { cartId } = await cart.createCart({
  currencyCode: 'SEK',
  channelKey: 'retail_SE',
})

// Add an item
await cart.addItem(cartId, {
  productNumber: 'SH005-BLK-10',
  quantity: 1,
})

// Look up prices
const result = await prices.lookup({
  productNumbers: ['SH005-BLK-10'],
  priceListKeys: ['RETAIL'],
  currencyCode: 'SEK',
})
```

## Documentation

Full documentation, configuration guides, and API reference at **[storefront.hantera.dev](https://storefront.hantera.dev)**.

## License

[Apache-2.0](https://github.com/hantera-io/hantera-storefront-sdk/blob/main/LICENSE)
