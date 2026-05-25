'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js'
import { loadStripe, type Stripe } from '@stripe/stripe-js'

import { startCheckoutSession } from '@/app/actions/stripe'

let stripePromise: Promise<Stripe | null> | null = null
function getStripe() {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!key) {
      throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set')
    }
    stripePromise = loadStripe(key)
  }
  return stripePromise
}

export default function Checkout({ productId }: { productId: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const fetchClientSecret = useCallback(async () => {
    const secret = await startCheckoutSession(productId)
    if (!secret) throw new Error('Stripe Checkout の準備に失敗しました')
    return secret
  }, [productId])

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        決済フォームを読み込み中...
      </div>
    )
  }

  return (
    <div id="checkout" className="min-h-[600px]">
      <EmbeddedCheckoutProvider
        stripe={getStripe()}
        options={{ fetchClientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}
