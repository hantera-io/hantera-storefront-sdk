# @hantera/storefront-sdk

TypeScript SDK for building storefronts on the Hantera platform. Provides a tree-shakeable cart and checkout client.

## Installation

```bash
yarn add @hantera/storefront-sdk
```

## Quick Start

```ts
import { createCartClient } from '@hantera/storefront-sdk/cart'

const cart = createCartClient({
  baseUrl: 'https://core.your-instance.hantera.cloud',
})

const { cartId } = await cart.createCart({
  profileKey: 'se-webshop',
  locale: 'sv_se',
})

await cart.addItem(cartId, { productNumber: 'PROD-001', quantity: 1 })
```

## Modules

| Import path                       | Description                                  |
| --------------------------------- | -------------------------------------------- |
| `@hantera/storefront-sdk`         | Re-exports the cart module                   |
| `@hantera/storefront-sdk/cart`    | Cart & checkout client with SSE subscriptions |

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
