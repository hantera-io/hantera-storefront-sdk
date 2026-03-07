import { defineConfig } from 'vitepress'
import path from 'node:path'

const sdkSrc = path.resolve(__dirname, '../../packages/storefront-sdk/src')

export default defineConfig({
  title: 'Hantera Storefront SDK',
  description: 'Cart, checkout, and price lookup for headless storefronts',
  head: [['link', { rel: 'icon', href: '/favicon.png' }]],
  vite: {
    resolve: {
      alias: {
        '@hantera/storefront-sdk/cart': path.join(sdkSrc, 'cart/index.ts'),
        '@hantera/storefront-sdk/prices': path.join(sdkSrc, 'prices/index.ts'),
        '@hantera/storefront-sdk': path.join(sdkSrc, 'index.ts'),
      },
    },
  },
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Cart', link: '/cart/' },
      { text: 'Prices', link: '/prices/' },
      { text: 'Checkout', link: '/checkout/' },
      { text: 'Playground', link: '/playground/cart' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Configuration', link: '/guide/configuration' },
          { text: 'Tree Shaking', link: '/guide/tree-shaking' },
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
        text: 'Prices Module',
        items: [
          { text: 'Overview', link: '/prices/' },
          { text: 'API Reference', link: '/prices/api' },
        ],
      },
      {
        text: 'Checkout',
        items: [
          { text: 'Overview', link: '/checkout/' },
          { text: 'Stripe', link: '/checkout/stripe' },
          { text: 'Stripe Express', link: '/checkout/stripe-express' },
          { text: 'Demo', link: '/checkout/demo' },
          { text: 'Kustom (KCO)', link: '/checkout/kustom' },
        ],
      },
      {
        text: 'Playground',
        items: [
          { text: 'Cart', link: '/playground/cart' },
          { text: 'Price Lookup', link: '/playground/prices' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/hantera-io/hantera-storefront-sdk' },
    ],
  },
})
