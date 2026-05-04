# Getting Started

## Installation

```bash
npm install @hantera/storefront-sdk
# or
yarn add @hantera/storefront-sdk
```

## Quick Start

```ts
import { createCartClient, isCartErrors } from '@hantera/storefront-sdk/cart'

const cart = createCartClient({
  baseUrl: 'https://core.your-instance.hantera.cloud',
})

// Create a cart from a configured cart profile
const { cartId } = await cart.createCart({
  profileKey: 'se-webshop',
  locale: 'sv_se',
})

// Add an item — the cart profile determines currency, channel, and tax handling
const result = await cart.addItem(cartId, {
  productNumber: 'SH005-BLK-10',
  quantity: 1,
})

if (isCartErrors(result)) {
  result.errors.forEach((e) => console.error(e.code, e.message))
}
```

## Try it out

Head to the [Cart Playground](/playground/cart) to test against a live Hantera instance.
