import { defineConfig } from 'vitepress'
import path from 'node:path'

const sdkSrc = path.resolve(__dirname, '../../packages/storefront-sdk/src')

export default defineConfig({
  title: 'Hantera Storefront SDK',
  description: 'Cart, checkout, and customer order lookup for headless storefronts',
  head: [['link', { rel: 'icon', href: '/favicon.png' }]],
  vite: {
    resolve: {
      alias: {
        '@hantera/storefront-sdk/cart': path.join(sdkSrc, 'cart/index.ts'),
        '@hantera/storefront-sdk/orders': path.join(sdkSrc, 'orders/index.ts'),
        '@hantera/storefront-sdk': path.join(sdkSrc, 'index.ts'),
      },
    },
  },
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Cart', link: '/cart/' },
      { text: 'Orders', link: '/orders/' },
      { text: 'Checkout', link: '/checkout/' },
      { text: 'Tracking', link: '/tracking/' },
      { text: 'Playground', link: '/playground/cart' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Configuration', link: '/guide/configuration' },
        ],
      },
      {
        text: 'Cart Module',
        items: [
          { text: 'Overview', link: '/cart/' },
          { text: 'API Reference', link: '/cart/api' },
        ],
      },
      {
        text: 'Checkout',
        items: [
          { text: 'Overview', link: '/checkout/' },
          { text: 'Stripe', link: '/checkout/stripe' },
          { text: 'Stripe Express', link: '/checkout/stripe-express' },
          { text: 'Kustom (KCO)', link: '/checkout/kustom' },
          { text: 'Demo', link: '/checkout/demo' },
        ],
      },
      {
        text: 'Orders Module',
        items: [
          { text: 'Overview', link: '/orders/' },
          { text: 'API Reference', link: '/orders/api' },
        ],
      },
      {
        text: 'Tracking',
        items: [
          { text: 'Conversion Tracking', link: '/tracking/' },
        ],
      },
      {
        text: 'Playground',
        items: [
          { text: 'Cart', link: '/playground/cart' },
          { text: 'Order Lookup', link: '/playground/orders' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/hantera-io/hantera-storefront-sdk' },
    ],
  },
})
