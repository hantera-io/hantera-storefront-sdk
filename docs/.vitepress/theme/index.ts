import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import CartPlayground from '../components/CartPlayground.vue'
import PricePlayground from '../components/PricePlayground.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('CartPlayground', CartPlayground)
    app.component('PricePlayground', PricePlayground)
  },
} satisfies Theme
