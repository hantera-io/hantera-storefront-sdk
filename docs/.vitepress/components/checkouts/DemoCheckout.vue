<script setup lang="ts">
import { ref, computed } from 'vue'
import { isCartErrors } from '@hantera/storefront-sdk/cart'
import type { CartClient, Cart, CartMutationResponse, CartProfile } from '@hantera/storefront-sdk/cart'

const props = defineProps<{
  client: CartClient
  cart: Cart
  cartId: string
  baseUrl: string
  profile?: CartProfile | null
}>()

const emit = defineEmits<{
  back: []
  completing: []
  error: [message: string]
}>()

const submitting = ref(false)
const errorMessage = ref<string | null>(null)
const email = ref(props.cart.email ?? '')

const FALLBACK_COUNTRIES = ['SE', 'NO', 'DK', 'FI', 'DE']

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

const STATES_BY_COUNTRY: Record<string, Record<string, string>> = {
  US: {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
    CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
    FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
    IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
    ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
    MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
    NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
    NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
    PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
    TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
    WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  },
  CA: {
    AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick',
    NL: 'Newfoundland and Labrador', NS: 'Nova Scotia', NT: 'Northwest Territories',
    NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec',
    SK: 'Saskatchewan', YT: 'Yukon',
  },
  DE: {
    BW: 'Baden-Württemberg', BY: 'Bavaria', BE: 'Berlin', BB: 'Brandenburg',
    HB: 'Bremen', HH: 'Hamburg', HE: 'Hesse', MV: 'Mecklenburg-Vorpommern',
    NI: 'Lower Saxony', NW: 'North Rhine-Westphalia', RP: 'Rhineland-Palatinate',
    SL: 'Saarland', SN: 'Saxony', ST: 'Saxony-Anhalt', SH: 'Schleswig-Holstein',
    TH: 'Thuringia',
  },
}

const ADDRESS_PRESETS = [
  {
    label: '🇸🇪 Sweden',
    countryCode: 'SE',
    name: 'Anna Andersson',
    addressLine1: 'Drottninggatan 71A',
    addressLine2: '',
    postalCode: '111 36',
    city: 'Stockholm',
    state: '',
    email: 'anna.andersson@example.com',
  },
  {
    label: '🇺🇸 DC — Washington',
    countryCode: 'US',
    name: 'John Smith',
    addressLine1: '1600 Pennsylvania Ave NW',
    addressLine2: '',
    postalCode: '20500',
    city: 'Washington',
    state: 'DC',
    email: 'john.smith@example.com',
  },
  {
    label: '🇺🇸 IL — Chicago',
    countryCode: 'US',
    name: 'Jane Doe',
    addressLine1: '1338 S Throop St',
    addressLine2: '',
    postalCode: '60608',
    city: 'Chicago',
    state: 'IL',
    email: 'jane.doe@example.com',
  },
  {
    label: '🇺🇸 CA — Los Angeles',
    countryCode: 'US',
    name: 'Michael Johnson',
    addressLine1: '111 S Grand Ave',
    addressLine2: '',
    postalCode: '90012',
    city: 'Los Angeles',
    state: 'CA',
    email: 'michael.johnson@example.com',
  },
  {
    label: '🇺🇸 NY — New York',
    countryCode: 'US',
    name: 'Emily Williams',
    addressLine1: '350 5th Ave',
    addressLine2: '',
    postalCode: '10118',
    city: 'New York',
    state: 'NY',
    email: 'emily.williams@example.com',
  },
  {
    label: '🇺🇸 TX — Austin',
    countryCode: 'US',
    name: 'David Brown',
    addressLine1: '1100 Congress Ave',
    addressLine2: '',
    postalCode: '78701',
    city: 'Austin',
    state: 'TX',
    email: 'david.brown@example.com',
  },
  {
    label: '🇺🇸 WA — Seattle',
    countryCode: 'US',
    name: 'Sarah Miller',
    addressLine1: '400 Broad St',
    addressLine2: '',
    postalCode: '98109',
    city: 'Seattle',
    state: 'WA',
    email: 'sarah.miller@example.com',
  },
  {
    label: '🇺🇸 OR — Portland',
    countryCode: 'US',
    name: 'Robert Davis',
    addressLine1: '1120 SW 5th Ave',
    addressLine2: '',
    postalCode: '97204',
    city: 'Portland',
    state: 'OR',
    email: 'robert.davis@example.com',
  },

  {
    label: '🇩🇪 Germany',
    countryCode: 'DE',
    name: 'Max Mustermann',
    addressLine1: 'Unter den Linden 77',
    addressLine2: '',
    postalCode: '10117',
    city: 'Berlin',
    state: 'BE',
    email: 'max.mustermann@example.com',
  },
  {
    label: '🇨🇦 Canada',
    countryCode: 'CA',
    name: 'Emily Tremblay',
    addressLine1: '80 Wellington St',
    addressLine2: '',
    postalCode: 'K1A 0A2',
    city: 'Ottawa',
    state: 'ON',
    email: 'emily.tremblay@example.com',
  },
]

const countryOptions = computed(() => {
  const codes = props.profile
    ? [...new Set([props.profile.defaultCountryCode, ...props.profile.allowedCountries])]
    : FALLBACK_COUNTRIES
  return codes.map((code) => ({ code, name: regionNames.of(code) ?? code }))
})

