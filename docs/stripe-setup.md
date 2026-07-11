# Stripe セットアップガイド

## 1. Stripeアカウントの作成

1. [Stripe](https://stripe.com/) にアクセス
2. アカウントを作成（まずはテストモードで開始）

## 2. 製品と価格の作成

Stripeダッシュボードで製品と価格を作成します。

### 製品作成

1. Stripeダッシュボード → **製品** → **製品を追加**
2. 製品名: `頭痛ノート プレミアム`
3. 説明（任意）: `頭痛記録アプリの有料機能`

### 価格の作成

製品作成後、月額プランの価格を追加します：

#### 月額プラン
- **価格**: 任意の金額を設定
- **請求期間**: 月次（Recurring - Monthly）
- **Price ID をメモ**: `price_xxx_monthly`（環境変数で使用）

> **注意**: トライアル期間を設ける場合は、Checkout API側で `trial_period_days` パラメータで設定するため、価格作成時には設定不要です。

## 3. APIキーの取得

1. Stripeダッシュボード → **開発者** → **APIキー**
2. 以下の2つのキーをコピー：
   - **公開可能キー（Publishable key）**: `pk_test_...`
   - **シークレットキー（Secret key）**: `sk_test_...`

## 4. Webhookシークレットの取得

1. Stripeダッシュボード → **開発者** → **Webhook**
2. **エンドポイントを追加**
3. エンドポイントURL: `https://your-domain.com/api/stripe/webhook`（本番時）
4. ローカル開発時は Stripe CLI を使用：
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
5. Webhook署名シークレット: `whsec_...` をメモ

## 5. 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成（または既存ファイルに追記）：

```env
# Stripe Keys (テストモード)
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_xxx_monthly
```

> **セキュリティ注意**: `.env.local` は `.gitignore` に含まれており、Gitにコミットされません。

## 6. テスト

### テストカード情報
- カード番号: `4242 4242 4242 4242`
- 有効期限: 任意の未来の日付（例: 12/34）
- CVC: 任意の3桁の数字（例: 123）
- 郵便番号: 任意（例: 123-4567）

### 動作確認手順
1. 開発サーバーを起動: `pnpm dev`
2. `/pricing` ページにアクセス
3. 月額プランの申し込みボタンをクリック
4. Stripeチェックアウトページで上記のテストカード情報を入力
5. 決済を完了
6. `/home?checkout=success` にリダイレクトされ、成功メッセージが表示されることを確認

## 7. 本番環境への切り替え（リリース時）

1. Stripeダッシュボードで **本番モード** に切り替え
2. 本番用の製品・価格を作成
3. 本番用のAPIキーを取得
4. 環境変数を本番用に更新（`sk_live_...`, `pk_live_...` など）
5. Webhook エンドポイントを本番URLで設定

## 8. Customer Portal 設定

Stripeダッシュボードで Customer Portal を有効化し、キャンセルなどの操作をユーザーが自分で行えるようにします。

### 設定画面
- ダッシュボード → `Settings` → `Billing` → `Customer portal`

### 設定項目
- 許可する操作
  - Cancel subscriptions（キャンセル）: 有効
  - View invoices（請求履歴の表示）: 有効
  - Update payment methods（支払い方法の更新）: 有効
- キャンセル動作
  - Cancel at end of billing period（期末キャンセル）を選択
  - 即時キャンセルは無効

### リダイレクト設定
- Return URL はアプリ側で `/api/portal` が生成時に `${origin}/home` を設定

### 動作確認
1. `/home` → 「プランを管理」ボタン → ポータルに遷移
2. キャンセルや支払い方法の更新を実行
3. Webhook 経由で `subscriptions/{uid}` が更新されることを確認
4. `/home` の表示が更新されることを確認

## トラブルシューティング

### エラー: "Unauthorized"
- ログインしているか確認
- セッションCookieが有効か確認

### エラー: "Invalid priceId"
- `.env.local` の Price ID が正しいか確認
- Stripeダッシュボードで Price ID をコピーし直す

### チェックアウトページが開かない
- ブラウザのコンソールでエラーを確認
- `/api/checkout` のレスポンスを確認（Network タブ）
- Stripe Secret Key が正しいか確認
