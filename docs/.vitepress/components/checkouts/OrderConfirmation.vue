<script setup lang="ts">
import type { Cart } from '@hantera/storefront-sdk/cart'

const props = defineProps<{
  cart: Cart
  currencyCode: string
}>()

defineEmits<{
  back: []
}>()

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: props.currencyCode,
  }).format(amount)
}

function formatAddress(address: any): string {
  if (!address) return 'Not set'
  return [
    address.name,
    address.addressLine1,
    address.addressLine2,
    [address.postalCode, address.city].filter(Boolean).join(' '),
    address.countryCode,
  ]
    .filter(Boolean)
    .join(', ')
}
</script>

<template>
  <div class="order-confirmation">
    <div class="success-banner">
      <div class="success-icon">✓</div>
      <div class="success-text">
        <strong>Order Complete!</strong>
        <span>Your order has been placed successfully.</span>
      </div>
    </div>

    <div class="order-details">
      <div class="detail-section">
        <h4>Order Details</h4>
        <div class="detail-row" v-if="cart.cartNumber">
          <span class="label">Cart Number</span>
          <code>{{ cart.cartNumber }}</code>
        </div>
        <div class="detail-row" v-if="cart.orderNumber">
          <span class="label">Order Number</span>
          <code>{{ cart.orderNumber }}</code>
        </div>
        <div class="detail-row" v-if="cart.email">
          <span class="label">Email</span>
          <span>{{ cart.email }}</span>
        </div>
        <div class="detail-row" v-if="cart.phone">
          <span class="label">Phone</span>
          <span>{{ cart.phone }}</span>
        </div>
      </div>

      <div class="detail-section" v-if="cart.deliveryAddress">
        <h4>Delivery Address</h4>
        <p class="address-text">{{ formatAddress(cart.deliveryAddress) }}</p>
      </div>

      <div class="detail-section" v-if="cart.invoiceAddress">
        <h4>Billing Address</h4>
        <p class="address-text">{{ formatAddress(cart.invoiceAddress) }}</p>
      </div>

      <div class="detail-section" v-if="cart.items?.length">
        <h4>Items</h4>
        <table class="items-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in cart.items" :key="item.cartItemId">
              <td>
                <code>{{ item.productNumber }}</code>
                <div v-if="item.description" class="item-desc">{{ item.description }}</div>
              </td>
              <td>{{ item.quantity }}</td>
              <td>{{ formatCurrency(item.unitPrice) }}</td>
              <td>{{ formatCurrency(item.total) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="totals-section">
        <div class="total-row">
          <span>Subtotal</span>
          <span>{{ formatCurrency(cart.orderTotal) }}</span>
        </div>
        <div class="total-row">
          <span>Tax{{ cart.taxIncluded ? ' (included)' : '' }}</span>
          <span>{{ formatCurrency(cart.orderTaxTotal) }}</span>
        </div>
        <div class="total-row grand-total">
          <span>Total</span>
          <span>{{
            formatCurrency(
              cart.taxIncluded ? cart.orderTotal : cart.orderTotal + cart.orderTaxTotal,
            )
          }}</span>
        </div>
      </div>
    </div>

    <button class="btn-back" @click="$emit('back')">← Back to carts</button>
  </div>
</template>

<style scoped>
.order-confirmation {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.success-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
  border-radius: 6px;
}

.success-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.success-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.success-text strong {
  font-size: 0.95rem;
}

.success-text span {
  font-size: 0.8rem;
  opacity: 0.9;
}

.order-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-section h4 {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--vp-c-text-2);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.3rem 0;
  font-size: 0.85rem;
  border-bottom: 1px solid var(--vp-c-bg-soft);
}

.detail-row .label {
  color: var(--vp-c-text-2);
}

.detail-row code {
  font-size: 0.75rem;
  background: var(--vp-c-bg-soft);
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
}

.address-text {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--vp-c-text-1);
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.items-table th,
.items-table td {
  padding: 0.4rem 0.5rem;
  text-align: left;
  border-bottom: 1px solid var(--vp-c-border);
}

.items-table th {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--vp-c-text-2);
}

.item-desc {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

.totals-section {
  background: var(--vp-c-bg-soft);
  padding: 0.75rem;
  border-radius: 4px;
}

.total-row {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  font-size: 0.85rem;
}

.total-row.grand-total {
  border-top: 2px solid var(--vp-c-border);
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  font-weight: 600;
  font-size: 0.95rem;
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
</style>