const stateOptions = computed(() => {
  const states = STATES_BY_COUNTRY[address.value.countryCode]
  return states ? Object.entries(states).map(([code, name]) => ({ code, name })) : []
})

const visiblePresets = computed(() =>
  ADDRESS_PRESETS.filter((p) => countryOptions.value.some((c) => c.code === p.countryCode)),
)

const address = ref({
  name: props.cart.address?.name ?? '',
  addressLine1: props.cart.address?.addressLine1 ?? '',
  addressLine2: props.cart.address?.addressLine2 ?? '',
  postalCode: props.cart.address?.postalCode ?? '',
  city: props.cart.address?.city ?? '',
  state: props.cart.address?.state ?? '',
  countryCode: props.cart.address?.countryCode ?? props.profile?.defaultCountryCode ?? 'SE',
})

const addressDirty = ref(false)
const emailDirty = ref(false)
const syncing = ref(false)

function buildAddressPayload() {
  return {
    address: {
      name: address.value.name || undefined,
      addressLine1: address.value.addressLine1 || undefined,
      addressLine2: address.value.addressLine2 || undefined,
      postalCode: address.value.postalCode || undefined,
      city: address.value.city || undefined,
      state: address.value.state || undefined,
      countryCode: address.value.countryCode || undefined,
    },
  }
}

async function applyPreset(preset: (typeof ADDRESS_PRESETS)[number]) {
  email.value = preset.email
  emailDirty.value = true
  address.value = {
    name: preset.name,
    addressLine1: preset.addressLine1,
    addressLine2: preset.addressLine2,
    postalCode: preset.postalCode,
    city: preset.city,
    state: preset.state,
    countryCode: preset.countryCode,
  }
  addressDirty.value = true
  // Serialize the two mutations: syncEmail sets the shared `syncing` flag, which
  // would make a concurrent syncAddress bail out via its guard. Awaiting releases
  // the flag before the address sync runs.
  await syncEmail()
  await syncAddress()
}


function onCountryChange() {
  if (!STATES_BY_COUNTRY[address.value.countryCode]) {
    address.value.state = ''
  }
  addressDirty.value = true
  syncAddress()
}

function applyMutationResult(result: CartMutationResponse): boolean {
  if (isCartErrors(result)) {
    errorMessage.value = result.errors[0]?.message ?? 'Failed to update cart'
    return false
  }
  errorMessage.value = null
  return true
}

async function syncAddress() {
  if (!addressDirty.value || syncing.value || submitting.value) return
  syncing.value = true
  try {
    const result = await props.client.setAddress(props.cartId, buildAddressPayload())
    if (applyMutationResult(result)) {
      addressDirty.value = false
    }
  } catch (e: any) {
    errorMessage.value = e.message
  } finally {
    syncing.value = false
  }
}

async function syncEmail() {
  if (!emailDirty.value || syncing.value || submitting.value || !email.value) return
  syncing.value = true
  try {
    const result = await props.client.setEmail(props.cartId, email.value)
    if (applyMutationResult(result)) {
      emailDirty.value = false
    }
  } catch (e: any) {
    errorMessage.value = e.message
  } finally {
    syncing.value = false
  }
}

async function handleSubmit() {
  if (submitting.value) return

  submitting.value = true
  errorMessage.value = null

  try {
    if (email.value && emailDirty.value) {
      await props.client.setEmail(props.cartId, email.value)
      emailDirty.value = false
    }

    if (addressDirty.value && (address.value.name || address.value.addressLine1)) {
      await props.client.setAddress(props.cartId, buildAddressPayload())
      addressDirty.value = false
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
          @input="emailDirty = true"
          @blur="syncEmail"
        />
      </div>

      <div class="form-section">
        <label>Delivery Address</label>
        <div v-if="visiblePresets.length" class="preset-chips">
          <button
            v-for="p in visiblePresets"
            :key="p.label"
            type="button"
            class="preset-chip"
            @click="applyPreset(p)"
          >
            {{ p.label }}
          </button>
        </div>
        <div class="address-fields">
          <input v-model="address.name" placeholder="Full name" @input="addressDirty = true" @blur="syncAddress" />
          <input v-model="address.addressLine1" placeholder="Address line 1" @input="addressDirty = true" @blur="syncAddress" />
          <input v-model="address.addressLine2" placeholder="Address line 2" @input="addressDirty = true" @blur="syncAddress" />
          <div class="address-row">
            <input v-model="address.postalCode" placeholder="Postal code" class="postal" @input="addressDirty = true" @blur="syncAddress" />
            <input v-model="address.city" placeholder="City" class="city" @input="addressDirty = true" @blur="syncAddress" />
          </div>
          <div class="address-row">
            <select v-model="address.countryCode" class="country" @change="onCountryChange">
              <option v-for="c in countryOptions" :key="c.code" :value="c.code">{{ c.name }}</option>
            </select>
            <select
              v-if="stateOptions.length"
              v-model="address.state"
              class="state"
              @change="addressDirty = true; syncAddress()"
            >
              <option v-for="s in stateOptions" :key="s.code" :value="s.code">{{ s.name }}</option>
            </select>
          </div>
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

.address-row .country {
  flex: 1;
}

.address-row .state {
  flex: 0 0 35%;
}

.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.25rem;
}

.preset-chip {
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-border);
  border-radius: 999px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.preset-chip:hover {
  border-color: var(--vp-c-brand-1);
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
