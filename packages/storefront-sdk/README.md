# @hantera/storefront-sdk

Cart, checkout, and customer order lookup for headless storefronts powered by [Hantera](https://www.hantera.io).

## Installation

```bash
npm install @hantera/storefront-sdk
```

## Quick Start

```ts
import { createCartClient, createOrdersClient } from '@hantera/storefront-sdk'

const cart = createCartClient({
  baseUrl: 'https://core.your-instance.hantera.cloud',
})

const orders = createOrdersClient({
  baseUrl: 'https://core.your-instance.hantera.cloud',
})

// Create a cart
const { cartId } = await cart.createCart({
  profileKey: 'se-webshop',
  locale: 'sv_SE',
})

// Add an item
await cart.addItem(cartId, {
  productNumber: 'SH005-BLK-10',
  quantity: 1,
})

// Look up a completed order by its order or delivery reference and e-mail
const result = await orders.lookup({
  reference: 'ORDER-12345',
  email: 'customer@example.com',
})

// Cancel the order created from a completed cart
// (only allowed before any delivery enters processing)
await cart.cancelOrder(cartId)
```

## Documentation

Full documentation, configuration guides, and API reference at **[storefront.hantera.dev](https://storefront.hantera.dev)**.

## License

[Apache-2.0](https://github.com/hantera-io/hantera-storefront-sdk/blob/main/LICENSE)
