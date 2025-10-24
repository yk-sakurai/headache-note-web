# 頭痛ノート Web

頭痛記録アプリのWebアプリケーション。Next.js + Firebase + Stripe で構築されています。

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS 4
- **認証**: Firebase Authentication (SSRセッション)
- **データベース**: Cloud Firestore
- **決済**: Stripe (Checkout + Customer Portal)
- **ホスティング**: Firebase Hosting + Functions v2

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

`.env.local` ファイルをプロジェクトルートに作成し、以下を設定：

```env
# Firebase (クライアント)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin (サーバー)
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY=...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_xxx_monthly
NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID=price_xxx_yearly
NEXT_PUBLIC_STRIPE_YEARLY_LAUNCH_PROMO_PRICE_ID=price_xxx_yearly_launch_promo

# Launch Date
NEXT_PUBLIC_LAUNCH_DATE=2025-10-23
```

詳細なStripeセットアップ手順は [docs/stripe-setup.md](docs/stripe-setup.md) を参照してください。

### 3. 開発サーバーの起動

First, run the development server:

```bash
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## プロジェクト構造

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── checkout/      # Stripe Checkout Session作成
│   │   └── auth/          # 認証関連API
│   ├── home/              # ホーム画面（保護ルート）
│   ├── login/             # ログインページ
│   ├── pricing/           # 料金プランページ
│   └── layout.tsx         # ルートレイアウト
├── components/            # 再利用可能なコンポーネント
├── lib/                   # ユーティリティ・ヘルパー
│   ├── firebase/          # Firebase設定
│   ├── stripe/            # Stripe設定
│   └── constants.ts       # 定数定義
docs/                      # ドキュメント
└── stripe-setup.md        # Stripeセットアップガイド
```

## 主要機能

### 認証（Day2完了）
- Firebase Authentication（Email/Google）
- SSRセッション（Session Cookie）
- 保護ルート（middleware）

### 料金プラン（Day4完了）
- 月額プラン: ¥290/月
- 年額プラン: ¥1,980/年（14日間無料トライアル）
- ローンチ記念: 最初の30日間は年額¥1,480（永年適用）

### 決済（Day5完了）
- Stripe Checkout統合
- UTM追跡（マーケティング計測）
- チェックアウト成功/キャンセル処理

## テスト

### Stripeテストカード
- カード番号: `4242 4242 4242 4242`
- 有効期限: 任意の未来の日付
- CVC: 任意の3桁
- 郵便番号: 任意

### 動作確認
1. `/pricing` でプランを選択
2. テストカードで決済
3. `/home?checkout=success` で成功メッセージ確認

## 開発ロードマップ

- [x] Day 1: リポジトリ/CI/環境
- [x] Day 2: 認証（SSRセッション）
- [x] Day 3: Firestore/Rules/Repo
- [x] Day 4: LP/料金/SEO
- [x] Day 5: Stripe設定＋Checkout API
- [ ] Day 6: Webhook基盤（Functions v2）
- [ ] Day 7: Customer Portal・プラン変更
- [ ] Day 8: ダッシュボードMVP
- [ ] Day 9: アクセス制御・エッジケース
- [ ] Day 10-11: 計測（CVR/UTM）
- [ ] Day 12-13: 運用（監視/アラート）
- [ ] Day 14: テスト/E2E/本番切替

詳細は [docs/初回リリース計画.md](https://github.com/user/repo/blob/main/docs/初回リリース計画.md) を参照。

## ドキュメント

- [Stripe セットアップガイド](docs/stripe-setup.md)
- [Firestore スキーマ](docs/firestore-schema.md)

## ライセンス

Private
