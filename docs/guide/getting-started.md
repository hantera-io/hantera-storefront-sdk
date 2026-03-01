# Getting Started

## Installation

```bash
npm install @hantera/storefront-sdk
# or
yarn add @hantera/storefront-sdk
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

## Try it out

Head to the [Cart Playground](/playground/cart) or [Price Playground](/playground/prices) to test against a live Hantera instance.
