<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { createCartClient, isCartErrors } from '@hantera/storefront-sdk/cart'
import type { Cart, CartErrors, CartMutationResponse } from '@hantera/storefront-sdk/cart'
import { resolveBaseUrl } from '../utils/resolve-base-url'
import CheckoutSelector from './checkouts/CheckoutSelector.vue'
import StripeCheckout from './checkouts/StripeCheckout.vue'
import StripeExpressCheckout from './checkouts/StripeExpressCheckout.vue'
import DemoCheckout from './checkouts/DemoCheckout.vue'
import OrderConfirmation from './checkouts/OrderConfirmation.vue'
import { resetStripeLoader } from './checkouts/stripe-loader'

const STORAGE_KEY_CONFIG = 'hantera-sdk-playground-config'
const STORAGE_KEY_CARTS = 'hantera-sdk-playground-carts'

interface StoredCart {
  cartId: string
  tenant: string
  channelKey: string
  currencyCode: string
  createdAt: string
  completedAt?: string
}

type CheckoutView = 'select' | 'stripe' | 'stripe-express' | 'demo'

const tenant = ref(loadTenant())
const storedCarts = ref<StoredCart[]>(loadCarts())
const currentCartId = ref<string | null>(null)
const cart = ref<Cart | null>(null)
const loading = ref(false)
const syncing = ref(false)
const completing = ref(false)
const error = ref<string | null>(null)
const currencyCode = ref('SEK')
const channelKey = ref('retail_SE')
const productNumber = ref('')
const quantity = ref(1)
const couponCode = ref('')
const couponError = ref<string | null>(null)
const checkoutView = ref<CheckoutView>('select')
let eventSource: EventSource | null = null

const currentStoredCart = computed(() =>
  storedCarts.value.find((c) => c.cartId === currentCartId.value) ?? null,
)

const isCompleted = computed(() =>
  currentStoredCart.value?.completedAt != null || cart.value?.cartState === 'completed',
)

const activeBaseUrl = computed(() => {
  if (currentStoredCart.value) {
    return resolveBaseUrl(currentStoredCart.value.tenant)
  }
  return resolveBaseUrl(tenant.value)
})

const client = computed(() => createCartClient({ baseUrl: activeBaseUrl.value }))

watch(
  () => cart.value?.cartState,
  (state) => {
    if (state === 'completed' && currentCartId.value) {
      completing.value = false
      markCartCompleted(currentCartId.value)
    }
  },
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

function loadCarts(): StoredCart[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CARTS)
    if (stored) return JSON.parse(stored)
  } catch {}
  return []
}

function saveConfig() {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({ tenant: tenant.value }))
}

function saveCarts() {
  localStorage.setItem(STORAGE_KEY_CARTS, JSON.stringify(storedCarts.value))
}

