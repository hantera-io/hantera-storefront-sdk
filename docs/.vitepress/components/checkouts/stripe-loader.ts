let stripePromise: Promise<any> | null = null

export function loadStripe(publicKey: string): Promise<any> {
  if (stripePromise) return stripePromise

  stripePromise = new Promise((resolve, reject) => {
    if ((window as any).Stripe) {
      resolve((window as any).Stripe(publicKey))
      return
    }

    const script = document.createElement('script')
    script.src = 'https://js.stripe.com/clover/stripe.js'
    script.async = true
    script.onload = () => {
      if ((window as any).Stripe) {
        resolve((window as any).Stripe(publicKey))
      } else {
        reject(new Error('Stripe.js loaded but Stripe constructor not found'))
      }
    }
    script.onerror = () => {
      stripePromise = null
      reject(new Error('Failed to load Stripe.js'))
    }
    document.head.appendChild(script)
  })

  return stripePromise
}

export async function fetchStripePublicKey(baseUrl: string): Promise<string> {
  const response = await fetch(`${baseUrl}/ingress/stripe/publicKey`)
  if (!response.ok) {
    throw new Error(`Failed to fetch Stripe public key (${response.status})`)
  }
  return response.text()
}

export function resetStripeLoader(): void {
  stripePromise = null
}
