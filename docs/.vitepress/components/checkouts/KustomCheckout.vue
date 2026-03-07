<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { CartClient, Cart } from '@hantera/storefront-sdk/cart'

const props = defineProps<{
  client: CartClient
  cart: Cart
  cartId: string
  baseUrl: string
  termsUrl?: string
  checkoutUrl?: string
  confirmationUrl?: string
}>()

const emit = defineEmits<{
  back: []
  completing: []
  error: [message: string]
}>()

const loading = ref(true)
const errorMessage = ref<string | null>(null)
const kustomContainer = ref<HTMLElement | null>(null)

const kustomDirty = computed(() => props.cart?.fields?.kustomDirty === true)

watch(kustomDirty, (dirty) => {
  if (dirty) {
    (window as any)._klarnaCheckout?.suspend()
  } else {
    (window as any)._klarnaCheckout?.resume()
  }
})

watch(
  () => props.cart?.cartState,
  (state) => {
    if (state === 'completed') {
      emit('completing')
    }
  },
)

onMounted(async () => {
  try {
    const origin = window.location.origin.replace('http://', 'https://')
    const playgroundPath = window.location.pathname
    const res = await fetch(
      `${props.baseUrl}/ingress/commerce/carts/${props.cartId}/payment/kustom`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          termsUrl: props.termsUrl ?? `${origin}${playgroundPath}`,
          checkoutUrl: props.checkoutUrl ?? `${origin}${playgroundPath}?cart=${props.cartId}`,
          confirmationUrl:
            props.confirmationUrl ??
            `${origin}${playgroundPath}?redirect_status=succeeded&cart=${props.cartId}`,
        }),
      },
    )
    const data = await res.json()

    if (data?.error) {
      errorMessage.value = data.error.message ?? 'Failed to load Kustom Checkout'
      loading.value = false
      return
    }

    if (!data?.htmlSnippet) {
      errorMessage.value = 'No checkout snippet returned'
      loading.value = false
      return
    }

    loading.value = false
    renderSnippet(data.htmlSnippet)
  } catch (e: any) {
    errorMessage.value = e.message
    loading.value = false
  }
})

function renderSnippet(htmlSnippet: string) {
  if (!kustomContainer.value) return
  kustomContainer.value.innerHTML = htmlSnippet
  const scripts = kustomContainer.value.querySelectorAll('script')
  scripts.forEach((oldScript) => {
    const newScript = document.createElement('script')
    Array.from(oldScript.attributes).forEach((attr) =>
      newScript.setAttribute(attr.name, attr.value),
    )
    newScript.textContent = oldScript.textContent
    oldScript.parentNode?.replaceChild(newScript, oldScript)
  })
}
</script>

<template>
  <div class="kustom-checkout">
    <button class="btn-back" @click="$emit('back')">← Back to options</button>

    <div v-if="loading" class="loading-state">Loading Kustom Checkout...</div>
    <div v-if="errorMessage" class="error-banner">{{ errorMessage }}</div>

    <div v-if="kustomDirty" class="sync-banner">Updating order… Please wait.</div>

    <div ref="kustomContainer" v-show="!loading && !errorMessage"></div>
  </div>
</template>

<style scoped>
.kustom-checkout {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.btn-back {
  align-self: flex-start;
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  cursor: pointer;
}

.loading-state {
  text-align: center;
  padding: 2rem;
  color: var(--vp-c-text-2);
}

.error-banner {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 0.85rem;
  text-align: center;
}

.sync-banner {
  background: #fff3cd;
  border: 1px solid #ffc107;
  color: #664d03;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 0.85rem;
  text-align: center;
}
</style>
