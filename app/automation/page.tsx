import { redirect } from 'next/navigation'

// AI 自動化機能は現在非公開。ルートに戻す。
export default function AutomationDisabled() {
  redirect('/')
}
