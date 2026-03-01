<script setup lang="ts">
import { ref, computed } from 'vue'
import { createPriceClient, isPriceError } from '@hantera/storefront-sdk/prices'
import type { ProductPrice } from '@hantera/storefront-sdk/prices'
import { resolveBaseUrl } from '../utils/resolve-base-url'

const STORAGE_KEY_CONFIG = 'hantera-sdk-playground-config'

const tenant = ref(loadTenant())
const baseUrl = computed(() => resolveBaseUrl(tenant.value))
const productNumber = ref('')
const currencyCode = ref('SEK')
const priceListInput = ref('RETAIL, WHOLESALE, CLEARANCE')
const loading = ref(false)
const error = ref<string | null>(null)
const lookupResults = ref<ProductPrice[]>([])
const lookupCurrency = ref('')
const expandedProduct = ref<string | null>(null)

const client = computed(() => createPriceClient({ baseUrl: baseUrl.value }))

const priceListKeys = computed(() =>
  priceListInput.value.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0)
)

function loadTenant(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CONFIG)
    if (stored) {
      const config = JSON.parse(stored)
      if (config.tenant) return config.tenant
    }
  } catch {}
  return ''
}

function saveConfig() {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({ tenant: tenant.value }))
}

async function handleLookup() {
  const productNumbers = productNumber.value.split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0)
  if (productNumbers.length === 0 || priceListKeys.value.length === 0) {
    error.value = 'Enter at least one product number and one price list key'
    return
  }

  loading.value = true
  error.value = null
  lookupResults.value = []
  expandedProduct.value = null

  try {
    const response = await client.value.lookup({
      productNumbers,
      priceListKeys: priceListKeys.value,
      currencyCode: currencyCode.value,
    })

    if (isPriceError(response)) {
      error.value = `${response.error.code}: ${response.error.message}`
      return
    }

    lookupResults.value = response.prices
    lookupCurrency.value = response.currencyCode
  } catch (e: any) {
    error.value = e.message || 'Failed to look up prices'
  } finally {
    loading.value = false
  }
}

function toggleTimeline(pn: string) {
  expandedProduct.value = expandedProduct.value === pn ? null : pn
}

