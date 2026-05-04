# Configuration

`createCartClient` accepts a configuration object with a single property:

```ts
interface ClientOptions {
  baseUrl: string
}
```

## `baseUrl`

The base URL of your Hantera instance. The SDK automatically appends the `/ingress/commerce/...` paths required by the Commerce app.

```ts
const cart = createCartClient({
  baseUrl: 'https://core.your-instance.hantera.cloud',
})
```

## Tree-shakeable subpath import

If you want to skip the convenience re-export at `@hantera/storefront-sdk` and let your bundler trim the package down to exactly what you use, import from the cart subpath directly:

```ts
import { createCartClient, isCartErrors } from '@hantera/storefront-sdk/cart'
import type { Cart, AddItemRequest } from '@hantera/storefront-sdk/cart'
```

Both subpath imports and the top-level entry point ship as ESM and CJS, with `sideEffects: false` set so unused code can be eliminated.
