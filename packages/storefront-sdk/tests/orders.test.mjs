import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { createOrdersClient, isOrderLookupError } from '../dist/orders/index.js'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

test('search and lookup use a fresh customer token and storefront routes', async () => {
  let tokenNumber = 0
  const requests = []
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options })
    return new Response(JSON.stringify(requests.length === 1 ? { orders: [] } : { orderNumber: 'O1' }), {
      headers: { 'content-type': 'application/json' },
    })
  }
  const client = createOrdersClient({ baseUrl: 'https://example.com/', getCustomerToken: () => `token-${++tokenNumber}` })
  assert.deepEqual(await client.search({ customerNumber: 'C1' }), { orders: [] })
  assert.equal((await client.lookup({ reference: 'O1' })).orderNumber, 'O1')
  assert.equal(requests[0].url, 'https://example.com/ingress/storefront/order-search')
  assert.equal(requests[0].options.headers.Authorization, 'Bearer token-1')
  assert.deepEqual(JSON.parse(requests[0].options.body), { customerNumber: 'C1' })
  assert.equal(requests[1].url, 'https://example.com/ingress/storefront/order-lookup')
  assert.equal(requests[1].options.headers.Authorization, 'Bearer token-2')
  assert.deepEqual(JSON.parse(requests[1].options.body), { reference: 'O1' })
})

test('service errors remain recognizable', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Token expired' } }), {
    status: 401, headers: { 'content-type': 'application/json' },
  })
  const client = createOrdersClient({ baseUrl: 'https://example.com', getCustomerToken: async () => 'expired' })
  const result = await client.search()
  assert.equal(isOrderLookupError(result), true)
  assert.equal(result.error.code, 'UNAUTHORIZED')
})