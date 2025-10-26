# Firestore スキーマ詳細ドキュメント

Firestoreの各コレクションとフィールドの意味（役割）を詳しく説明します。

## 目次

1. [User コレクション](#1-user-コレクション)
2. [Subscription コレクション](#2-subscription-コレクション)
3. [Invoice サブコレクション](#3-invoice-サブコレクション)
4. [CheckoutSession コレクション](#4-checkoutsession-コレクション)
5. [AuditLog コレクション](#5-auditlog-コレクション)
6. [コレクション間の関係](#コレクション間の関係)
7. [主要な使用パターン](#主要な使用パターン)

---

## 1. User コレクション

**パス**: `users/{uid}`

**役割**: ユーザーの基本情報を管理するコレクションです。

### 型定義

```typescript
interface User {
  email: string;
  stripeCustomerId?: string;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
}
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `email` | `string` | ✅ | ユーザーのメールアドレス。Firebase Authのメールアドレスと同期。ユーザー識別や通知に使用。 |
| `stripeCustomerId` | `string?` | - | Stripe顧客ID（`cus_xxx`形式）。初回決済時に設定され、決済履歴やサブスクリプション管理に必要。 |
| `createdAt` | `Timestamp` | ✅ | アカウント作成日時。統計やユーザー分析に使用。 |
| `lastLoginAt` | `Timestamp` | ✅ | 最後にログインした日時。アクティブユーザーの判定や離脱分析に使用。ログインごとに更新される。 |

### データフロー

```
1. Firebase Authでサインアップ
   ↓
2. users/{uid} にドキュメントを作成
   ↓
3. 初回決済時に stripeCustomerId を更新
   ↓
4. ログインごとに lastLoginAt を更新
```

### アクセス制御

- **読み取り**: 自分のドキュメントのみ可能（`isOwner(uid)`）
- **書き込み**: サーバーサイドのみ（Admin SDK）

---

## 2. Subscription コレクション

**パス**: `subscriptions/{uid}`

**役割**: ユーザーのサブスクリプション状態を管理する、**最も重要なコレクション**です。有料機能のアクセス制御に使用されます。

### 型定義

```typescript
interface Subscription {
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  priceId: string;
  platform: SubscriptionPlatform;
  stripePriceId?: string;
  currentPeriodEnd: Timestamp;
  currentPeriodStart: Timestamp;
  trialEnd?: Timestamp;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Timestamp;
  updatedAt: Timestamp;
}

type SubscriptionStatus =
  | "active"      // 有効（課金中）
  | "trialing"    // トライアル期間中（無料）
  | "canceled"    // キャンセル済み
  | "past_due"    // 支払い遅延（自動引き落とし失敗）
  | "unpaid"      // 未払い（アクセス制限対象）
  | "incomplete"; // 不完全（初回決済が完了していない）

type SubscriptionPlan = "monthly" | "yearly";
type SubscriptionPlatform = "web" | "ios" | "android";
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `status` | `SubscriptionStatus` | ✅ | サブスクリプションの現在の状態。有料機能のアクセス制御に使用。`active` または `trialing` の場合、有料機能にアクセス可能。 |
| `plan` | `SubscriptionPlan` | ✅ | ユーザーが選択しているプラン。`monthly`（月額）または `yearly`（年額）。 |
| `priceId` | `string` | ✅ | プラットフォームとバージョンを含むプランID（例: `web_monthly_v1`, `web_yearly_v1_launch_promo`）。価格改定前後の比較、プラットフォーム別分析に使用。 |
| `platform` | `SubscriptionPlatform` | ✅ | サブスクリプションのプラットフォーム。`web`（Stripe）、`ios`（Apple In-App Purchase）、`android`（Google Play Billing）。プラットフォーム別の統計分析に使用。 |
| `stripePriceId` | `string?` | - | StripeダッシュボードのPrice ID（`price_xxx`形式）。`platform === 'web'` の場合のみ存在。プラン変更時に更新される。 |
| `currentPeriodEnd` | `Timestamp` | ✅ | **重要**: 次回課金日。この日付を超えると自動更新（または終了）。有料機能のアクセス制御に使用（`currentPeriodEnd > 現在時刻` なら有効）。 |
| `currentPeriodStart` | `Timestamp` | ✅ | 現在の課金期間の開始日。日割り計算や統計に使用。 |
| `trialEnd` | `Timestamp?` | - | トライアル期間の終了日。トライアル中は `status === 'trialing'`。この日付を過ぎると `active` に移行（または `canceled`）。 |
| `cancelAtPeriodEnd` | `boolean` | ✅ | ユーザーがキャンセルを予約したか。`true` の場合、期末に自動終了（それまではアクセス可能）。`false` の場合、自動更新される。UI表示で「○日後に終了します」の警告表示に使用。 |
| `canceledAt` | `Timestamp?` | - | キャンセル操作を実行した日時。統計や離脱分析に使用。 |
| `updatedAt` | `Timestamp` | ✅ | Webhookで更新された最終日時。デバッグや同期確認に使用。 |

### ステータス詳細

| ステータス | 意味 | アクセス可否 | 表示 |
|-----------|------|-------------|------|
| `active` | 有効（課金中） | ✅ 可能 | 「有効」 |
| `trialing` | トライアル期間中 | ✅ 可能 | 「トライアル中」 |
| `canceled` | キャンセル済み | ❌ 不可 | 「キャンセル済み」 |
| `past_due` | 支払い遅延 | ⚠️ 猶予期間 | 「支払い遅延」 |
| `unpaid` | 未払い | ❌ 不可 | 「未払い」 |
| `incomplete` | 不完全 | ❌ 不可 | 「設定不完全」 |

### データフロー

```
1. Checkoutで決済完了
   ↓
2. Webhook (checkout.session.completed) で作成
   status: 'trialing' or 'active'
   ↓
3. 毎月の課金時に Webhook (invoice.payment_succeeded) で更新
   currentPeriodStart, currentPeriodEnd を更新
   ↓
4. ユーザーがキャンセル
   cancelAtPeriodEnd = true に更新
   ↓
5. 期末に自動削除 または status = 'canceled' に更新
```

### アクセス制御

- **読み取り**: 自分のドキュメントのみ可能（`isOwner(uid)`）
- **書き込み**: サーバーサイドのみ（Webhook/Functions経由）

### 使用例

```typescript
// 有料ユーザーかチェック
const subscription = await SubscriptionRepository.getSubscription(uid);
if (isPaidUser(subscription)) {
  // active または trialing
  // 有料機能へのアクセスを許可
}

// 次回課金日の取得
const nextBilling = getNextBillingDate(subscription);
// Date オブジェクトまたは null

// キャンセル予定の警告
if (isCancelScheduled(subscription)) {
  const daysLeft = getDaysUntilNextBilling(subscription);
  // "あと5日でサブスクリプションが終了します"
}
```

---

## 3. Invoice サブコレクション

**パス**: `invoices/{uid}/user_invoices/{invoiceId}`

**役割**: Stripeで発行された請求書の履歴を保存します。ユーザーのダッシュボードで「請求履歴」として表示されます。

### 型定義

```typescript
interface Invoice {
  stripeInvoiceId: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  paid: boolean;
  status: string;
  hostedInvoiceUrl?: string;
  invoicePdf?: string;
  createdAt: Timestamp;
}
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `stripeInvoiceId` | `string` | ✅ | StripeのInvoice ID（`inv_xxx`形式）。Stripe APIとの連携に使用。 |
| `amountDue` | `number` | ✅ | 請求金額（**セント単位**）。例: 1,000円 → `100000`（JPYの場合）。UI表示時は `amountDue / 100` で円に変換。 |
| `amountPaid` | `number` | ✅ | 実際に支払われた金額（**セント単位**）。通常は `amountDue` と同じ。クーポン適用時などで異なる場合がある。 |
| `currency` | `string` | ✅ | 通貨コード（ISO 4217）。日本: `"jpy"`、アメリカ: `"usd"`。 |
| `paid` | `boolean` | ✅ | 支払いが完了しているか。`true`: 支払い済み、`false`: 未払い（支払い失敗など）。 |
| `status` | `string` | ✅ | Stripeの請求書ステータス。`"paid"`: 支払い済み、`"open"`: 未払い、`"void"`: 無効、`"uncollectible"`: 回収不能。 |
| `hostedInvoiceUrl` | `string?` | - | Stripeがホストする請求書ページのURL。ユーザーに「請求書を見る」リンクとして提供。 |
| `invoicePdf` | `string?` | - | 請求書のPDF URL（印刷用）。 |
| `createdAt` | `Timestamp` | ✅ | 請求書が発行された日時。履歴の並び替えに使用（降順）。 |

### データフロー

```
1. 毎月の課金時にStripeが自動生成
   ↓
2. Webhook (invoice.created) でFirestoreに保存
   ↓
3. Webhook (invoice.payment_succeeded) で paid と status を更新
   ↓
4. ダッシュボードで「請求履歴」として表示
```

### アクセス制御

- **読み取り**: 自分のドキュメントのみ可能（`isOwner(uid)`）
- **書き込み**: サーバーサイドのみ（Webhook経由）

### 使用例

```typescript
// 最新10件の請求履歴を取得
const invoices = await InvoiceRepository.listInvoices(uid, 10);

// 表示例
invoices.forEach(invoice => {
  const amount = invoice.amountDue / 100; // 円に変換
  const date = invoice.createdAt.toDate();
  console.log(`${date.toLocaleDateString()}: ${amount}円 (${invoice.status})`);
});
```

---

## 4. CheckoutSession コレクション

**パス**: `checkout_sessions/{sessionId}`

**役割**: Stripe Checkoutセッションの記録。**CVR計測の分母（セッション作成）と分子（決済完了）**として重要です。

### 型定義

```typescript
interface CheckoutSession {
  uid?: string;
  mode: CheckoutMode;
  priceId: string;
  platform: "web" | "ios" | "android";
  customerId?: string;
  status: CheckoutStatus;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
}

type CheckoutMode = "payment" | "subscription";
type CheckoutStatus = "created" | "completed" | "expired";
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `uid` | `string?` | - | ユーザーID。ログイン済みの場合は入る。未ログインの場合は `undefined`（ゲスト決済）。 |
| `mode` | `CheckoutMode` | ✅ | Stripe Checkoutのモード。`"subscription"`: サブスクリプション決済、`"payment"`: 単発決済。 |
| `priceId` | `string` | ✅ | 選択されたプランID（例: `web_monthly_v1`, `web_yearly_v1`, `web_yearly_v1_launch_promo`）。プラットフォームとバージョンを含む。統計: 「月額 vs 年額」の選択率分析、価格改定前後の比較、プラットフォーム別分析。 |
| `platform` | `string` | ✅ | 決済プラットフォーム。`web`（Stripe）、`ios`（Apple）、`android`（Google）。プラットフォーム別CVR分析に使用。 |
| `customerId` | `string?` | - | Stripe顧客ID（`cus_xxx`形式）。決済完了後にWebhookで更新。`platform === 'web'` の場合のみ存在。 |
| `status` | `CheckoutStatus` | ✅ | **重要**: セッションの状態。`"created"`: セッション作成（**CVR分母**）、`"completed"`: 決済完了（**CVR分子**）、`"expired"`: 有効期限切れ（離脱）。 |
| `createdAt` | `Timestamp` | ✅ | **重要**: セッション作成日時。CVR計測の分母カウント。 |
| `completedAt` | `Timestamp?` | - | **重要**: 決済完了日時。CVR計測の分子カウント。ファネル分析: `createdAt` → `completedAt` の時間差を計測可能。 |
| `utm` | `object?` | - | UTMパラメータ（広告効果測定）。流入別CVRの計測に使用。 |
| `utm.source` | `string?` | - | 流入元。例: `"google"`, `"facebook"`, `"twitter"` |
| `utm.medium` | `string?` | - | メディア。例: `"cpc"`, `"email"`, `"organic"` |
| `utm.campaign` | `string?` | - | キャンペーン名。例: `"summer2024"`, `"black_friday"` |
| `utm.term` | `string?` | - | 検索キーワード。例: `"headache app"` |
| `utm.content` | `string?` | - | 広告バリエーション。例: `"ad_variant_a"`, `"banner_01"` |

### UTMパラメータの例

```
URL: https://example.com/pricing?utm_source=google&utm_medium=cpc&utm_campaign=summer2024&utm_term=headache%20app&utm_content=ad_variant_a

保存されるデータ:
{
  "utm": {
    "source": "google",
    "medium": "cpc",
    "campaign": "summer2024",
    "term": "headache app",
    "content": "ad_variant_a"
  }
}
```

### データフロー

```
1. ユーザーが料金ページを訪問（UTMパラメータ付き）
   ↓
2. 「購入する」ボタンクリック
   ↓
3. Checkout API呼び出し → Stripe Checkoutセッション作成
   ↓
4. Webhook (checkout.session.created) で checkout_sessions に保存
   status: "created" ← CVR分母
   ↓
5. ユーザーが決済完了
   ↓
6. Webhook (checkout.session.completed) で status を "completed" に更新
   completedAt を設定 ← CVR分子
```

### CVR計算例

```typescript
// 全体CVR = completed / created
const createdCount = await db.collection('checkout_sessions')
  .where('status', '==', 'created')
  .count()
  .get();

const completedCount = await db.collection('checkout_sessions')
  .where('status', '==', 'completed')
  .count()
  .get();

const cvr = (completedCount / createdCount) * 100;
console.log(`CVR: ${cvr.toFixed(2)}%`); // 例: CVR: 15.20%

// 流入別CVR（Google広告の効果測定）
const googleSessions = await db.collection('checkout_sessions')
  .where('utm.source', '==', 'google')
  .where('utm.medium', '==', 'cpc')
  .get();

const googleCreated = googleSessions.docs.filter(d => d.data().status === 'created').length;
const googleCompleted = googleSessions.docs.filter(d => d.data().status === 'completed').length;
const googleCvr = (googleCompleted / googleCreated) * 100;
console.log(`Google広告CVR: ${googleCvr.toFixed(2)}%`);
```

### アクセス制御

- **読み取り**: 不可（セキュリティのため）
- **作成**: 認証済みユーザーのみ可能
- **更新・削除**: 不可（Webhook経由のみ）

---

## 5. AuditLog コレクション

**パス**: `audit_logs/{id}`

**役割**: ユーザー行動や重要イベントを記録する監査ログです。CVRファネル分析や行動分析に使用されます。

### 型定義

```typescript
interface AuditLog {
  type: AuditLogType;
  uid?: string;
  route?: string;
  metadata?: Record<string, any>;
  ts: Timestamp;
}

type AuditLogType =
  | "pricing_view"          // 料金ページを表示（CVRファネルの起点）
  | "checkout_started"      // チェックアウト開始
  | "checkout_completed";   // チェックアウト完了
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `type` | `AuditLogType` | ✅ | イベントの種類。CVRファネル分析に使用。 |
| `uid` | `string?` | - | ユーザーID。ログイン済みの場合は入る。未ログインの場合は `undefined`。 |
| `route` | `string?` | - | イベントが発生したページパス。例: `"/pricing"`, `"/checkout"`。ユーザー導線の分析に使用。 |
| `metadata` | `object?` | - | 追加のコンテキスト情報。柔軟に情報を追加可能。例: `{ "plan": "web_yearly_v1", "priceId": "price_xxx" }` |
| `ts` | `Timestamp` | ✅ | イベント発生日時。時系列分析に使用。 |

### イベントタイプ詳細

| タイプ | 発生タイミング | 用途 |
|-------|---------------|------|
| `pricing_view` | 料金ページを表示 | CVRファネルの起点。流入数の計測。 |
| `checkout_started` | チェックアウト開始ボタンクリック | 離脱ポイントの分析。 |
| `checkout_completed` | 決済完了 | コンバージョンの記録。 |

### データフロー

```
1. ユーザーが料金ページを訪問
   ↓
2. サーバーサイドで pricing_view イベントを記録
   ↓
3. ユーザーが「購入する」ボタンをクリック
   ↓
4. checkout_started イベントを記録
   ↓
5. ユーザーが決済完了
   ↓
6. Webhookで checkout_completed イベントを記録
```

### CVRファネル分析例

```typescript
// 日次のファネル分析
const startDate = new Date('2025-10-17');
const endDate = new Date('2025-10-18');

// 料金ページ訪問数
const pricingViews = await db.collection('audit_logs')
  .where('type', '==', 'pricing_view')
  .where('ts', '>=', startDate)
  .where('ts', '<', endDate)
  .count()
  .get();

// チェックアウト開始数
const checkoutStarted = await db.collection('audit_logs')
  .where('type', '==', 'checkout_started')
  .where('ts', '>=', startDate)
  .where('ts', '<', endDate)
  .count()
  .get();

// チェックアウト完了数
const checkoutCompleted = await db.collection('audit_logs')
  .where('type', '==', 'checkout_completed')
  .where('ts', '>=', startDate)
  .where('ts', '<', endDate)
  .count()
  .get();

// ファネル
console.log('訪問 → 開始 → 完了');
console.log(`${pricingViews} → ${checkoutStarted} → ${checkoutCompleted}`);
console.log(`CVR: ${(checkoutCompleted / pricingViews * 100).toFixed(2)}%`);
```

### アクセス制御

- **読み取り**: 不可（管理者のみ）
- **書き込み**: サーバーサイドのみ

---

## コレクション間の関係

```
users/{uid} ─────────────┐
  ↓ (1:1)                │
subscriptions/{uid}      │
  ↓ (1:N)                │
invoices/{uid}/user_invoices/{id}      │
                         │
                         │
checkout_sessions/{id} ──┤ Webhook経由で連携
  ↓ (Webhook)            │
subscriptions/{uid}      │
                         │
                         │
audit_logs/{id} ─────────┘ 独立（分析用）
```

### 連携フロー

1. **ユーザー登録時**
   ```
   Firebase Auth → users/{uid} 作成
   ```

2. **決済時**
   ```
   Checkout → checkout_sessions/{id} 作成 (status: "created")
              ↓ Webhook
              subscriptions/{uid} 作成
              ↓ Webhook
              checkout_sessions/{id} 更新 (status: "completed")
   ```

3. **毎月の課金時**
   ```
   Stripe → Webhook (invoice.payment_succeeded)
            ↓
            invoices/{uid}/user_invoices/{id} 作成
            ↓
            subscriptions/{uid} 更新 (currentPeriodEnd など)
   ```

4. **キャンセル時**
   ```
   Portal → Webhook (customer.subscription.updated)
            ↓
            subscriptions/{uid} 更新 (cancelAtPeriodEnd: true)
   ```

---

## 主要な使用パターン

### パターン1: ユーザーの有料判定

```typescript
import { SubscriptionRepository, isPaidUser } from "@/lib/firestore";

const subscription = await SubscriptionRepository.getSubscription(uid);
const isPaid = isPaidUser(subscription);

if (isPaid) {
  // active または trialing
  // 有料機能へのアクセスを許可
} else {
  // アクセス制限または課金ページへリダイレクト
}
```

### パターン2: 次回課金日の表示

```typescript
import { SubscriptionRepository, getNextBillingDate } from "@/lib/firestore";

const subscription = await SubscriptionRepository.getSubscription(uid);
const nextBilling = getNextBillingDate(subscription);

if (nextBilling) {
  console.log(`次回課金日: ${nextBilling.toLocaleDateString('ja-JP')}`);
  // 例: "次回課金日: 2025年11月17日"
}
```

### パターン3: キャンセル予定の警告

```typescript
import {
  SubscriptionRepository,
  isCancelScheduled,
  getDaysUntilNextBilling
} from "@/lib/firestore";

const subscription = await SubscriptionRepository.getSubscription(uid);

if (isCancelScheduled(subscription)) {
  const daysLeft = getDaysUntilNextBilling(subscription);
  if (daysLeft !== null && daysLeft > 0) {
    console.warn(`⚠️ あと${daysLeft}日でサブスクリプションが終了します`);
    // UI に警告バナーを表示
  }
}
```

### パターン4: 請求履歴の表示

```typescript
import { InvoiceRepository } from "@/lib/firestore";

const invoices = await InvoiceRepository.listInvoices(uid, 10);

invoices.forEach(invoice => {
  const amount = invoice.amountDue / 100; // 円に変換
  const date = invoice.createdAt.toDate();
  const status = invoice.paid ? '✅ 支払い済み' : '❌ 未払い';
  
  console.log(`${date.toLocaleDateString()}: ¥${amount.toLocaleString()} ${status}`);
  // 例: "2025/10/17: ¥1,000 ✅ 支払い済み"
});
```

### パターン5: CVR計測

```typescript
import { getAdminDb } from "@/lib/firebase/admin";

const db = getAdminDb();
const startDate = new Date('2025-10-01');
const endDate = new Date('2025-10-31');

// 期間内の全セッション
const sessionsSnapshot = await db.collection('checkout_sessions')
  .where('createdAt', '>=', startDate)
  .where('createdAt', '<=', endDate)
  .get();

// ステータス別に集計
const created = sessionsSnapshot.docs.filter(
  doc => doc.data().status === 'created'
).length;

const completed = sessionsSnapshot.docs.filter(
  doc => doc.data().status === 'completed'
).length;

const cvr = (completed / created) * 100;
console.log(`10月のCVR: ${cvr.toFixed(2)}%`);
// 例: "10月のCVR: 15.20%"

// 流入別CVR
const googleSessions = sessionsSnapshot.docs.filter(
  doc => doc.data().utm?.source === 'google'
);

const googleCreated = googleSessions.filter(
  doc => doc.data().status === 'created'
).length;

const googleCompleted = googleSessions.filter(
  doc => doc.data().status === 'completed'
).length;

const googleCvr = (googleCompleted / googleCreated) * 100;
console.log(`Google広告のCVR: ${googleCvr.toFixed(2)}%`);
```

### パターン6: トライアル終了前の通知

```typescript
import { getAdminDb } from "@/lib/firebase/admin";
import { SubscriptionRepository, getRemainingTrialDays } from "@/lib/firestore";

// トライアル終了3日前のユーザーを抽出
const db = getAdminDb();
const threeDaysLater = new Date();
threeDaysLater.setDate(threeDaysLater.getDate() + 3);

const subscriptions = await db.collection('subscriptions')
  .where('status', '==', 'trialing')
  .where('trialEnd', '<=', threeDaysLater)
  .get();

subscriptions.forEach(async doc => {
  const uid = doc.id;
  const subscription = doc.data();
  const remainingDays = getRemainingTrialDays(subscription);
  
  console.log(`ユーザー ${uid}: トライアル終了まであと${remainingDays}日`);
  // メール通知を送信
  // await sendTrialEndingEmail(uid, remainingDays);
});
```

### パターン7: 支払い失敗の処理

```typescript
// Webhook: invoice.payment_failed
export async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  
  // Stripe顧客IDからuidを取得
  const usersSnapshot = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();
  
  if (usersSnapshot.empty) return;
  
  const uid = usersSnapshot.docs[0].id;
  
  // サブスクリプションステータスを更新
  await SubscriptionRepository.updateSubscription(uid, {
    status: 'past_due',
  });
  
  // ユーザーに通知
  console.log(`⚠️ ユーザー ${uid} の支払いが失敗しました`);
  // await sendPaymentFailedEmail(uid);
}
```

---

## まとめ

### 各コレクションの重要度

| コレクション | 重要度 | 主な用途 |
|-------------|--------|---------|
| **subscriptions** | ⭐⭐⭐⭐⭐ | 有料機能のアクセス制御（最重要） |
| **users** | ⭐⭐⭐⭐ | ユーザー基本情報とStripe連携 |
| **invoices** | ⭐⭐⭐ | 請求履歴の表示 |
| **checkout_sessions** | ⭐⭐⭐⭐ | CVR計測と流入分析 |
| **audit_logs** | ⭐⭐⭐ | 行動分析とファネル最適化 |
