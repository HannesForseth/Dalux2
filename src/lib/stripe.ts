import Stripe from 'stripe'

// Server-side Stripe instance (lazy initialization to avoid build-time errors)
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-11-17.clover',
      typescript: true,
    })
  }
  return _stripe
}


// Format price from öre to SEK with currency
export function formatPrice(priceInOre: number): string {
  if (priceInOre === 0) return 'Gratis'
  return `${(priceInOre / 100).toLocaleString('sv-SE')} kr`
}

// Format storage size
export function formatStorage(mb: number): string {
  if (mb === -1) return 'Obegränsad'
  if (mb < 1024) return `${mb} MB`
  return `${(mb / 1024).toFixed(0)} GB`
}
