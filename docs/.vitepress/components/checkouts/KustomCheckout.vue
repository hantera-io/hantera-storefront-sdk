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
const confirming = ref(false)
const errorMessage = ref<string | null>(null)
const kustomContainer = ref<HTMLElement | null>(null)

const kustomSyncing = computed(() => {
  const pending = props.cart?.fields?.kustomPendingHash
  const synced = props.cart?.fields?.kustomSyncHash
  return pending != null && pending !== synced
})

watch(kustomSyncing, (syncing) => {
  const kco = (window as any)._klarnaCheckout
  if (typeof kco === 'function') {
    kco((api: any) => syncing ? api.suspend() : api.resume())
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

function waitForKcoAndSuspend(retries = 10) {
  const kco = (window as any)._klarnaCheckout
  if (typeof kco === 'function') {
    kco((api: any) => api.suspend())
  } else if (retries > 0) {
    setTimeout(() => waitForKcoAndSuspend(retries - 1), 200)
  }
}

function isRedirectCallback(): boolean {
  const params = new URLSearchParams(window.location.search)
  return params.get('redirect_status') === 'succeeded' && params.get('checkout') === 'kustom'
}

function cleanRedirectParams() {
  const url = new URL(window.location.href)
  url.searchParams.delete('redirect_status')
  url.searchParams.delete('cart')
  url.searchParams.delete('checkout')
  window.history.replaceState({}, '', url.toString())
}

async function confirmWithKustom(attempt = 1): Promise<void> {
  const maxAttempts = 5
  const backoffMs = [0, 1000, 2000, 4000, 8000]

  try {
    const res = await fetch(
      `${props.baseUrl}/ingress/commerce/carts/${props.cartId}/payment/kustom/confirm`,
      { method: 'POST' },
    )
    const data = await res.json()

    if (data?.error) {
      errorMessage.value = data.error.message ?? 'Failed to confirm payment'
      confirming.value = false
      return
    }

    if (data?.status === 'checkout_complete') {
      return
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, backoffMs[attempt] ?? 4000))
      return confirmWithKustom(attempt + 1)
    }

    confirming.value = false
  } catch (e: any) {
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, backoffMs[attempt] ?? 4000))
      return confirmWithKustom(attempt + 1)
    }
    errorMessage.value = e.message
    confirming.value = false
  }
}

onMounted(async () => {
  if (isRedirectCallback()) {
    cleanRedirectParams()
    confirming.value = true
    loading.value = false
    confirmWithKustom()
    return
  }

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
            `${origin}${playgroundPath}?redirect_status=succeeded&cart=${props.cartId}&checkout=kustom`,
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

    if (kustomSyncing.value) {
      waitForKcoAndSuspend()
    }
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
    <div v-if="confirming" class="confirming-state">Confirming your payment…</div>
    <div v-if="errorMessage" class="error-banner">{{ errorMessage }}</div>

    <div v-if="kustomSyncing" class="sync-banner">Updating order… Please wait.</div>

    <div ref="kustomContainer"></div>
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

.loading-state,
.confirming-state {
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
