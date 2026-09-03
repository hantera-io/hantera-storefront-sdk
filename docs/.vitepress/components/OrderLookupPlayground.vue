<script setup lang="ts">
import { computed, ref } from 'vue'
import { createOrdersClient, isOrderLookupError } from '@hantera/storefront-sdk/orders'
import type { OrderLookup, OrderLookupError } from '@hantera/storefront-sdk/orders'
import { resolveBaseUrl } from '../utils/resolve-base-url'

const STORAGE_KEY_CONFIG = 'hantera-sdk-playground-config'

const tenant = ref(loadTenant())
const reference = ref('')
const email = ref('')
const loading = ref(false)
const result = ref<OrderLookup | null>(null)
const error = ref<OrderLookupError['error'] | null>(null)
const requestError = ref<string | null>(null)

const baseUrl = computed(() => resolveBaseUrl(tenant.value))
const client = computed(() => createOrdersClient({ baseUrl: baseUrl.value }))

function loadTenant(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CONFIG)
    if (stored) {
      const config = JSON.parse(stored)
      if (typeof config.tenant === 'string') return config.tenant
    }
  } catch {}

  return ''
}

function saveTenant() {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({ tenant: tenant.value.trim() }))
}

async function lookup() {
  if (!tenant.value.trim() || !reference.value.trim() || !email.value.trim()) {
    requestError.value = 'Enter a tenant, reference, and e-mail address.'
    return
  }

  loading.value = true
  result.value = null
  error.value = null
  requestError.value = null
  saveTenant()

  try {
    const response = await client.value.lookup({
      reference: reference.value.trim(),
      email: email.value.trim(),
    })

    if (isOrderLookupError(response)) {
      error.value = response.error
      return
    }

    result.value = response
  } catch (cause: unknown) {
    requestError.value = cause instanceof Error ? cause.message : 'The lookup request failed.'
  } finally {
    loading.value = false
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: result.value?.currencyCode ?? 'SEK',
  }).format(value)
}
</script>

<template>
  <div class="playground">
    <form class="lookup-form" @submit.prevent="lookup">
      <label>
        Tenant
        <input v-model="tenant" type="text" placeholder="e.g. demo-ecom or core.example.com" @change="saveTenant" />
      </label>
      <label>
        Reference
        <input v-model="reference" type="text" placeholder="Order, delivery, or live cart number" />
      </label>
      <label>
        E-mail
        <input v-model="email" type="email" placeholder="customer@example.com" />
      </label>
      <button class="btn-primary" :disabled="loading" type="submit">
        {{ loading ? 'Looking up…' : 'Look up order' }}
      </button>
    </form>

    <div v-if="baseUrl" class="base-url">{{ baseUrl }}</div>
    <div v-if="requestError" class="error-banner">{{ requestError }}</div>
    <div v-if="error" class="error-banner">{{ error.code }}: {{ error.message }}</div>

    <section v-if="result" class="result">
      <header>
        <div>
          <h3>{{ result.orderNumber }}</h3>
          <p v-if="result.email">{{ result.email }}</p>
        </div>
        <strong>{{ formatCurrency(result.orderTotal) }}</strong>
      </header>

      <table v-if="result.items.length" class="items-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Quantity</th>
            <th>Delivery</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in result.items" :key="`${item.productNumber}-${item.deliveryNumber ?? ''}`">
            <td>
              <strong>{{ item.productNumber }}</strong>
              <span v-if="item.description">{{ item.description }}</span>
            </td>
            <td>{{ item.quantity }}</td>
            <td>{{ item.deliveryNumber ?? '—' }}</td>
            <td>{{ formatCurrency(item.total) }}</td>
          </tr>
        </tbody>
      </table>

      <dl class="totals">
        <div><dt>Products</dt><dd>{{ formatCurrency(result.productTotal) }}</dd></div>
        <div><dt>Shipping</dt><dd>{{ formatCurrency(result.shippingTotal) }}</dd></div>
        <div><dt>Tax</dt><dd>{{ formatCurrency(result.orderTaxTotal) }}</dd></div>
      </dl>

      <details>
        <summary>Raw response</summary>
        <pre>{{ JSON.stringify(result, null, 2) }}</pre>
      </details>
    </section>
  </div>
</template>

<style scoped>
.playground { max-width: 860px; margin: 1rem 0; }
.lookup-form { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) auto; gap: 0.75rem; align-items: end; }
label { display: grid; gap: 0.35rem; font-size: 0.8rem; font-weight: 600; }
input { min-width: 0; padding: 0.45rem; border: 1px solid var(--vp-c-border); border-radius: 4px; color: var(--vp-c-text-1); background: var(--vp-c-bg); }
.btn-primary { padding: 0.5rem 0.8rem; border: 0; border-radius: 4px; color: white; background: var(--vp-c-brand-1); cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; cursor: wait; }
.base-url { margin-top: 0.5rem; color: var(--vp-c-text-2); font-size: 0.75rem; }
.error-banner { margin-top: 0.75rem; padding: 0.7rem; border-radius: 4px; color: #842029; background: #f8d7da; }
.result { margin-top: 1rem; padding: 1rem; border: 1px solid var(--vp-c-border); border-radius: 6px; }
header { display: flex; justify-content: space-between; gap: 1rem; align-items: start; }
h3 { margin: 0; }
header p { margin: 0.25rem 0 0; color: var(--vp-c-text-2); }
.items-table { width: 100%; margin: 1rem 0; border-collapse: collapse; }
.items-table th, .items-table td { padding: 0.5rem; border-bottom: 1px solid var(--vp-c-border); text-align: left; font-size: 0.85rem; }
.items-table th { color: var(--vp-c-text-2); font-size: 0.75rem; text-transform: uppercase; }
.items-table span { display: block; color: var(--vp-c-text-2); font-size: 0.75rem; }
.totals { margin: 0; margin-left: auto; max-width: 260px; }
.totals div { display: flex; justify-content: space-between; gap: 1rem; padding: 0.2rem 0; }
.totals dt { color: var(--vp-c-text-2); }
.totals dd { margin: 0; }
details { margin-top: 1rem; }
pre { overflow-x: auto; padding: 0.75rem; border-radius: 4px; background: var(--vp-c-bg-soft); font-size: 0.75rem; }
@media (max-width: 720px) { .lookup-form { grid-template-columns: 1fr; } }
</style>