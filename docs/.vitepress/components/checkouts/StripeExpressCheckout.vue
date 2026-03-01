<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import type { CartClient, Cart, SetAddressRequest } from '@hantera/storefront-sdk/cart'
import { fetchStripePublicKey, loadStripe } from './stripe-loader'
import { useStripeAppearance } from './stripe-theme'

const props = defineProps<{
  client: CartClient
  cart: Cart
  cartId: string
  baseUrl: string
}>()

const emit = defineEmits<{
  back: []
  completing: []
  error: [message: string]
}>()

const loading = ref(true)
const errorMessage = ref<string | null>(null)
const { appearance, watchThemeChanges } = useStripeAppearance()

let stripe: any
let elements: any

onMounted(async () => {
  try {
    const publicKey = await fetchStripePublicKey(props.baseUrl)
    stripe = await loadStripe(publicKey)
    loading.value = false
    await nextTick()
    initElements()
    watchThemeChanges({ get value() { return elements } })
  } catch (e: any) {
    errorMessage.value = e.message
    loading.value = false
  }
})

const paymentTotal = computed(() => {
  if (!props.cart) return 0
  const total = props.cart.taxIncluded
    ? props.cart.orderTotal
    : props.cart.orderTotal + props.cart.orderTaxTotal
  return Math.round(total * 100)
})

watch(paymentTotal, () => {
  if (elements) {
    elements.update({ amount: paymentTotal.value })
  }
})

function initElements() {
  if (!stripe || !props.cart) return

  const currencyCode = props.cart.currencyCode?.toLowerCase() ?? 'sek'

  elements = stripe.elements({
    mode: 'payment',
    amount: paymentTotal.value,
    currency: currencyCode,
    appearance: appearance.value,
  })

  const expressEl = elements.create('expressCheckout')
  expressEl.mount('#stripe-express-element')

  expressEl.on('confirm', async (event: any) => {
    const addressRequest: SetAddressRequest = {}
    let updateAddress = false

    if (event.billingDetails) {
      addressRequest.invoiceAddress = {
        name: event.billingDetails.name,
        addressLine1: event.billingDetails.address.line1,
        addressLine2: event.billingDetails.address.line2,
        postalCode: event.billingDetails.address.postal_code,
        city: event.billingDetails.address.city,
        state: event.billingDetails.address.state,
        countryCode: event.billingDetails.address.country,
      }
      updateAddress = true
    }

    if (event.shippingAddress) {
      addressRequest.deliveryAddress = {
        name: event.shippingAddress.name,
        addressLine1: event.shippingAddress.address.line1,
        addressLine2: event.shippingAddress.address.line2,
        postalCode: event.shippingAddress.address.postal_code,
        city: event.shippingAddress.address.city,
        state: event.shippingAddress.address.state,
        countryCode: event.shippingAddress.address.country,
      }
      updateAddress = true
    }

    if (updateAddress) {
      await props.client.setAddress(props.cartId, addressRequest)
    }

    if (event.billingDetails?.email) {
      await props.client.setEmail(props.cartId, event.billingDetails.email)
    }
    if (event.billingDetails?.phone) {
      await props.client.setPhone(props.cartId, event.billingDetails.phone)
    }

    try {
      const res = await props.client.submitPayment(props.cartId, 'stripe', {}) as any
      if (!res || res.error) {
        errorMessage.value = res?.error?.message ?? 'Failed to create payment'
        return
      }

      emit('completing')

      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret: res.clientSecret,
        confirmParams: {
          return_url: window.location.href,
        },
      })

      if (error) {
        errorMessage.value = error.message
      }
    } catch (e: any) {
      errorMessage.value = e.message
    }
  })

  expressEl.on('cancel', () => {
    elements.update({ amount: paymentTotal.value })
  })

  expressEl.on('shippingaddresschange', (event: any) => {
    event.resolve({ lineItems: [] })
  })

  expressEl.on('shippingratechange', (event: any) => {
    event.resolve({ lineItems: [] })
  })
}
</script>

<template>
  <div class="stripe-express-checkout">
    <button class="btn-back" @click="$emit('back')">← Back to options</button>

    <div v-if="loading" class="loading-state">Loading Stripe Express...</div>

    <div v-else class="express-container">
      <p class="express-hint">
        Use Apple Pay, Google Pay, or Link to check out quickly.
        If no express options appear, your browser or device may not support them.
      </p>

      <div id="stripe-express-element"></div>

      <div v-if="errorMessage" class="error-banner">{{ errorMessage }}</div>
    </div>
  </div>
</template>

<style scoped>
.stripe-express-checkout {
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

.express-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.express-hint {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  margin: 0;
  line-height: 1.4;
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
</style>
