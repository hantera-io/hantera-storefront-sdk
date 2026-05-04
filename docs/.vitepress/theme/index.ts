import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import CartPlayground from '../components/CartPlayground.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('CartPlayground', CartPlayground)
  },
} satisfies Theme
