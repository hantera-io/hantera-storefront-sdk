# Orders Module

The orders client reads customer-scoped orders from `apps.storefront`, independently of the Commerce cart app. A trusted server authenticates the customer and calls the private Storefront session ingress with the allowed customer numbers. The browser obtains that short-lived token from the trusted server.

Pass a `getCustomerToken` callback to `createOrdersClient`, then use `search` or `lookup`. The callback may cache the token and renew it before expiry. See [Customer Tokens](/orders/customer-tokens) for the server-side OAuth and mint flow, and the [API reference](/orders/api) for client methods.

Customer tokens are signed, not encrypted, and do not make their payload private.