async function createCart() {
  if (!tenant.value.trim()) {
    error.value = 'Enter a tenant before creating a cart'
    return
  }
  loading.value = true
  error.value = null
  try {
    const response = await client.value.createCart({
      currencyCode: currencyCode.value,
      channelKey: channelKey.value,
    })
    if (isCartErrors(response)) {
      handleErrors(response)
      return
    }
    const newCart: StoredCart = {
      cartId: response.cartId,
      tenant: tenant.value.trim(),
      channelKey: channelKey.value,
      currencyCode: currencyCode.value,
      createdAt: new Date().toISOString(),
    }
    storedCarts.value.push(newCart)
    saveCarts()
    selectCart(response.cartId)
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function selectCart(cartId: string) {
  currentCartId.value = cartId
  cart.value = null
  checkoutView.value = 'select'
  completing.value = false
  resetStripeLoader()
  subscribeToEvents(cartId)
}

function subscribeToEvents(cartId: string) {
  unsubscribe()
  loading.value = true
  eventSource = client.value.subscribeToCartEvents(cartId, {
    onInit: (data: Cart) => {
      cart.value = data
      loading.value = false
      syncing.value = false
    },
    onUpdate: (data: Cart) => {
      cart.value = data
      syncing.value = false
    },
    onError: () => {
      loading.value = false
    },
    onConnectionError: () => {
      loading.value = false
    },
  })
}

function unsubscribe() {
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
}

const COUPON_ERROR_CODES = new Set(['INVALID_COUPON', 'COUPON_NOT_FOUND'])

function handleErrors(result: CartErrors) {
  for (const err of result.errors) {
    if (COUPON_ERROR_CODES.has(err.code)) {
      couponError.value = err.message
    } else {
      error.value = `${err.code}: ${err.message}`
    }
  }
}

function handleMutationResult(result: CartMutationResponse): boolean {
  syncing.value = false
  if (isCartErrors(result)) {
    handleErrors(result)
    return false
  }
  cart.value = result
  return true
}

async function addItem() {
  if (!currentCartId.value || !productNumber.value.trim()) return
  syncing.value = true
  error.value = null
  try {
    const result = await client.value.addItem(currentCartId.value, {
      productNumber: productNumber.value.trim(),
      quantity: quantity.value,
    })
    if (handleMutationResult(result)) {
      productNumber.value = ''
      quantity.value = 1
    }
  } catch (e: any) {
    syncing.value = false
    error.value = e.message
  }
}

async function removeItem(cartItemId: string) {
  if (!currentCartId.value) return
  syncing.value = true
  try {
    const result = await client.value.removeItem(currentCartId.value, { cartItemId })
    handleMutationResult(result)
  } catch (e: any) {
    syncing.value = false
    error.value = e.message
  }
}

async function setItemQuantity(cartItemId: string, newQuantity: number) {
  if (!currentCartId.value || newQuantity < 1) return
  syncing.value = true
  error.value = null
  try {
    const result = await client.value.setQuantity(currentCartId.value, {
      cartItemId,
      quantity: newQuantity,
    })
    handleMutationResult(result)
  } catch (e: any) {
    syncing.value = false
    error.value = e.message
  }
}

async function addCoupon() {
  if (!currentCartId.value || !couponCode.value.trim()) return
  syncing.value = true
  couponError.value = null
  try {
    const result = await client.value.addCoupon(currentCartId.value, couponCode.value.trim())
    if (handleMutationResult(result)) {
      couponCode.value = ''
    }
  } catch (e: any) {
    syncing.value = false
    error.value = e.message
  }
}

async function removeCoupon(code: string) {
  if (!currentCartId.value) return
  syncing.value = true
  couponError.value = null
  try {
    const result = await client.value.removeCoupon(currentCartId.value, code)
    handleMutationResult(result)
  } catch (e: any) {
    syncing.value = false
    error.value = e.message
  }
}

function markCartCompleted(cartId: string) {
  const idx = storedCarts.value.findIndex((c) => c.cartId === cartId)
  if (idx !== -1 && !storedCarts.value[idx].completedAt) {
    storedCarts.value[idx] = {
      ...storedCarts.value[idx],
      completedAt: new Date().toISOString(),
    }
    saveCarts()
  }
}

function removeStoredCart(cartId: string) {
  storedCarts.value = storedCarts.value.filter((c) => c.cartId !== cartId)
  saveCarts()
  if (currentCartId.value === cartId) {
    currentCartId.value = null
    cart.value = null
    unsubscribe()
  }
}

function goBack() {
  currentCartId.value = null
  cart.value = null
  checkoutView.value = 'select'
  completing.value = false
  unsubscribe()
}

function handleCheckoutSelect(method: string) {
  checkoutView.value = method as CheckoutView
}

function handleCompleting() {
  completing.value = true
}

function handleCheckoutBack() {
  checkoutView.value = 'select'
}

function formatCurrency(amount: number): string {
  const cc = currentStoredCart.value?.currencyCode ?? 'SEK'
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: cc }).format(amount)
}

function formatDate(d: string): string {
  return new Date(d).toLocaleString()
}

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const redirectStatus = params.get('redirect_status')
  const cartId = params.get('cart')

  if (redirectStatus && cartId) {
    const url = new URL(window.location.href)
    url.searchParams.delete('payment_intent')
    url.searchParams.delete('payment_intent_client_secret')
    url.searchParams.delete('redirect_status')
    url.searchParams.delete('cart')
    window.history.replaceState({}, '', url.toString())

    const knownCart = storedCarts.value.find((c) => c.cartId === cartId)
    if (!knownCart) return

    if (redirectStatus === 'failed') {
      selectCart(cartId)
      error.value = 'Payment failed. Please try again.'
      return
    }

    currentCartId.value = cartId
    completing.value = true
    resetStripeLoader()
    subscribeToEvents(cartId)
  }
})

onUnmounted(() => unsubscribe())
</script>