function formatPrice(price: number | null): string {
  if (price == null) return '—'
  return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

function hasTimeline(product: ProductPrice): boolean {
  return product.priceTimeline != null && product.priceTimeline.length > 0
}
</script>

<template>
  <div class="playground">
    <div class="config-section">
      <div class="config-bar">
        <label>Tenant</label>
        <input type="text" v-model="tenant" @change="saveConfig" placeholder="e.g. mytenant, custom.host.com" />
      </div>
      <div class="config-preview" v-if="baseUrl">{{ baseUrl }}</div>
    </div>

    <div v-if="error" class="error-banner">{{ error }}</div>

    <form @submit.prevent="handleLookup" class="lookup-form">
      <div class="form-group">
        <label>Product Number(s)</label>
        <input type="text" v-model="productNumber" placeholder="e.g. SH005-BLK-10, JK010-GRN-M" :disabled="loading" />
        <span class="hint">Comma-separated for multiple products</span>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Currency</label>
          <select v-model="currencyCode" :disabled="loading">
            <option v-for="c in ['SEK','EUR','USD','GBP','NOK','DKK']" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="form-group" style="flex:2">
          <label>Price Lists</label>
          <input type="text" v-model="priceListInput" placeholder="e.g. RETAIL, WHOLESALE" :disabled="loading" />
          <span class="hint">Comma-separated price list keys</span>
        </div>
      </div>

      <button type="submit" :disabled="loading" class="btn-primary">
        {{ loading ? 'Looking up...' : 'Look Up Prices' }}
      </button>
    </form>

    <div v-if="lookupResults.length > 0" class="results">
      <h3>Prices <span class="currency-badge">{{ lookupCurrency }}</span></h3>
      <table class="results-table">
        <thead>
          <tr><th>Product</th><th>Current</th><th>30d Low</th></tr>
        </thead>
        <tbody>
          <template v-for="product in lookupResults" :key="product.productNumber">
            <tr
              :class="{ expandable: hasTimeline(product), expanded: expandedProduct === product.productNumber }"
              @click="hasTimeline(product) && toggleTimeline(product.productNumber)"
            >
              <td>
                <code>{{ product.productNumber }}</code>
                <span v-if="hasTimeline(product)" class="expand-icon">
                  {{ expandedProduct === product.productNumber ? '▼' : '▶' }}
                </span>
              </td>
              <td class="price-cell">{{ formatPrice(product.currentPrice) }}</td>
              <td class="price-cell lowest">{{ formatPrice(product.lowestPrice) }}</td>
            </tr>
            <tr v-if="expandedProduct === product.productNumber && hasTimeline(product)" class="timeline-row">
              <td colspan="3">
                <div class="timeline">
                  <div class="timeline-label">Price Timeline (30 days)</div>
                  <div v-for="(entry, idx) in product.priceTimeline" :key="idx" class="timeline-entry">
                    <span class="dot">●</span>
                    <span class="tl-price">{{ formatPrice(entry.price) }}</span>
                    <span class="tl-date">{{ formatDate(entry.at) }}</span>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.playground { font-size: 0.9rem; }
.config-section { margin-bottom: 1rem; }
.config-bar { display: flex; align-items: center; gap: 0.5rem; }
.config-bar label { font-weight: 600; font-size: 0.8rem; white-space: nowrap; }
.config-bar input { flex: 1; padding: 0.4rem; border: 1px solid var(--vp-c-border); border-radius: 4px; font-size: 0.85rem; }
.config-preview { font-size: 0.75rem; color: var(--vp-c-text-3); margin-top: 0.25rem; padding-left: 4.5rem; font-family: var(--vp-font-family-mono); }
.error-banner { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 0.5rem 0.75rem; border-radius: 4px; margin-bottom: 1rem; }
.lookup-form { margin-bottom: 1.5rem; }
.form-group { margin-bottom: 0.75rem; }
.form-group label { display: block; margin-bottom: 0.2rem; font-weight: 600; font-size: 0.8rem; }
.form-group input, .form-group select { width: 100%; padding: 0.4rem; border: 1px solid var(--vp-c-border); border-radius: 4px; }
.hint { font-size: 0.7rem; color: var(--vp-c-text-3); }
.form-row { display: flex; gap: 0.75rem; }
.form-row .form-group { flex: 1; }
.currency-badge { font-size: 0.7rem; padding: 0.1rem 0.4rem; background: var(--vp-c-bg-soft); border-radius: 3px; }
.results-table { width: 100%; border-collapse: collapse; }
.results-table th, .results-table td { padding: 0.5rem; text-align: left; border-bottom: 1px solid var(--vp-c-border); font-size: 0.85rem; }
.results-table th { font-size: 0.75rem; text-transform: uppercase; color: var(--vp-c-text-2); }
.price-cell { text-align: right; font-variant-numeric: tabular-nums; }
.lowest { color: var(--vp-c-text-3); }
.expandable { cursor: pointer; }
.expandable:hover { background: var(--vp-c-bg-soft); }
.expanded { background: var(--vp-c-bg-elv); }
.expand-icon { font-size: 0.6rem; color: var(--vp-c-text-3); margin-left: 0.25rem; }
.timeline-row td { padding: 0; }
.timeline { padding: 0.5rem 1rem 0.5rem 2rem; background: var(--vp-c-bg-soft); }
.timeline-label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; color: var(--vp-c-text-3); margin-bottom: 0.4rem; }
.timeline-entry { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; margin-bottom: 0.2rem; }
.dot { color: var(--vp-c-brand-1); font-size: 0.5rem; }
.tl-price { font-weight: 600; min-width: 4rem; font-variant-numeric: tabular-nums; }
.tl-date { color: var(--vp-c-text-3); font-size: 0.7rem; }
.btn-primary { padding: 0.4rem 0.75rem; background: var(--vp-c-brand-1); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.btn-primary:hover:not(:disabled) { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.5; }
</style>
