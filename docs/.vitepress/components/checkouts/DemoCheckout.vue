<script setup lang="ts">
import { ref } from 'vue'
import type { CartClient, Cart } from '@hantera/storefront-sdk/cart'

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

const submitting = ref(false)
const errorMessage = ref<string | null>(null)
const email = ref(props.cart.email ?? '')

const address = ref({
  name: props.cart.address?.name ?? '',
  addressLine1: props.cart.address?.addressLine1 ?? '',
  addressLine2: props.cart.address?.addressLine2 ?? '',
  postalCode: props.cart.address?.postalCode ?? '',
  city: props.cart.address?.city ?? '',
  countryCode: props.cart.address?.countryCode ?? 'SE',
})

async function handleSubmit() {
  if (submitting.value) return

  submitting.value = true
  errorMessage.value = null

  try {
    if (email.value) {
      await props.client.setEmail(props.cartId, email.value)
    }

    if (address.value.name || address.value.addressLine1) {
      await props.client.setAddress(props.cartId, {
        address: {
          name: address.value.name || undefined,
          addressLine1: address.value.addressLine1 || undefined,
          addressLine2: address.value.addressLine2 || undefined,
          postalCode: address.value.postalCode || undefined,
          city: address.value.city || undefined,
          countryCode: address.value.countryCode || undefined,
        },
      })
    }

    const res = await fetch(`${props.baseUrl}/ingress/commerce/carts/${props.cartId}/payment/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const data = await res.json()
    if (data?.error) {
      errorMessage.value = data.error.message ?? 'Payment submission failed'
      submitting.value = false
      return
    }

    emit('completing')
  } catch (e: any) {
    errorMessage.value = e.message
    submitting.value = false
  }
}
</script>

<template>
  <div class="demo-checkout">
    <button class="btn-back" @click="$emit('back')">← Back to options</button>

    <p class="demo-info">
      🧪 This is a simulated checkout. It completes the cart without processing a real payment.
      Useful for testing the full order flow.
    </p>

    <form @submit.prevent="handleSubmit" class="demo-form">
      <div class="form-section">
        <label for="demo-email">Email</label>
        <input
          id="demo-email"
          type="email"
          v-model="email"
          placeholder="customer@example.com"
        />
      </div>

      <div class="form-section">
        <label>Delivery Address</label>
        <div class="address-fields">
          <input v-model="address.name" placeholder="Full name" />
          <input v-model="address.addressLine1" placeholder="Address line 1" />
          <input v-model="address.addressLine2" placeholder="Address line 2" />
          <div class="address-row">
            <input v-model="address.postalCode" placeholder="Postal code" class="postal" />
            <input v-model="address.city" placeholder="City" class="city" />
          </div>
          <select v-model="address.countryCode">
            <option value="SE">Sweden</option>
            <option value="NO">Norway</option>
            <option value="DK">Denmark</option>
            <option value="FI">Finland</option>
            <option value="DE">Germany</option>
          </select>
        </div>
      </div>

      <div v-if="errorMessage" class="error-banner">{{ errorMessage }}</div>

      <button type="submit" class="btn-pay" :disabled="submitting">
        {{ submitting ? 'Processing...' : 'Complete Order (Demo)' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.demo-checkout {
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

.demo-info {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  margin: 0;
  padding: 0.5rem 0.75rem;
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
  line-height: 1.4;
}

.demo-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-section > label {
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}

.address-fields {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.address-row {
  display: flex;
  gap: 0.5rem;
}

.address-row .postal {
  flex: 0 0 35%;
}

.address-row .city {
  flex: 1;
}

.demo-form input,
.demo-form select {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  font-size: 0.85rem;
  background: var(--vp-c-bg);
}

.demo-form input:focus,
.demo-form select:focus {
  outline: 0;
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px rgba(100, 108, 255, 0.15);
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
