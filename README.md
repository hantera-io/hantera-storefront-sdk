# @hantera/storefront-sdk

TypeScript SDK for building storefronts on the Hantera platform. Provides tree-shakeable modules for cart/checkout and price lookup APIs.

## Installation

```bash
yarn add @hantera/storefront-sdk
```

## Quick Start

### Cart

```ts
import { createCartClient } from '@hantera/storefront-sdk/cart'

const cart = createCartClient({
  baseUrl: 'https://your-instance.hantera.io/ingress/store',
})

const { cartId } = await cart.createCart({
  currencyCode: 'SEK',
  channelKey: 'web-se',
})

await cart.addItem(cartId, { productNumber: 'PROD-001', quantity: 1 })
```

### Prices

```ts
import { createPriceClient } from '@hantera/storefront-sdk/prices'

const prices = createPriceClient({
  baseUrl: 'https://your-instance.hantera.io/ingress/store',
})

const result = await prices.lookup({
  productNumbers: ['PROD-001'],
  priceListKeys: ['RETAIL'],
  currencyCode: 'SEK',
})
```

## Modules

| Import path                       | Description                                  |
| --------------------------------- | -------------------------------------------- |
| `@hantera/storefront-sdk`         | Re-exports all modules                       |
| `@hantera/storefront-sdk/cart`    | Cart & checkout client with SSE subscriptions |
| `@hantera/storefront-sdk/prices`  | Price lookup with 30-day timeline             |

Each module can be imported independently for optimal tree-shaking.

## Documentation

The full documentation and interactive playground is available at the docs site. To run it locally:

```bash
yarn install
yarn docs:dev
```

## Development

This is a Yarn workspaces monorepo:

```
packages/storefront-sdk/   # The npm package
docs/                      # VitePress documentation site
```

### Build the SDK

```bash
yarn workspace @hantera/storefront-sdk build
```

### Run docs locally

```bash
yarn docs:dev
```

### Build docs for deployment

```bash
yarn docs:build
```

The docs site builds to `docs/.vitepress/dist/` and can be deployed as a static site.

## License

Apache 2.0

Copyright 2026 Hantera AB
