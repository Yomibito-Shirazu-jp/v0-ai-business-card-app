import { NextResponse } from 'next/server'
export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({ error: 'この機能は現在ご利用いただけません' }, { status: 410 })
}
export async function POST() {
  return NextResponse.json({ error: 'この機能は現在ご利用いただけません' }, { status: 410 })
}
export async function PATCH() {
  return NextResponse.json({ error: 'この機能は現在ご利用いただけません' }, { status: 410 })
}
export async function DELETE() {
  return NextResponse.json({ error: 'この機能は現在ご利用いただけません' }, { status: 410 })
}
