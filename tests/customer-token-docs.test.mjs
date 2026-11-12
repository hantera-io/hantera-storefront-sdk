import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { afterEach, test } from 'node:test'
import ts from 'typescript'

const guide = await readFile(new URL('../docs/orders/customer-tokens.md', import.meta.url), 'utf8')
const blocks = [...guide.matchAll(/```ts\r?\n([\s\S]*?)\r?\n```/g)].map(match => match[1])
const source = blocks.find(block => block.includes('export async function mintCustomerToken'))
assert.ok(source, 'server example is present')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
})
assert.equal(compiled.diagnostics?.length ?? 0, 0)
const { mintCustomerToken } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`)
const savedFetch = globalThis.fetch
const names = ['HANTERA_BASE_URL', 'HANTERA_CLIENT_ID', 'HANTERA_CLIENT_SECRET']
const previousEnv = Object.fromEntries(names.map(name => [name, process.env[name]]))

afterEach(() => {
  globalThis.fetch = savedFetch
  for (const name of names) {
    if (previousEnv[name] === undefined) delete process.env[name]
    else process.env[name] = previousEnv[name]
  }
})

function configure() {
  process.env.HANTERA_BASE_URL = 'https://test.example.com/'
  process.env.HANTERA_CLIENT_ID = '00000000-0000-4000-8000-000000000000'
  process.env.HANTERA_CLIENT_SECRET = 'synthetic-test-secret'
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

test('server example authenticates using client_secret_post and mints only the supplied scope', async () => {
  configure()
  const requests = []
  const expiresAt = Math.floor(Date.now() / 1000) + 1800
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options })
    return requests.length === 1 ? json({ access_token: 'oauth-test' }) : json({ token: 'customer-test', expiresAt })
  }
  assert.deepEqual(await mintCustomerToken(['CUST-1', 'CUST-2']), { token: 'customer-test', expiresAt })
  assert.equal(requests.length, 2)
  assert.equal(requests[0].url, 'https://test.example.com/oauth/token')
  assert.equal(requests[0].options.method, 'POST')
  assert.equal(requests[0].options.headers['Content-Type'], 'application/x-www-form-urlencoded')
  assert.deepEqual(Object.fromEntries(requests[0].options.body), {
    grant_type: 'client_credentials',
    client_id: process.env.HANTERA_CLIENT_ID,
    client_secret: process.env.HANTERA_CLIENT_SECRET,
    scope: 'http/ingress/apps/storefront/mint-token:call',
  })
  assert.equal(requests[1].url, 'https://test.example.com/ingress/storefront/session')
  assert.equal(requests[1].options.headers.Authorization, 'Bearer oauth-test')
  assert.deepEqual(JSON.parse(requests[1].options.body), { customerNumbers: ['CUST-1', 'CUST-2'] })
})

test('example rejects invalid customer scopes without contacting Hantera', async () => {
  configure()
  globalThis.fetch = () => assert.fail('unexpected request')
  for (const scope of [[], ['  '], ['x'.repeat(129)], Array(21).fill('CUST')]) {
    await assert.rejects(mintCustomerToken(scope), /Invalid customer scope/)
  }
})

test('OAuth and mint failures do not expose response bodies', async () => {
  configure()
  globalThis.fetch = async () => json({ error: 'synthetic-sensitive-value' }, 401)
  await assert.rejects(mintCustomerToken(['CUST-1']), error =>
    error.message === 'Hantera authentication failed (401)' && !error.message.includes('synthetic-sensitive-value'))
  let count = 0
  globalThis.fetch = async () => ++count === 1 ? json({ access_token: 'oauth-test' }) : json({ error: 'synthetic-sensitive-value' }, 503)
  await assert.rejects(mintCustomerToken(['CUST-1']), error =>
    error.message === 'Customer token mint failed (503)' && !error.message.includes('synthetic-sensitive-value'))
})

test('example rejects malformed and expired token responses', async () => {
  configure()
  for (const oauth of [{ access_token: 42 }, { access_token: '' }]) {
    globalThis.fetch = async () => json(oauth)
    await assert.rejects(mintCustomerToken(['CUST-1']), /invalid response/)
  }
  for (const minted of [{ token: '', expiresAt: 1 }, { token: 'expired', expiresAt: 1 }, { token: 'missing-expiry' }]) {
    let count = 0
    globalThis.fetch = async () => ++count === 1 ? json({ access_token: 'oauth-test' }) : json(minted)
    await assert.rejects(mintCustomerToken(['CUST-1']), /invalid response/)
  }
})