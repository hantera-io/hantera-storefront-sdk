<script setup lang="ts">
defineEmits<{
  select: [method: string]
}>()

const methods = [
  {
    id: 'stripe',
    title: 'Stripe',
    image: '/stripe.svg',
    description: 'Card payments with Stripe Elements. Includes address forms and multiple payment methods.',
    requirement: 'Requires the Stripe PSP app to be installed.',
  },
  {
    id: 'stripe-express',
    title: 'Stripe Express',
    image: '/stripe.svg',
    description: 'One-click checkout with Apple Pay, Google Pay, and Link via Stripe Express Checkout.',
    requirement: 'Requires the Stripe PSP app to be installed.',
  },
  {
    id: 'kustom',
    title: 'Kustom',
    image: '/kustom.svg',
    description: 'Full checkout experience powered by Kustom (Klarna Checkout). Includes address, shipping, and payment in an iframe.',
    requirement: 'Requires the Kustom PSP app to be installed.',
  },
  {
    id: 'demo',
    title: 'Demo',
    image: '/hantera.svg',
    description: 'Simulated payment for testing. Completes the cart without a real payment provider.',
    requirement: 'Requires the demo-retail app to be installed.',
  },
]
</script>

<template>
  <div class="checkout-selector">
    <h3>Checkout</h3>

    <div class="psp-warning">
      ⚠️ These checkout methods require the corresponding app to be installed and configured on your
      Hantera instance. If the app is not installed, checkout will fail.
    </div>

    <div class="checkout-grid">
      <button
        v-for="method in methods"
        :key="method.id"
        class="checkout-card"
        @click="$emit('select', method.id)"
      >
        <div class="card-icon">
          <img :src="method.image" :alt="method.title" class="card-icon-img" />
        </div>
        <div class="card-body">
          <div class="card-title">{{ method.title }}</div>
          <div class="card-description">{{ method.description }}</div>
          <div class="card-requirement">{{ method.requirement }}</div>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.checkout-selector h3 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.psp-warning {
  background: #fff8e1;
  border: 1px solid #ffe082;
  color: #6d5e00;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.8rem;
  line-height: 1.4;
}

.checkout-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}

.checkout-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.checkout-card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.card-icon {
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  height: 2rem;
}

.card-icon-img {
  height: 1.5rem;
  width: auto;
  object-fit: contain;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.card-title {
  font-weight: 600;
  font-size: 0.9rem;
}

.card-description {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  line-height: 1.4;
}

.card-requirement {
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  font-style: italic;
  margin-top: 0.25rem;
}
</style>
