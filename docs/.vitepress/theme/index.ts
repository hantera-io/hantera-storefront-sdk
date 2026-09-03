import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import CartPlayground from '../components/CartPlayground.vue'
import OrderLookupPlayground from '../components/OrderLookupPlayground.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('CartPlayground', CartPlayground)
    app.component('OrderLookupPlayground', OrderLookupPlayground)
  },
} satisfies Theme
