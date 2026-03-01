import { useData } from 'vitepress'
import { computed, watch, type Ref } from 'vue'

export function useStripeAppearance() {
  const { isDark } = useData()

  const appearance = computed(() =>
    isDark.value
      ? {
          theme: 'night' as const,
          variables: {
            colorBackground: '#1e1e20',
            colorText: '#e2e8f0',
            colorDanger: '#ef4444',
            colorPrimary: '#6366f1',
            borderRadius: '5px',
            fontFamily:
              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
          },
        }
      : {
          theme: 'stripe' as const,
          variables: {
            borderRadius: '5px',
          },
        },
  )

  function watchThemeChanges(elements: Ref<any> | { value?: any }) {
    watch(isDark, () => {
      const el = 'value' in elements ? elements.value : elements
      if (el) {
        el.update({ appearance: appearance.value })
      }
    })
  }

  return { isDark, appearance, watchThemeChanges }
}
