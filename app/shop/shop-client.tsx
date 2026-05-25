'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Sparkles } from 'lucide-react'

import { PRODUCTS, formatJpy, type Product } from '@/lib/products'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import Checkout from '@/components/checkout'

export default function ShopClient() {
  const [selected, setSelected] = useState<Product | null>(null)

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/" aria-label="ホームに戻る">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="flex-1 truncate text-base font-semibold sm:text-lg">
            名刺の購入
          </h1>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-4 pt-8 sm:pt-12">
        <div className="mb-6 max-w-2xl">
          <Badge variant="secondary" className="mb-3">
            <Sparkles className="mr-1 h-3 w-3" />
            AI レイアウト対応
          </Badge>
          <h2 className="text-pretty text-2xl font-bold tracking-tight sm:text-3xl">
            プロ品質の名刺を、必要な分だけ。
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            国内印刷・送料込み。すべてのプランに初校無料 / 再印刷保証が付きます。
            お支払いはクレジットカード、Apple Pay、Google Pay に対応。
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((p) => (
            <Card
              key={p.id}
              className={`flex flex-col p-5 transition ${
                p.highlight ? 'border-primary shadow-lg ring-2 ring-primary/20' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold">{p.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {p.description}
                  </p>
                </div>
                {p.badge && (
                  <Badge variant="default" className="ml-2 shrink-0">
                    {p.badge}
                  </Badge>
                )}
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight">
                  {formatJpy(p.priceInCents)}
                </span>
                <span className="text-xs text-muted-foreground">税込</span>
              </div>

              <ul className="mt-4 flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="mt-5 w-full"
                size="lg"
                variant={p.highlight ? 'default' : 'outline'}
                onClick={() => setSelected(p)}
              >
                このプランを購入
              </Button>
            </Card>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          表示価格はすべて税込・国内送料込みです。決済は Stripe を介して安全に処理されます。
        </p>
      </section>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0 sm:p-0">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>
              {selected ? `${formatJpy(selected.priceInCents)} 税込・送料込み` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 sm:p-5">
            {selected && <Checkout productId={selected.id} />}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
