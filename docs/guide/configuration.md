# Configuration

Both `createCartClient` and `createPriceClient` accept a configuration object with the same shape:

```ts
interface ClientOptions {
  baseUrl: string
}
```

## `baseUrl`

The base URL of your Hantera instance. The SDK automatically constructs the correct ingress paths for each module (Commerce for carts, Price Lists for prices).

```ts
const cart = createCartClient({
  baseUrl: 'https://core.your-instance.hantera.cloud',
})
```

## Separate Clients

Cart and price operations use independent clients. This means you can point them at different backends if needed, or only instantiate the one you need:

```ts
const cart = createCartClient({ baseUrl: 'https://core.your-instance.hantera.cloud' })
const prices = createPriceClient({ baseUrl: 'https://core.your-instance.hantera.cloud' })
```
