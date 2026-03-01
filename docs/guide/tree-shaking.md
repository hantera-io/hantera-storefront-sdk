# Tree Shaking

The SDK provides two modules that correspond to separate Hantera platform apps:

- **Cart module** (`@hantera/storefront-sdk/cart`) — requires the **Hantera Commerce** app
- **Prices module** (`@hantera/storefront-sdk/prices`) — requires the **Hantera Price Lists** app

Not every storefront needs both. If you only use one of these apps, import the corresponding subpath and your bundler will exclude the unused module from your build.

## Full Import

If you use both Commerce and Price Lists:

```ts
import { createCartClient, createPriceClient } from '@hantera/storefront-sdk'
```

## Selective Imports

Import only the cart module (prices code is excluded from your bundle):

```ts
import { createCartClient, isCartError } from '@hantera/storefront-sdk/cart'
import type { Cart, AddItemRequest } from '@hantera/storefront-sdk/cart'
```

Import only the prices module:

```ts
import { createPriceClient, isPriceError } from '@hantera/storefront-sdk/prices'
import type { PriceLookupResponse } from '@hantera/storefront-sdk/prices'
```
