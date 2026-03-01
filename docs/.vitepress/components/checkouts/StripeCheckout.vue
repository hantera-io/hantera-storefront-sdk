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

const stripe = ref<any>(null)
const loading = ref(true)
const submitting = ref(false)
const errorMessage = ref<string | null>(null)
const email = ref(props.cart.email ?? '')
const { isDark, appearance, watchThemeChanges } = useStripeAppearance()

let elements: any

onMounted(async () => {
  try {
    const publicKey = await fetchStripePublicKey(props.baseUrl)
    stripe.value = await loadStripe(publicKey)
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
  if (!stripe.value || !props.cart) return

  const currencyCode = props.cart.currencyCode?.toLowerCase() ?? 'sek'

  elements = stripe.value.elements({
    mode: 'payment',
    amount: paymentTotal.value,
    currency: currencyCode,
    appearance: appearance.value,
    locale: 'en',
    capture_method: 'manual',
    fields: {
      name: 'never',
      email: 'never',
      phone: 'never',
      address: 'never',
    },
  })

  const commonAddressOptions = {
    allowedCountries: ['SE', 'NO', 'DK', 'DE', 'FI'],
    fields: { email: 'always' },
  }

  const deliveryEl = elements.create('address', {
    ...commonAddressOptions,
    mode: 'shipping',
    defaultValues: props.cart.deliveryAddress
      ? {
          name: props.cart.deliveryAddress.name,
          address: {
            line1: props.cart.deliveryAddress.addressLine1,
            line2: props.cart.deliveryAddress.addressLine2,
            city: props.cart.deliveryAddress.city,
            state: props.cart.deliveryAddress.state,
            postal_code: props.cart.deliveryAddress.postalCode,
            country: props.cart.deliveryAddress.countryCode,
          },
        }
      : undefined,
  })
  deliveryEl.mount('#stripe-delivery-address')

  deliveryEl.on('change', (event: any) => {
    if (event.complete) {
      const addr = event.value.address
      props.client.setAddress(props.cartId, {
        deliveryAddress: {
          name: event.value.name,
          addressLine1: addr.line1,
          addressLine2: addr.line2,
          postalCode: addr.postal_code,
          city: addr.city,
          state: addr.state,
          countryCode: addr.country,
        },
      })
    }
  })

  const invoiceEl = elements.create('address', {
    ...commonAddressOptions,
    mode: 'billing',
    defaultValues: props.cart.invoiceAddress
      ? {
          name: props.cart.invoiceAddress.name,
          address: {
            line1: props.cart.invoiceAddress.addressLine1,
            line2: props.cart.invoiceAddress.addressLine2,
            city: props.cart.invoiceAddress.city,
            state: props.cart.invoiceAddress.state,
            postal_code: props.cart.invoiceAddress.postalCode,
            country: props.cart.invoiceAddress.countryCode,
          },
        }
      : undefined,
  })
  invoiceEl.mount('#stripe-invoice-address')

  invoiceEl.on('change', (event: any) => {
    if (event.complete) {
      const addr = event.value.address
      props.client.setAddress(props.cartId, {
        invoiceAddress: {
          name: event.value.name,
          addressLine1: addr.line1,
          addressLine2: addr.line2,
          postalCode: addr.postal_code,
          city: addr.city,
          state: addr.state,
          countryCode: addr.country,
        },
      })
    }
  })

  const paymentEl = elements.create('payment', { layout: 'accordion' })
  paymentEl.mount('#stripe-payment-element')
}

function updateEmail() {
  if (email.value && email.value !== props.cart.email) {
    props.client.setEmail(props.cartId, email.value)
  }
}

async function handleSubmit() {
  if (submitting.value || !elements || !stripe.value) return

  submitting.value = true
  errorMessage.value = null

  const { error: submitError } = await elements.submit()
  if (submitError) {
    errorMessage.value = submitError.message
    submitting.value = false
    return
  }

  try {
    const res = await props.client.submitPayment(props.cartId, 'stripe', {}) as any
    if (!res || res.error) {
      errorMessage.value = res?.error?.message ?? 'Failed to create payment'
      submitting.value = false
      return
    }

    const { clientSecret } = res

    emit('completing')

    const { error } = await stripe.value.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: window.location.href,
      },
    })

    if (error) {
      errorMessage.value = error.message
      submitting.value = false
    }
  } catch (e: any) {
    errorMessage.value = e.message
    submitting.value = false
  }
}
</script>

<template>
  <div class="stripe-checkout">
    <button class="btn-back" @click="$emit('back')">← Back to options</button>

    <div v-if="loading" class="loading-state">Loading Stripe...</div>

    <form v-else @submit.prevent="handleSubmit" class="stripe-form">
      <div class="form-section">
        <label for="stripe-email">Email</label>
        <input
          id="stripe-email"
          type="email"
          v-model="email"
          placeholder="customer@example.com"
          @blur="updateEmail"
          @keydown.enter.prevent="updateEmail"
        />
      </div>

      <div class="form-section">
        <label>Delivery Address</label>
        <div id="stripe-delivery-address"></div>
      </div>

      <div class="form-section">
        <label>Billing Address</label>
        <div id="stripe-invoice-address"></div>
      </div>

      <div class="form-section">
        <label>Payment</label>
        <div id="stripe-payment-element"></div>
      </div>

      <div v-if="errorMessage" class="error-banner">{{ errorMessage }}</div>

      <button type="submit" class="btn-pay" :disabled="submitting">
        {{ submitting ? 'Processing...' : 'Pay Now' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.stripe-checkout {
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

.stripe-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-section label {
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}

.form-section input {
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 5px;
  font-size: 0.85rem;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.03), 0px 3px 6px rgba(0, 0, 0, 0.02);
}

.form-section input:focus {
  outline: 0;
  border-color: var(--vp-c-brand-1);
  box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.03), 0px 3px 6px rgba(0, 0, 0, 0.02),
    0 0 0 3px color-mix(in srgb, var(--vp-c-brand-1) 25%, transparent);
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

.btn-pay {
  padding: 0.6rem 1.5rem;
  background: var(--vp-c-brand-1);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  align-self: center;
}

.btn-pay:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-pay:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
