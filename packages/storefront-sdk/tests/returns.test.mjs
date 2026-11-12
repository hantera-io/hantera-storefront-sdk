import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { createReturnsClient, ReturnsError } from '../dist/returns/index.js'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

test('lookup sends fresh bearer tokens without email', async () => {
  const requests = []
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options })
    return Response.json({ orderNumber: 'O1', claims: [] })
  }
  let count = 0
  const client = createReturnsClient({ baseUrl: 'https://example.com/', getCustomerToken: () => `token-${++count}` })
  assert.deepEqual(await client.lookupClaims('O1'), { orderNumber: 'O1', claims: [] })
  await client.lookupClaims('O1')
  assert.equal(requests[0].url, 'https://example.com/ingress/returns/storefront/claims/lookup')
  assert.equal(requests[0].options.headers.Authorization, 'Bearer token-1')
  assert.deepEqual(JSON.parse(requests[0].options.body), { orderNumber: 'O1' })
  assert.equal(requests[1].options.headers.Authorization, 'Bearer token-2')
})

test('lookup rejects structured errors', async () => {
  globalThis.fetch = async () => Response.json({ error: { code: 'UNAUTHORIZED', message: 'Token expired' } }, { status: 401 })
  const client = createReturnsClient({ baseUrl: 'https://example.com', getCustomerToken: () => 'expired' })
  await assert.rejects(client.lookupClaims('O1'), error => error instanceof ReturnsError && error.code === 'UNAUTHORIZED' && error.status === 401)
})

test('stream parses fragmented events with authorization and rejects disconnect', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://example.com/ingress/returns/storefront/claims/events')
    assert.equal(options.headers.Authorization, 'Bearer valid')
    assert.equal(options.headers.Accept, 'text/event-stream')
    assert.deepEqual(JSON.parse(options.body), { orderNumber: 'O1' })
    const encoder = new TextEncoder()
    return new Response(new ReadableStream({ start(controller) {
      for (const text of ['event: rea', 'dy\r\ndata: {}\r\n\r\n:ping\n\n', 'event: updated\ndata: {}\n\n']) controller.enqueue(encoder.encode(text))
      controller.close()
    } }), { headers: { 'content-type': 'text/event-stream' } })
  }
  const client = createReturnsClient({ baseUrl: 'https://example.com', getCustomerToken: () => 'valid' })
  let updates = 0
  await assert.rejects(client.streamClaims('O1', new AbortController().signal, () => updates++), error => error.code === 'STREAM_CLOSED')
  assert.equal(updates, 2)
})

test('stream rejects invalid content and server error events', async () => {
  const client = createReturnsClient({ baseUrl: 'https://example.com', getCustomerToken: () => 'valid' })
  globalThis.fetch = async () => Response.json({})
  await assert.rejects(client.streamClaims('O1', new AbortController().signal, () => assert.fail()), error => error.code === 'INVALID_STREAM')
  globalThis.fetch = async () => new Response('event: error\ndata: {"code":"UNAUTHORIZED","message":"Expired"}\n\n', { headers: { 'content-type': 'text/event-stream' } })
  await assert.rejects(client.streamClaims('O1', new AbortController().signal, () => assert.fail()), error => error.code === 'UNAUTHORIZED')
})

test('subscription cancellation aborts active stream and prevents reconnect', async () => {
  let calls = 0
  let observedSignal
  globalThis.fetch = async (_url, options) => {
    calls++
    observedSignal = options.signal
    return new Response(new ReadableStream({ start(controller) {
      options.signal.addEventListener('abort', () => controller.close(), { once: true })
    } }), { headers: { 'content-type': 'text/event-stream' } })
  }
  const client = createReturnsClient({ baseUrl: 'https://example.com', getCustomerToken: () => 'valid' })
  const cancel = client.subscribeClaims('O1', () => assert.fail())
  await new Promise(resolve => setTimeout(resolve, 20))
  cancel()
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.equal(observedSignal.aborted, true)
  assert.equal(calls, 1)
})

test('subscription obtains a fresh token after a stream disconnect', async () => {
  const tokens = []
  let n = 0
  let stop
  let finish
  const reconnected = new Promise(resolve => { finish = resolve })
  globalThis.fetch = async (_url, options) => {
    tokens.push(options.headers.Authorization)
    if (tokens.length === 2) {
      finish()
      return new Response(new ReadableStream({ start(controller) {
        options.signal.addEventListener('abort', () => controller.close(), { once: true })
      } }), { headers: { 'content-type': 'text/event-stream' } })
    }
    return new Response('', { headers: { 'content-type': 'text/event-stream' } })
  }
  const client = createReturnsClient({ baseUrl: 'https://example.com', getCustomerToken: () => `token-${++n}` })
  stop = client.subscribeClaims('O1', () => {})
  try {
    await Promise.race([reconnected, new Promise((_, reject) => setTimeout(() => reject(new Error('No reconnect')), 7000))])
    assert.deepEqual(tokens, ['Bearer token-1', 'Bearer token-2'])
  } finally { stop() }
})

test('cancelling during asynchronous token acquisition prevents the request', async () => {
  let resolveToken
  globalThis.fetch = () => assert.fail('cancelled request must not be sent')
  const client = createReturnsClient({ baseUrl: 'https://example.com', getCustomerToken: () => new Promise(resolve => { resolveToken = resolve }) })
  const controller = new AbortController()
  const request = client.lookupClaims('O1', controller.signal)
  controller.abort()
  resolveToken('token')
  await assert.rejects(request, error => error.name === 'AbortError')
})

test('registration endpoints retain their separate order and email contract', async () => {
  const calls = []
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return Response.json({ products: [] }) }
  const client = createReturnsClient({ baseUrl: 'https://example.com', getCustomerToken: () => assert.fail() })
  const request = { orderNumber: 'O1', email: 'test@example.com', orderLineNumber: 'L1' }
  await client.reasonEligibility(request)
  await client.createClaim({ orderNumber: 'O1', email: request.email, lines: [] })
  assert.match(calls[0].url, /reason-eligibility$/)
  assert.deepEqual(JSON.parse(calls[0].options.body), request)
  assert.equal(calls[0].options.headers.Authorization, undefined)
  assert.match(calls[1].url, /claims$/)
})

test('submission-disabled responses are surfaced to the caller', async () => {
  globalThis.fetch = async () => new Response('', { status: 401 })
  const client = createReturnsClient({ baseUrl: 'https://example.com', getCustomerToken: () => assert.fail() })
  await assert.rejects(client.createClaim({ orderNumber: 'O1', email: 'test@example.com', lines: [] }),
    error => error instanceof ReturnsError && error.status === 401)
})

test('exchange search and shipping options use the public registration contract', async () => {
  const calls = []
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return Response.json({ products: [], incomplete: true, options: [] }) }
  const client = createReturnsClient({ baseUrl: 'https://example.com', getCustomerToken: () => assert.fail() })
  const request = { orderNumber: 'O1', email: 'test@example.com', orderLineNumber: 'L1', reason: 'wrongSize', phrase: 'coat', locale: 'en' }
  assert.deepEqual((await client.searchExchangeProducts(request)).products, [])
  assert.deepEqual(JSON.parse(calls[0].options.body), request)
  assert.match(calls[0].url, /exchange-products\/search$/)
  await client.returnShippingOptions('O1', 'test@example.com')
  assert.equal(calls[1].url, 'https://example.com/ingress/returns/storefront/return-shipping-options?orderNumber=O1&email=test%40example.com')
})