<template>
  <div class="playground">
    <div v-if="error" class="error-banner">{{ error }}</div>

    <!-- Cart list view -->
    <div v-if="!currentCartId">
      <div class="config-section">
        <div class="config-bar">
          <label>Tenant</label>
          <input type="text" v-model="tenant" @change="saveConfig" placeholder="e.g. mytenant, custom.host.com" />
        </div>
        <div class="config-preview" v-if="activeBaseUrl">{{ activeBaseUrl }}</div>
      </div>

      <div class="create-section">
        <h3>Create Cart</h3>
        <div class="form-row">
          <select v-model="currencyCode">
            <option v-for="c in ['SEK','EUR','USD','GBP','NOK','DKK']" :key="c" :value="c">{{ c }}</option>
          </select>
          <input type="text" v-model="channelKey" placeholder="Channel key" />
          <button @click="createCart" :disabled="loading || !tenant.trim()" class="btn-primary">
            {{ loading ? 'Creating...' : 'Create Cart' }}
          </button>
        </div>
      </div>

      <div v-if="storedCarts.length === 0" class="empty-state">No carts yet.</div>
      <div v-else class="cart-list">
        <div v-for="c in storedCarts" :key="c.cartId" class="cart-card" @click="selectCart(c.cartId)">
          <div>
            <code>{{ c.cartId.substring(0, 8) }}...</code>
            <span class="badge">{{ c.tenant }}</span>
            <span class="badge">{{ c.channelKey }}</span>
            <span class="badge">{{ c.currencyCode }}</span>
            <span v-if="c.completedAt" class="badge badge-success">✓ Completed</span>
            <span class="date">{{ formatDate(c.createdAt) }}</span>
          </div>
          <button @click.stop="removeStoredCart(c.cartId)" class="btn-danger btn-sm">×</button>
        </div>
      </div>
    </div>

    <!-- Cart detail view -->
    <div v-else>
      <div class="view-header">
        <button @click="goBack" class="btn-secondary btn-sm">← Back</button>
        <code>{{ currentCartId }}</code>
        <span v-if="currentStoredCart" class="badge">{{ currentStoredCart.tenant }}</span>
        <span v-if="syncing" class="syncing">⟳</span>
      </div>

      <div v-if="loading && !cart" class="empty-state">Connecting...</div>

      <!-- Completing state (waiting for server-side completion) -->
      <div v-else-if="completing && !isCompleted" class="completing-state">
        <div class="completing-spinner">⟳</div>
        <h3>Processing your order...</h3>
        <p>Waiting for payment confirmation. This may take a moment.</p>
      </div>

      <!-- Completed state -->
      <div v-else-if="isCompleted && cart">
        <OrderConfirmation
          :cart="cart"
          :currency-code="currentStoredCart?.currencyCode ?? 'SEK'"
          @back="goBack"
        />

        <details class="raw-data">
          <summary>Raw cart data</summary>
          <pre>{{ JSON.stringify(cart, null, 2) }}</pre>
        </details>
      </div>

      <!-- Active cart state -->
      <div v-else-if="cart">
        <div class="add-item-form">
          <input v-model="productNumber" placeholder="Product number" @keydown.enter="addItem" />
          <input v-model.number="quantity" type="number" min="1" style="width:60px" />
          <button @click="addItem" :disabled="!productNumber.trim()" class="btn-primary btn-sm">Add</button>
        </div>

        <table v-if="cart.items?.length" class="items-table">
          <thead>
            <tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="item in cart.items" :key="item.cartItemId">
              <td><code>{{ item.productNumber }}</code></td>
              <td>
                <input
                  type="number"
                  :value="item.quantity"
                  min="1"
                  class="qty-input"
                  @change="(e) => setItemQuantity(item.cartItemId, parseInt((e.target as HTMLInputElement).value) || 1)"
                />
              </td>
              <td>{{ formatCurrency(item.unitPrice) }}</td>
              <td>{{ formatCurrency(item.total) }}</td>
              <td><button @click="removeItem(item.cartItemId)" class="btn-danger btn-sm">×</button></td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">Cart is empty</div>

        <div v-if="cart.items?.length" class="totals">
          <div>Total: <strong>{{ formatCurrency(cart.orderTotal) }}</strong></div>
          <div>Tax{{ cart.taxIncluded ? ' (incl)' : '' }}: {{ formatCurrency(cart.orderTaxTotal) }}</div>
        </div>

        <div class="coupon-section">
          <div class="coupon-form">
            <input
              v-model="couponCode"
              placeholder="Coupon code"
              @keydown.enter="addCoupon"
              @input="couponError = null"
            />
            <button @click="addCoupon" :disabled="!couponCode.trim()" class="btn-secondary btn-sm">Apply</button>
          </div>
          <div v-if="couponError" class="coupon-error">{{ couponError }}</div>
          <div v-if="(cart as any).coupons?.length" class="coupon-list">
            <span v-for="code in (cart as any).coupons" :key="code" class="coupon-tag">
              {{ code }}
              <button @click="removeCoupon(code)" class="coupon-remove">×</button>
            </span>
          </div>
        </div>

        <!-- Checkout section -->
        <div v-if="cart.items?.length" class="checkout-section">
          <CheckoutSelector
            v-if="checkoutView === 'select'"
            @select="handleCheckoutSelect"
          />

          <Suspense v-else-if="checkoutView === 'stripe'">
            <StripeCheckout
              :client="client"
              :cart="cart"
              :cart-id="currentCartId!"
              :base-url="activeBaseUrl"
              @back="handleCheckoutBack"
              @completing="handleCompleting"
            />
          </Suspense>

          <Suspense v-else-if="checkoutView === 'stripe-express'">
            <StripeExpressCheckout
              :client="client"
              :cart="cart"
              :cart-id="currentCartId!"
              :base-url="activeBaseUrl"
              @back="handleCheckoutBack"
              @completing="handleCompleting"
            />
          </Suspense>

          <DemoCheckout
            v-else-if="checkoutView === 'demo'"
            :client="client"
            :cart="cart"
            :cart-id="currentCartId!"
            :base-url="activeBaseUrl"
            @back="handleCheckoutBack"
            @completing="handleCompleting"
          />
        </div>

        <details class="raw-data">
          <summary>Raw cart data</summary>
          <pre>{{ JSON.stringify(cart, null, 2) }}</pre>
        </details>
      </div>
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
.create-section { margin-bottom: 1.5rem; }
.create-section h3 { margin: 0 0 0.5rem; }
.form-row { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
.form-row select, .form-row input { padding: 0.4rem; border: 1px solid var(--vp-c-border); border-radius: 4px; }
.empty-state { text-align: center; padding: 1.5rem; color: var(--vp-c-text-2); }
.cart-list { display: flex; flex-direction: column; gap: 0.5rem; }
.cart-card { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border: 1px solid var(--vp-c-border); border-radius: 4px; cursor: pointer; }
.cart-card:hover { border-color: var(--vp-c-brand-1); }
.badge { display: inline-block; padding: 0.1rem 0.4rem; font-size: 0.7rem; background: var(--vp-c-bg-soft); border-radius: 3px; margin-left: 0.25rem; }
.badge-success { background: #d4edda; color: #155724; }
.date { font-size: 0.7rem; color: var(--vp-c-text-3); margin-left: 0.5rem; }
.view-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
.view-header code { font-size: 0.8rem; color: var(--vp-c-text-2); }
.syncing { animation: pulse 1s infinite; color: var(--vp-c-brand-1); }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
.completing-state { text-align: center; padding: 3rem 1rem; }
.completing-state h3 { margin: 1rem 0 0.5rem; }
.completing-state p { color: var(--vp-c-text-2); font-size: 0.85rem; margin: 0; }
.completing-spinner { font-size: 2rem; animation: spin 1.5s linear infinite; display: inline-block; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.add-item-form { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
.add-item-form input { flex: 1; padding: 0.4rem; border: 1px solid var(--vp-c-border); border-radius: 4px; }
.items-table { width: 100%; border-collapse: collapse; margin-bottom: 0.75rem; }
.items-table th, .items-table td { padding: 0.4rem 0.5rem; text-align: left; border-bottom: 1px solid var(--vp-c-border); font-size: 0.85rem; }
.items-table th { font-size: 0.75rem; text-transform: uppercase; color: var(--vp-c-text-2); }
.qty-input { width: 50px; padding: 0.2rem 0.3rem; border: 1px solid var(--vp-c-border); border-radius: 4px; font-size: 0.85rem; text-align: center; }
.totals { text-align: right; margin-bottom: 1rem; font-size: 0.9rem; }
.coupon-section { margin-bottom: 1rem; max-width: 400px; }
.coupon-form { display: flex; gap: 0.5rem; }
.coupon-form input { flex: 1; padding: 0.4rem; border: 1px solid var(--vp-c-border); border-radius: 4px; font-size: 0.85rem; }
.coupon-error { color: #dc3545; font-size: 0.8rem; margin-top: 0.3rem; }
.coupon-list { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.5rem; }
.coupon-tag { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.5rem; background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-border); border-radius: 4px; font-size: 0.8rem; }
.coupon-remove { background: none; border: none; cursor: pointer; color: var(--vp-c-text-2); font-size: 0.9rem; padding: 0 0.15rem; line-height: 1; }
.coupon-remove:hover { color: #dc3545; }
.checkout-section { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--vp-c-border); }
.raw-data { margin-top: 1rem; }
.raw-data pre { font-size: 0.75rem; overflow-x: auto; background: var(--vp-c-bg-soft); padding: 0.75rem; border-radius: 4px; }
.btn-primary { padding: 0.4rem 0.75rem; background: var(--vp-c-brand-1); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.btn-primary:hover:not(:disabled) { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.5; }
.btn-secondary { padding: 0.4rem 0.75rem; background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); border: 1px solid var(--vp-c-border); border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.btn-danger { padding: 0.2rem 0.5rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.btn-sm { padding: 0.3rem 0.6rem; font-size: 0.75rem; }
</style>
