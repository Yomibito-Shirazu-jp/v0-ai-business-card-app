'use server'

import { stripe } from '@/lib/stripe'
import { findProduct } from '@/lib/products'

export async function startCheckoutSession(productId: string) {
  const product = findProduct(productId)
  if (!product) {
    throw new Error(`Product with id "${productId}" not found`)
  }

  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    redirect_on_completion: 'never',
    line_items: [
      {
        price_data: {
          currency: 'jpy',
          product_data: {
            name: product.name,
            description: product.description,
          },
          unit_amount: product.priceInCents, // JPY は整数円
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    metadata: {
      product_id: product.id,
    },
  })

  return session.client_secret
}
