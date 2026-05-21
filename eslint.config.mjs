// Next.js 16 + flat config 形式の ESLint 設定
// 既存コードベースの問題を段階的に潰す方針:
//   - Phase 0 ではビルドが通る範囲のルールに留める
//   - Phase 6 (アクセシビリティ/パフォーマンス) で jsx-a11y / react-hooks を厳格化
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'public/**',
      'next-env.d.ts',
      // Phase 0b で削除予定の旧モノリス。リファクタ中は除外して新規コードに集中
      // app/page.tsx は分割完了後にこの行を削除する
    ],
  },
  {
    rules: {
      // 既存コードに段階適用するため、Phase 0 では warn 止まりに
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'react-hooks/exhaustive-deps': 'warn',
      // network-graph.tsx の as unknown as ... を一気に消すのは Phase 0b。それまで warn
      '@typescript-eslint/no-unsafe-function-type': 'warn',
    },
  },
]

export default config
