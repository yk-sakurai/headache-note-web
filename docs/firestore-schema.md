# Firestore スキーマ詳細ドキュメント

Firestoreの各コレクションとフィールドの意味（役割）を詳しく説明します。

## 目次

1. [User コレクション](#1-user-コレクション)
2. [Subscription コレクション](#2-subscription-コレクション)
3. [Invoice サブコレクション](#3-invoice-サブコレクション)
4. [CheckoutSession コレクション](#4-checkoutsession-コレクション)
5. [AuditLog コレクション](#5-auditlog-コレクション)
6. [Device サブコレクション](#6-device-サブコレクション)
6.5. [UserSettings サブコレクション](#65-usersettings-サブコレクション)
7. [Metrics サブコレクション](#7-metrics-サブコレクション)
8. [AiReport サブコレクション](#8-aireport-サブコレクション)
9. [AiReportRequest サブコレクション](#9-aireportrequest-サブコレクション)
9.5. [AiReportAutoGenerationPreference サブコレクション](#95-aireportautogenerationpreference-サブコレクション)
10. [HeadacheLog コレクション](#10-headachelog-コレクション)
11. [HeadacheLogPreference コレクション](#11-headachelogpreference-コレクション)
12. [SummaryReportCounts コレクション](#12-summaryreportcounts-コレクション)
13. [Notification コレクション](#13-notification-コレクション)
14. [Banner コレクション](#14-banner-コレクション)
15. [Term コレクション](#15-term-コレクション)
16. [PrivacyPolicy コレクション](#16-privacypolicy-コレクション)
17. [PrivacyNotice コレクション](#17-privacynotice-コレクション)
18. [PrivacyConsent コレクション](#18-privacyconsent-コレクション)
19. [UserAppVersion コレクション](#19-userappversion-コレクション)
20. [DeletedUserSnapshot コレクション](#20-deletedusersnapshot-コレクション)
21. [Debug コレクション](#21-debug-コレクション)
22. [AppConfigs コレクション](#22-appconfigs-コレクション)
23. [Location コレクション](#23-location-コレクション)
24. [UsageTracking サブコレクション](#24-usagetracking-サブコレクション)
25. [SubscriptionPlan コレクション](#25-subscriptionplan-コレクション)
26. [WeatherCache コレクション](#26-weathercache-コレクション)
27. [ApiUsage コレクション](#27-apiusage-コレクション)
28. [SubscriptionTrial コレクション](#28-subscriptiontrial-コレクション)
29. [コレクション間の関係](#コレクション間の関係)
30. [主要な使用パターン](#主要な使用パターン)

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
  lastLoginAt?: Timestamp;
  lastUsedAt?: Timestamp;
  isAdmin?: boolean;
  isDeleted?: boolean;
  deletedAt?: Timestamp;
  totalActiveSessionCount?: number;
  totalActiveDaysCount?: number;
  lastActiveDate?: string;
}
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `email` | `string` | ✅ | ユーザーのメールアドレス。Firebase Authのメールアドレスと同期。ユーザー識別や通知に使用。 |
| `stripeCustomerId` | `string?` | - | Stripe顧客ID（`cus_xxx`形式）。初回決済時に設定され、決済履歴やサブスクリプション管理に必要。 |
| `createdAt` | `Timestamp` | ✅ | アカウント作成日時。統計やユーザー分析に使用。 |
| `lastLoginAt` | `Timestamp?` | - | 最後にログインした日時。アクティブユーザーの判定や離脱分析に使用。ログインごとに更新される。 |
| `lastUsedAt` | `Timestamp?` | - | 最終利用日時。頭痛の記録・コラムの閲覧・レポートの出力など、アプリ利用時に更新される。アクティブユーザーの集計に利用される。 |
| `isAdmin` | `boolean?` | - | 管理者フラグ。`true` の場合、管理者権限を持つ。 |
| `isDeleted` | `boolean?` | - | 削除フラグ。論理削除されたユーザーを示す。 |
| `deletedAt` | `Timestamp?` | - | 論理削除日時。`isDeleted === true` の場合に設定。 |
| `totalActiveSessionCount` | `number?` | - | 累計アクティブセッション数。アプリ起動時にインクリメントされる。 |
| `totalActiveDaysCount` | `number?` | - | 累計アクティブ日数。1日のうち最初のアプリ起動時にインクリメントされる。 |
| `lastActiveDate` | `string?` | - | 最後にアクティブだった日付。`YYYY-MM-DD` 形式。アクティブ日数の集計に使用。 |

### データフロー

```
1. Firebase Authでサインアップ
   ↓
2. users/{uid} にドキュメントを作成
   ↓
3. 初回決済時に stripeCustomerId を更新
   ↓
4. ログインごとに lastLoginAt を更新
5. Webの退会処理時は `isDeleted: true` と `deletedAt` を設定し、ドキュメント自体は保持
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
  currentPeriodEnd?: Timestamp;
  currentPeriodStart?: Timestamp;
  trialEnd?: Timestamp;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Timestamp;
  updatedAt?: Timestamp;
  firstSubscribedAt?: Timestamp;
  trialStartedAt?: Timestamp;
  appleTransactionId?: string;
  appleOriginalTransactionId?: string;
  appleWebOrderLineItemId?: string;
  applePurchaseDate?: Timestamp;
  appleOriginalPurchaseDate?: Timestamp;
  appleEnvironment?: string;
  lastVerifiedAt?: Timestamp;
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
| `currentPeriodEnd` | `Timestamp?` | - | **重要**: 次回課金日。この日付を超えると自動更新（または終了）。有料機能のアクセス制御に使用（`currentPeriodEnd > 現在時刻` なら有効）。 |
| `currentPeriodStart` | `Timestamp?` | - | 現在の課金期間の開始日。日割り計算や統計に使用。 |
| `trialEnd` | `Timestamp?` | - | トライアル期間の終了日。トライアル中は `status === 'trialing'`。この日付を過ぎると `active` に移行（または `canceled`）。 |
| `cancelAtPeriodEnd` | `boolean` | ✅ | ユーザーがキャンセルを予約したか。`true` の場合、期末に自動終了（それまではアクセス可能）。`false` の場合、自動更新される。UI表示で「○日後に終了します」の警告表示に使用。 |
| `canceledAt` | `Timestamp?` | - | キャンセル操作を実行した日時。統計や離脱分析に使用。 |
| `updatedAt` | `Timestamp?` | - | Webhookで更新された最終日時。デバッグや同期確認に使用。 |
| `firstSubscribedAt` | `Timestamp?` | - | 初回サブスクリプション開始日時。ユーザーが最初に有料会員になった日時。統計やLTV分析に使用。 |
| `trialStartedAt` | `Timestamp?` | - | トライアル開始日時。トライアルからの転換率分析に使用。 |
| `appleTransactionId` | `string?` | - | iOS課金検証で採用した最新AppleトランザクションのID。Appleレシート/JWSの `transaction_id` または `transactionId` に対応し、復元・再検証時にどの取引を購読状態へ反映したかを監査するために使用。値が取得できない場合は削除される。 |
| `appleOriginalTransactionId` | `string?` | - | iOS課金検証で採用したトランザクションの元トランザクションID。Appleレシート/JWSの `original_transaction_id` または `originalTransactionId` に対応し、更新をまたいだ同一購読系列の追跡に使用。値が取得できない場合は削除される。 |
| `appleWebOrderLineItemId` | `string?` | - | iOS課金検証で採用したトランザクションのWeb Order Line Item ID。Appleレシート/JWSの `web_order_line_item_id` または `webOrderLineItemId` に対応し、Apple側の自動更新購読ラインアイテムを確認するために使用。値が取得できない場合は削除される。 |
| `applePurchaseDate` | `Timestamp?` | - | iOS課金検証で採用したトランザクションの購入日時。Appleレシート/JWSの `purchase_date_ms` または `purchaseDate` に対応し、監査用に保存する。値が取得できない場合は削除される。月間プランのみの現在仕様では、`currentPeriodStart` は `currentPeriodEnd` からUTCカレンダー上の1か月前を推定して保存する。 |
| `appleOriginalPurchaseDate` | `Timestamp?` | - | iOS課金検証で採用したトランザクション系列の初回購入日時。Appleレシート/JWSの `original_purchase_date_ms` または `originalPurchaseDate` に対応し、Apple側での初回購読開始時点を監査するために使用。値が取得できない場合は削除される。 |
| `appleEnvironment` | `string?` | - | iOS課金検証で採用したAppleレスポンスまたはJWSの環境（例: `Sandbox`, `Production`）。検証データがサンドボックス由来か本番由来かを監査・デバッグするために使用。値が取得できない場合は削除される。 |
| `lastVerifiedAt` | `Timestamp?` | - | サブスクリプション検証を最後に実行した日時。iOSでは有効な最新トランザクションを反映したときに更新され、古い・期限切れ・期限不明などで購読状態を更新しない場合も、既存ドキュメントがあれば監査用に更新される。 |

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

## 6. Device サブコレクション

**パス**: `users/{uid}/devices/{deviceId}`

**役割**: ユーザーのデバイス情報を管理し、プッシュ通知の送信先として使用されます。

### 型定義

```typescript
interface Device {
  userId: string;
  token: string;
  platform: string;
  appVersion?: string;
  osVersion?: string;
  deviceModel?: string;
  timezone?: string;
  tokenValid: boolean;
  lastRefreshedAt?: Timestamp;
  lastSeenAt?: Timestamp;
  push: DevicePushSettings;
}

interface DevicePushSettings {
  pushEnabled: boolean;
  channels: {
    [key: string]: boolean;
  };
}
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `userId` | `string` | ✅ | ユーザーID。親コレクションのuidと一致。 |
| `token` | `string` | ✅ | FCM（Firebase Cloud Messaging）トークン。プッシュ通知の送信先。 |
| `platform` | `string` | ✅ | プラットフォーム。`ios` または `android`。 |
| `appVersion` | `string?` | - | アプリバージョン。例: `"1.0.0"`。バージョン別の通知制御に使用。 |
| `osVersion` | `string?` | - | OSバージョン。例: iOS `"17.0"`, Android `"14"`。 |
| `deviceModel` | `string?` | - | デバイスモデル。例: `"iPhone 15 Pro"`, `"Pixel 8"`。 |
| `timezone` | `string?` | - | デバイスのタイムゾーン。例: `"Asia/Tokyo"`。スケジュール通知のローカル時間計算に使用。 |
| `tokenValid` | `boolean` | ✅ | トークンが有効かどうか。`false` の場合、プッシュ通知の送信対象外。 |
| `lastRefreshedAt` | `Timestamp?` | - | トークンが最後に更新された日時。 |
| `lastSeenAt` | `Timestamp?` | - | デバイスが最後にアクティブだった日時。 |
| `push.pushEnabled` | `boolean` | ✅ | プッシュ通知が有効かどうか。ユーザー設定。 |
| `push.channels` | `object` | ✅ | チャンネル別の通知設定。例: `{ "notification": true, "ai_report_generated": true }` |

`PushChannelConstants.all` に含まれるチャンネルは、新規デバイス登録時および既存デバイス更新経路（アプリ起動、ログイン時有効化、FCM トークン更新、プッシュ通知設定画面初期化）で、欠落キーのみ `push.pushEnabled` と同値に補完して保存します。AIレポート作成完了通知は `users/{uid}/devices/{deviceId}.push.channels.ai_report_generated` でデバイス別に管理します。

### アクセス制御

- **読み取り**: 自分のサブコレクションのみ可能（`isOwner(uid)`）
- **書き込み**: 自分のサブコレクションのみ可能（`isOwner(uid)`）

---

## 6.5. UserSettings サブコレクション

**パス**: `users/{uid}/userSettings/{docId}`

**役割**: ユーザーごとの設定情報を管理するサブコレクションです。天気取得用の位置情報、頭痛警戒通知用の地域設定、気圧変動通知の前回警戒度などを保存します。

### location ドキュメント

**パス**: `users/{uid}/userSettings/location`

**役割**: 天気情報取得用のユーザー位置情報を管理します。GPS（現在地）または手動選択の地域情報を保存し、アプリ起動時に同期されます。

#### 型定義

```typescript
interface UserSettingsLocation {
  selectedLocation: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    type: string;
    countryCode: string | null;
  };
  updatedAt: Timestamp;
  source: LocationSource;
}

type LocationSource = "gps" | "manual_selection";
```

#### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `selectedLocation.id` | `string` | ✅ | 地域ID。GPS使用時は `"current_position"`、手動選択時は Location コレクションの ID。 |
| `selectedLocation.name` | `string` | ✅ | 地域名。GPS使用時は `"現在地"`、手動選択時は地域名（例: `"東京都"`）。 |
| `selectedLocation.latitude` | `number` | ✅ | 緯度。天気API呼び出しに使用。 |
| `selectedLocation.longitude` | `number` | ✅ | 経度。天気API呼び出しに使用。 |
| `selectedLocation.type` | `string` | ✅ | 地域タイプ。GPS使用時は `"gps"`、手動選択時は `"prefecture"` 等。 |
| `selectedLocation.countryCode` | `string \| null` | ✅ | 国コード。GPS使用時は `null`、手動選択時は `"JP"` 等。 |
| `updatedAt` | `Timestamp` | ✅ | 最終同期日時。 |
| `source` | `LocationSource` | ✅ | 位置情報のソース。`"gps"`（GPS取得）または `"manual_selection"`（手動選択）。 |

#### データフロー

```
1. アプリ起動時に LocationSyncService.syncOnAppStart() が呼ばれる
   ↓
2a. Hive に手動選択地域がある場合
    → syncSelectedLocation() で Firestore に同期（source: "manual_selection"）
2b. 手動選択地域がない場合
    → syncCurrentPosition() で GPS座標を取得し Firestore に同期（source: "gps"）
   ↓
3. Cloud Functions がこのドキュメントを参照して天気情報を取得
```

### headacheAlertLocation ドキュメント

**パス**: `users/{uid}/userSettings/headacheAlertLocation`

**役割**: 頭痛警戒度通知用の地域設定を管理します。天気警戒通知・気圧変動通知の Cloud Functions がこのドキュメントを参照してユーザーの位置情報を取得します。

#### 型定義

```typescript
interface UserSettingsHeadacheAlertLocation {
  location: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    type: string | null;
    countryCode: string | null;
  };
  source: LocationSource;
  updatedAt: Timestamp;
}

type LocationSource = "gps" | "manual_selection";
```

#### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `location.id` | `string` | ✅ | 地域ID。 |
| `location.name` | `string` | ✅ | 地域名。 |
| `location.latitude` | `number` | ✅ | 緯度。天気API呼び出しに使用。 |
| `location.longitude` | `number` | ✅ | 経度。天気API呼び出しに使用。 |
| `location.type` | `string?` | - | 地域タイプ。 |
| `location.countryCode` | `string?` | - | 国コード。 |
| `source` | `LocationSource` | ✅ | 位置情報のソース。`"gps"` または `"manual_selection"`。 |
| `updatedAt` | `Timestamp` | ✅ | 最終更新日時。 |

#### 使用箇所

- `sendWeatherHeadacheAlertNotification`（天気警戒通知）
- `sendPressureChangeNotification`（気圧変動通知）

### lastAlertLevel ドキュメント

**パス**: `users/{uid}/userSettings/lastAlertLevel`

**役割**: 気圧変動通知の前回警戒度を保存します。通知の重複防止（前回と同じ警戒度の場合は通知しない）に使用されます。

#### 型定義

```typescript
interface UserSettingsLastAlertLevel {
  alertLevel: AlertLevel;
  updatedAt: Timestamp;
  location: {
    latitude: number;
    longitude: number;
  };
}

type AlertLevel = "none" | "low" | "medium" | "high";
```

#### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `alertLevel` | `AlertLevel` | ✅ | 前回の警戒度。`"none"`, `"low"`, `"medium"`, `"high"` のいずれか。 |
| `updatedAt` | `Timestamp` | ✅ | 最終更新日時。 |
| `location.latitude` | `number` | ✅ | 判定時の緯度。 |
| `location.longitude` | `number` | ✅ | 判定時の経度。 |

#### 使用箇所

- `sendPressureChangeNotification`（気圧変動通知）で読み書き

### アクセス制御

- **読み取り**: 自分のサブコレクションのみ可能（`isOwner(uid)`）+ Cloud Functions
- **書き込み**: 自分のサブコレクションのみ可能（`isOwner(uid)`）+ Cloud Functions（`lastAlertLevel`）
- **削除**: アカウント削除時に `DeleteUserService` から削除

---

## 7. Metrics サブコレクション

**パス**: `users/{uid}/metrics/{metricId}`

**役割**: ユーザーに関する計算された統計データ・指標を保存します。ユーザー設定（userSettings）とは異なり、システムが自動計算したデータを格納します。

### headacheAlertAccuracy ドキュメント

**パス**: `users/{uid}/metrics/headacheAlertAccuracy`

**役割**: 頭痛警戒通知の的中率（発生率）データを保存します。過去90日間の通知送信日と頭痛記録を照合して計算されます。

#### 型定義

```typescript
interface HeadacheAlertAccuracy {
  headacheRate: number;
  headacheDays: number;
  totalDays: number;
  updatedAt: Timestamp;
}
```

#### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `headacheRate` | `number` | ✅ | 頭痛発生率（0.0〜1.0）。`headacheDays / totalDays` で計算。 |
| `headacheDays` | `number` | ✅ | 通知送信日のうち、頭痛が発生した日数。 |
| `totalDays` | `number` | ✅ | 判定可能な総日数（頭痛あり or 頭痛なしの記録がある日）。 |
| `updatedAt` | `Timestamp` | ✅ | 最終更新日時。毎日午前1時（JST）に更新される。 |

#### データフロー

```
1. Cloud Functions (calculateHeadacheAlertAccuracy) が毎日午前1時に実行
   ↓
2. 過去90日間の headache_alert_notifications_log と pressure_change_notifications_log を取得
   ↓
3. 各ユーザーの headache_logs と照合し、通知日の頭痛発生率を計算
   ↓
4. users/{uid}/metrics/headacheAlertAccuracy に保存
   ↓
5. アプリで天気画面に表示
```

#### アクセス制御

- **読み取り**: 自分のドキュメントのみ可能（`isOwner(uid)`）
- **書き込み**: サーバーサイドのみ（Cloud Functions）

---

## 8. AiReport サブコレクション

**パス**: `users/{uid}/ai_reports/{reportId}`

**役割**: AI分析による頭痛レポートを保存します。ユーザーの頭痛パターンを分析し、要約とアドバイスを提供します。

### 型定義

```typescript
interface AiReport {
  periodType: PeriodType;
  startAt: Timestamp;
  endAt: Timestamp;
  summary: string;
  stats: AiReportStats;
  model: string;
  source: ReportSource;
  tokenUsage?: AiReportTokenUsage;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  readAt?: Timestamp;
}

type PeriodType = "daily" | "weekly" | "monthly";
type ReportSource = "on_demand" | "batch";

interface AiReportStats {
  totalLogs: number;
  headacheLogs: number;
  headacheFreeLogs: number;
  averageIntensity?: number;
  medianIntensity?: number;
  maxIntensity?: number;
  minIntensity?: number;
  averageDurationMinutes?: number;
  commonTriggers: FrequencyCount[];
  commonLocations: FrequencyCount[];
  commonTypes: FrequencyCount[];
  commonAssociatedSymptoms: FrequencyCount[];
  medicationUsageCount: number;
  medications: FrequencyCount[];
  firstLogAt?: string;
  lastLogAt?: string;
}

interface FrequencyCount {
  key: string;
  count: number;
}

interface AiReportTokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `periodType` | `PeriodType` | ✅ | レポート期間のタイプ。`daily`（日次）、`weekly`（週次）、`monthly`（月次）。 |
| `startAt` | `Timestamp` | ✅ | レポート期間の開始日時。 |
| `endAt` | `Timestamp` | ✅ | レポート期間の終了日時。 |
| `summary` | `string` | ✅ | AI生成の要約テキスト。頭痛のパターン、トリガー、推奨事項などが含まれる。 |
| `stats` | `AiReportStats` | ✅ | 統計データ。頭痛記録の集計結果。 |
| `model` | `string` | ✅ | 使用したAIモデル名。例: `"gemini-1.5-flash-002"` |
| `source` | `ReportSource` | ✅ | レポート生成の発生源。`on_demand`（ユーザー要求）または `batch`（自動生成バッチ）。Flutter の一覧・詳細画面ではこの値を `手動生成` / `自動生成` の表示に変換する。 |
| `tokenUsage` | `AiReportTokenUsage?` | - | AI APIのトークン使用量。コスト計算に使用。 |
| `createdAt` | `Timestamp?` | - | レポート作成日時。 |
| `updatedAt` | `Timestamp?` | - | レポート更新日時。 |
| `readAt` | `Timestamp?` | - | ユーザーが閲覧した日時。未読管理に使用。 |

### アクセス制御

- **読み取り**: 自分のサブコレクションのみ可能（`isOwner(uid)`）
- **書き込み**: 自分のサブコレクションのみ可能（`isOwner(uid)`）

---

## 9. AiReportRequest サブコレクション

**パス**: `users/{uid}/ai_report_requests/{requestId}`

**役割**: AIレポート生成のリクエストを記録します。生成状態の追跡とエラーハンドリングに使用されます。

### 型定義

```typescript
interface AiReportRequest {
  periodType: PeriodType;
  requestedAt: Timestamp;
  status: "pending" | "success" | "error";
  reportId?: string;
  errorCode?: string;
  errorMessage?: string;
  source: ReportSource;
  targetYearMonth?: string;
  lockOwner?: string;
  lockExpiresAt?: Timestamp | null;
  attemptCount?: number;
  startAt?: Timestamp;
  endAt?: Timestamp;
  endExclusiveAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `periodType` | `PeriodType` | ✅ | リクエストされたレポート期間のタイプ。 |
| `requestedAt` | `Timestamp` | ✅ | リクエスト日時。 |
| `status` | `string` | ✅ | リクエスト状態。`"pending"`（処理中）、`"success"`（完了）、`"error"`（エラー）。既存データ互換の読み取りでは旧表記 `"completed"` を成功扱いしてよい。 |
| `reportId` | `string?` | - | 生成されたレポートのID。`status === 'success'` の場合に設定。 |
| `errorCode` | `string?` | - | エラーコード。`status === 'error'` の場合に設定。 |
| `errorMessage` | `string?` | - | エラーメッセージ。`status === 'error'` の場合に設定。 |
| `source` | `ReportSource` | ✅ | リクエストの発生源。`on_demand` または `batch`。 |
| `targetYearMonth` | `string?` | - | 月次 batch の対象月。`YYYYMM` 形式。 |
| `lockOwner` | `string?` | - | 月次 batch の処理権を持つ実行ID。`status === 'pending'` の間だけ有効。 |
| `lockExpiresAt` | `Timestamp?` | - | 月次 batch の pending lock 期限。期限切れ後は retry 条件を満たす場合のみ再ロック可能。 |
| `attemptCount` | `number?` | - | 月次 batch の生成試行回数。 |
| `startAt` | `Timestamp?` | - | 月次 batch の対象期間開始。 |
| `endAt` | `Timestamp?` | - | レポート表示互換用の対象期間終了。月次 batch では排他的終端の1ms前。 |
| `endExclusiveAt` | `Timestamp?` | - | 月次 batch の Firestore クエリ用排他的終端。`timing < endExclusiveAt` で使用。 |
| `createdAt` | `Timestamp?` | - | ドキュメント作成日時。 |
| `updatedAt` | `Timestamp?` | - | 最終更新日時。 |

`scheduled` は Cloud Functions の実行形態を表す語のため、保存データ上の生成元には使用しません。複数ユーザーをまとめて処理する自動生成の発生源として、Functions / Flutter の型と一致する `batch` を使用します。

月次 batch でログ不足・サブスクリプション無効・既存レポートなどにより生成対象外になった場合、`ai_report_requests` へ `skipped` や `subscription_required` などの status は保存しません。スキップ理由は Cloud Functions の集計ログと月次 batch state の `stats.skipReasons` にのみ記録し、このサブコレクションは LLM 生成の処理権確保と生成結果記録に限定します。

### アクセス制御

- **読み取り**: 自分のサブコレクションのみ可能（`isOwner(uid)`）
- **書き込み**: 自分のサブコレクションのみ可能（`isOwner(uid)`）

---

## 9.5. AiReportAutoGenerationPreference サブコレクション

**パス**: `users/{uid}/ai_report_preferences/auto_generation`

**役割**: 月次 AI レポートの自動生成可否をユーザーごとに保存します。自動生成はユーザー許可制で運用するため、このドキュメントは同意状態を表すプライバシー境界として扱います。

ドキュメント ID は `auto_generation` 固定です。`ai_report_preferences` 配下に任意 ID の設定ドキュメントは作成しません。

### 型定義

```typescript
interface AiReportAutoGenerationPreference {
  userId: string;
  autoGenerateEnabled: boolean;
  autoGenerateConsentAt: Timestamp | null;
  autoGenerateDisabledAt: Timestamp | null;
  autoGenerateDay: number;
  includeMemo: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### フィールド説明

| フィールド | 型 | 初期値 | 説明 |
|-----------|-----|--------|------|
| `userId` | `string` | 認証ユーザーの uid | 所有者 uid。親パス `users/{uid}` と一致させる。 |
| `autoGenerateEnabled` | `boolean` | `false` | 月次 AI レポート自動生成を有効にするか。 |
| `autoGenerateConsentAt` | `Timestamp \| null` | `null` | 自動生成を ON にした日時。ON 更新時に server timestamp で更新する。 |
| `autoGenerateDisabledAt` | `Timestamp \| null` | `null` | 自動生成を OFF にした日時。OFF 更新時に server timestamp で更新する。 |
| `autoGenerateDay` | `number` | `1` | 生成日設定。Firestore rules で 1 から 31 の整数に制限します。 |
| `includeMemo` | `boolean` | `false` | メモ含有設定。 |
| `createdAt` | `Timestamp` | server timestamp | 初回作成日時。初回作成時のみ保存し、更新時は変更しない。 |
| `updatedAt` | `Timestamp` | server timestamp | 作成・更新ごとの最終更新日時。 |

### 更新ルール

- 初回作成時は `createdAt` と `updatedAt` を server timestamp で保存します。
- ON 更新時は `autoGenerateEnabled: true` とし、`autoGenerateConsentAt` と `updatedAt` を server timestamp で更新します。
- OFF 更新時は `autoGenerateEnabled: false` とし、`autoGenerateDisabledAt` と `updatedAt` を server timestamp で更新します。
- 既存ドキュメント更新時は `createdAt` を上書きしません。
- AIレポート作成完了通知はこのドキュメントでは管理せず、デバイス別の `push.channels.ai_report_generated` で管理します。

### アクセス制御

- **読み取り**: 自分の固定ドキュメントのみ可能（`users/{uid}/ai_report_preferences/auto_generation`）。
- **作成・更新**: 自分の固定ドキュメントのみ可能。Firestore rules で固定ドキュメント ID、所有者 uid、許可フィールド、必須フィールド、型、`autoGenerateDay` の値域、`createdAt` 不変性、`updatedAt` の server timestamp 更新を制約します。
- **削除**: 自分の固定ドキュメントのみ可能。退会時に `DeleteUserService` から削除します。

### 退会時削除

`users/{uid}/ai_report_preferences/auto_generation` は親ユーザードキュメントの削除や論理削除では自動削除されないため、退会処理で固定ドキュメントを明示的に削除します。`DeletedUserSnapshot` には自動生成同意、無効化日時、設定 uid を残しません。

### Cloud Functions での利用方針

月次自動生成では `ai_report_preferences` collection group を `autoGenerateEnabled ASC, autoGenerateDay ASC, userId ASC` の複合インデックスでページングします。処理対象 uid は `userId` フィールドだけに依存せず、親パス `users/{uid}` から解決した uid を信頼します。親パス uid と `userId` が一致しない場合は生成対象外とし、Functions 集計ログの `preference_uid_mismatch` として扱います。

---

## 9.6. AiReportMonthlyBatchState システムジョブ

**パス**: `system_jobs/ai_report_monthly_batches/months/{yearMonth}`

**役割**: 月次 AI レポート自動生成 scheduled function の実行状態、再開 cursor、集計値を保存します。MVP では `partial` を正常終了として保存し、自動再起動は行いません。未完了月は `runMonthlyAiReportsForNow(now, { targetYearMonth: "YYYYMM" })` を手動 runner から再実行して cursor から継続します。

### 型定義

```typescript
interface AiReportMonthlyBatchState {
  yearMonth: string;
  status: "running" | "partial" | "completed" | "error";
  cursorUserId: string | null;
  runOwner: string | null;
  lockExpiresAt: Timestamp | null;
  startedAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp | null;
  stats: {
    generated: number;
    skipped: number;
    error: number;
    scanned: number;
    dryRunEligible?: number;
    skipReasons?: Record<string, number>;
    errorCodes?: Record<string, number>;
  };
}
```

### 運用メモ

- `generateMonthlyAiReports` は毎月1日 12:00（Asia/Tokyo）に実行され、前月分の対象ユーザーを走査して `source: "batch"` の AI レポートを生成します。
- 対象ユーザーは `users/{uid}/ai_report_preferences/auto_generation` の `autoGenerateEnabled: true` かつ `autoGenerateDay: 1` を collection group で取得します。MVP では生成日は 1 日固定です。
- ユーザー単位の生成前に、サブスクリプション有効性、前月の頭痛記録数、既存レポート、既存リクエスト lock を確認します。生成対象外の理由は `stats.skipReasons` に集計し、頭痛メモや LLM 入力本文などの個人情報は保存しません。
- LLM 生成を試みたユーザー数が1回の実行上限に到達した場合、または実行時間に余裕がない場合は `partial` として保存します。`partial` は MVP では正常な中断状態であり、自動再起動は行いません。
- 全対象ユーザーを処理し終えた場合は `completed` とし、`cursorUserId` を `null` に戻します。致命的エラーで継続できない場合は `error` として保存します。
- `cursorUserId` は「読み終えた最後」ではなく、生成または skip 判定が完了した最後の `userId` を保存します。ページ取得済みでも未処理のユーザーは cursor に含めません。
- fresh な `running` / `partial` lock がある場合、同時起動した scheduled function は skip します。
- stale な lock は transaction で再取得できます。
- スキップ理由には個人情報や頭痛メモ、LLM 入力本文、API キーを含めません。

---

## 10. HeadacheLog コレクション

**パス**: `headache_logs/{logId}`

**役割**: ユーザーの頭痛記録を管理します。アプリのコア機能であり、頭痛の詳細情報を記録します。

### 型定義

```typescript
interface HeadacheLog {
  userId: string;
  timing: Timestamp;
  intensity?: number;
  duration?: number;
  locations?: string[];
  types?: string[];
  triggers?: string[];
  medications?: HeadacheMedication[];
  actions?: HeadacheAction[];
  associatedSymptoms?: string[];
  note?: string;
  isHeadacheFree?: boolean;
}

interface HeadacheMedication {
  name: string;
  takenAt: Timestamp;
  dosage: number;
  unit: string;
  effectiveness?: number;
}

interface HeadacheAction {
  text: string;
  takenAt: Timestamp;
  effectiveness?: number;
}
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `userId` | `string` | ✅ | ユーザーID。このログの所有者。 |
| `timing` | `Timestamp` | ✅ | 頭痛が発生した日時。記録の基準時刻。 |
| `intensity` | `number?` | - | 頭痛の強さ。1～10のスケール。 |
| `duration` | `number?` | - | 頭痛の持続時間（分）。 |
| `locations` | `string[]?` | - | 痛みの場所。例: `["前頭部", "こめかみ"]` |
| `types` | `string[]?` | - | 頭痛のタイプ。例: `["ズキズキ", "締め付けられる"]` |
| `triggers` | `string[]?` | - | 頭痛のトリガー。例: `["ストレス", "睡眠不足"]` |
| `medications` | `HeadacheMedication[]?` | - | 服用した薬。服薬を記録する場合、`dosage` はモバイル互換のため必須の数値として保存する。`effectiveness` は 0〜10。 |
| `actions` | `HeadacheAction[]?` | - | 実施した対処行動。例: `[{ "text": "休憩", "takenAt": Timestamp }]`。`effectiveness` は 0〜10。 |
| `associatedSymptoms` | `string[]?` | - | 随伴症状。例: `["吐き気", "めまい"]` |
| `note` | `string?` | - | メモ。自由記述。 |
| `isHeadacheFree` | `boolean?` | - | 頭痛がない日の記録かどうか。`true` の場合、頭痛なしの日として記録。 |

### アクセス制御

- **読み取り**: 認証済みユーザーのみ可能（自分のデータに限定）
- **書き込み**: 認証済みユーザーのみ可能（自分のデータに限定）

---

## 11. HeadacheLogPreference コレクション

**パス**: `headache_log_preferences/{userId}`

**役割**: ユーザーごとの頭痛記録フォームの設定を保存します。表示項目や入力方法のカスタマイズに使用されます。

### 型定義

```typescript
interface HeadacheLogPreference {
  userId: string;
  headacheLogFormOrder?: string[];
  visibleItems?: {
    [key: string]: boolean;
  };
  durationInputType?: string;
  hiddenRecommendedInputSetKeys?: string[];
  suggestionSettings?: SuggestionSettings;
}
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `userId` | `string` | ✅ | ユーザーID。 |
| `headacheLogFormOrder` | `string[]?` | - | フォーム項目の並び順。例: `["intensity", "duration", "locations"]` |
| `visibleItems` | `object?` | - | 項目の表示/非表示設定。例: `{ "duration": true, "note": false }` |
| `durationInputType` | `string?` | - | 持続時間の入力方法。`"endDatetime"`（終了日時）または `"duration"`（分数）。 |
| `hiddenRecommendedInputSetKeys` | `string[]?` | - | 非表示にしたおすすめ入力セットのキー。値: `"frequent"`, `"recent"` |
| `suggestionSettings` | `object?` | - | フィールドごとのサジェスト候補設定。下記参照。 |

#### suggestionSettings 構造

```typescript
interface SuggestionSettings {
  [fieldKey: string]: {  // "locations", "types", "triggers", "actions", "medications", "associatedSymptoms"
    manualItems?: {        // 手動追加候補（最大20件）
      value: { type: "text", text: string } | { type: "medication", name: string, dosage: number, unit: string };
      isVisible: boolean;  // デフォルト true
      order: number;       // 1始まり
    }[];
    mostFrequentOverride?: {  // 最頻値スロットのオーバーライド設定
      isVisible?: boolean;     // デフォルト true（false時のみ保存）
      order?: number;          // null時はデフォルト順
    };
    mostRecentOverride?: {    // 直近値スロットのオーバーライド設定
      isVisible?: boolean;     // デフォルト true（false時のみ保存）
      order?: number;          // null時はデフォルト順
    };
  };
}
```

### アクセス制御

- **読み取り**: 認証済みユーザーのみ可能
- **書き込み**: 認証済みユーザーのみ可能

---

## 11.5 HeadacheLogInputSets コレクション

**パス**: `headache_log_input_sets/{inputSetId}`

**役割**: ユーザーが作成した頭痛記録の入力セット（マイセット）を保存します。よく使う入力パターンをワンタップでフォームに反映するための機能です。

### 型定義

```typescript
interface HeadacheLogInputSet {
  userId: string;
  name: string;
  description?: string;
  displayOrder: number;
  includedFields: { [key: string]: boolean };
  intensity?: number;
  duration?: number;
  locations?: string[];
  types?: string[];
  triggers?: string[];
  medications?: { name: string; dosage: number; unit: string }[];
  actions?: { text: string }[];
  associatedSymptoms?: string[];
  note?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `userId` | `string` | ✅ | ユーザーID。 |
| `name` | `string` | ✅ | セット名。 |
| `description` | `string?` | - | 根拠テキスト（おすすめセット用）。 |
| `displayOrder` | `number` | ✅ | 表示順。 |
| `includedFields` | `object` | ✅ | 含めるフィールドの選択。`true` のフィールドのみ適用対象。 |
| `intensity` | `number?` | - | 痛みの強さ（1-10）。 |
| `duration` | `number?` | - | 継続時間（分）。 |
| `locations` | `string[]?` | - | 痛みの場所。 |
| `types` | `string[]?` | - | 痛み方。 |
| `triggers` | `string[]?` | - | トリガー。 |
| `medications` | `object[]?` | - | 薬情報（name, dosage, unit）。 |
| `actions` | `object[]?` | - | 対処情報（text）。 |
| `associatedSymptoms` | `string[]?` | - | 併発症状。 |
| `note` | `string?` | - | メモ。 |
| `createdAt` | `Timestamp` | ✅ | 作成日時。 |
| `updatedAt` | `Timestamp` | ✅ | 更新日時。 |

### アクセス制御

- **読み取り**: 認証済みユーザーのみ可能
- **書き込み**: 認証済みユーザーのみ可能

---

## 12. SummaryReportCounts コレクション

**パス**: `summary_report_counts/{scope}`

**役割**: サマリーレポートの表示モード別カウントを管理します。ユーザーの利用状況分析に使用されます。

### 型定義

```typescript
interface SummaryReportCounts {
  counts: {
    total: number;
    mode: {
      daily: number;
      status: number;
      ranking: number;
    };
    daily: {
      showIntensityOn: number;
      showMedicationsOn: number;
    };
    rangeBucketByMode?: {
      [mode: string]: {
        [bucket: string]: number;
      };
    };
  };
  scope: string;
  version: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `counts.total` | `number` | ✅ | 総表示回数。 |
| `counts.mode.daily` | `number` | ✅ | 日次モードの表示回数。 |
| `counts.mode.status` | `number` | ✅ | ステータスモードの表示回数。 |
| `counts.mode.ranking` | `number` | ✅ | ランキングモードの表示回数。 |
| `counts.daily.showIntensityOn` | `number` | ✅ | 日次モードで強度表示ONの回数。 |
| `counts.daily.showMedicationsOn` | `number` | ✅ | 日次モードで薬表示ONの回数。 |
| `counts.rangeBucketByMode` | `object?` | - | モード別・期間別のカウント。 |
| `scope` | `string` | ✅ | スコープ。通常はドキュメントIDと同じ。 |
| `version` | `string` | ✅ | データバージョン。デフォルト: `"counts_v1"` |
| `createdAt` | `Timestamp?` | - | 作成日時。 |
| `updatedAt` | `Timestamp?` | - | 更新日時。 |

### アクセス制御

- **読み取り**: 認証済みユーザーのみ可能
- **書き込み**: 認証済みユーザーのみ可能

---

## 13. Notification コレクション

**パス**: `notifications/{notificationId}`

**役割**: ユーザー向けのお知らせを管理します。アプリ内通知とプッシュ通知の両方に使用されます。

### 型定義

```typescript
interface Notification {
  title: string;
  content: string;
  postedAt: Timestamp;
}
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `title` | `string` | ✅ | お知らせタイトル。 |
| `content` | `string` | ✅ | お知らせ内容。 |
| `postedAt` | `Timestamp` | ✅ | 投稿日時。この日時でソートして表示される。 |

### データフロー

```
1. 管理者がnotificationドキュメントを作成
   ↓
2. Cloud Functions (onNotificationCreated) がトリガー
   ↓
3. プッシュ通知が有効なすべてのデバイスに通知を送信
   ↓
4. ユーザーがアプリ内でお知らせ一覧を確認
```

### アクセス制御

- **読み取り**: 全ユーザー可能
- **書き込み**: 認証済みユーザーのみ可能（実質的には管理者のみ）

---

## 14. Banner コレクション

**パス**: `banners/{bannerId}`

**役割**: アプリ内バナーを管理します。キャンペーンやお知らせをユーザーに視覚的に伝えます。

### 型定義

```typescript
interface Banner {
  title: string;
  subtitle?: string;
  iconName?: string;
  gradientName?: string;
  priority: number;
  active: boolean;
  publishStartAt?: Timestamp;
  publishEndAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  actionType: BannerActionType;
  actionValue?: string;
  metrics?: BannerMetrics;
}

type GradientName =
  | "homeDefault"
  | "reminder"
  | "record"
  | "trends"
  | "info"
  | "campaign"
  | "alert"
  | "danger";

type BannerActionType = "none" | "route" | "web";

interface BannerMetrics {
  impressionsTotal: number;
  interactionsTotal: number;
  lastEventAt?: Timestamp;
}
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `title` | `string` | ✅ | バナータイトル。 |
| `subtitle` | `string?` | - | バナーサブタイトル。 |
| `iconName` | `string?` | - | アイコン名。アプリ内のアイコンリソースを指定。 |
| `gradientName` | `GradientName?` | - | グラデーション名。背景デザインを指定。下記バリエーション参照。 |
| `priority` | `number` | ✅ | 表示優先度。小さい数値ほど優先度が高い。 |
| `active` | `boolean` | ✅ | 有効フラグ。`false` の場合は表示されない。 |
| `publishStartAt` | `Timestamp?` | - | 公開開始日時。 |
| `publishEndAt` | `Timestamp?` | - | 公開終了日時。 |
| `createdAt` | `Timestamp?` | - | 作成日時。 |
| `updatedAt` | `Timestamp?` | - | 更新日時。 |
| `actionType` | `BannerActionType` | ✅ | タップ時のアクション。`none`（なし）、`route`（画面遷移）、`web`（Webページ）。 |
| `actionValue` | `string?` | - | アクション値。`actionType` が `route` の場合は `/` 始まりの画面パス、`web` の場合は `http://` or `https://` 始まりのURL。`actionType: "none"` の場合は未設定。 |
| `metrics.impressionsTotal` | `number` | - | 累計表示回数。 |
| `metrics.interactionsTotal` | `number` | - | 累計タップ回数。 |
| `metrics.lastEventAt` | `Timestamp?` | - | 最終イベント日時。 |

### GradientName バリエーション

| 値 | 用途 | 配色 |
|----|------|------|
| `homeDefault` | 汎用バナー。未指定時のデフォルト配色。 | 緑・水色系 |
| `reminder` | 通知の有効化促進、記録のリマインドなど「行動喚起（軽め）」。ガイド・ヘルスケア情報への導線。 | 水色系 |
| `record` | 今日の記録開始、入力促進など「記録アクション直行」。 | 青・紫系 |
| `trends` | 週間/月間の傾向・分析・インサイトの確認誘導。 | 紺系 |
| `info` | お知らせ・軽い告知・ヘルプ・外部/内部リンク案内。アプリ更新・新機能紹介・仕様変更の周知。 | 青系 |
| `campaign` | プロモーション・クーポン・期間限定オファー等の強い訴求。 | オレンジ系 |
| `alert` | 重要度中〜高の注意喚起、期限間近のリマインド。 | 黄色系 |
| `danger` | 重要警告・エラー・緊急対応が必要な場合。 | 赤系 |

### サブコレクション

**パス**: `banners/{bannerId}/stats_daily/{dateId}`

日次統計情報を保存します。

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `impressions` | `number` | ✅ | その日の表示回数。 |
| `interactions` | `number` | ✅ | その日のタップ回数。 |
| `updatedAt` | `Timestamp` | ✅ | 更新日時。 |

### アクセス制御

- **読み取り**: 認証済みユーザーのみ可能
- **書き込み**: 認証済みユーザーのみ可能

---

## 15. Term コレクション

**パス**: `terms/{termId}`

**役割**: 利用規約を管理します。バージョン管理が可能です。

### 型定義

```typescript
interface Term {
  title: string;
  body: string;
  updatedAt?: Timestamp;
}
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `title` | `string` | ✅ | 利用規約のタイトル。 |
| `body` | `string` | ✅ | 利用規約の本文。マークダウンまたはHTMLで記述。 |
| `updatedAt` | `Timestamp?` | - | 更新日時。 |

### アクセス制御

- **読み取り**: 全ユーザー可能（未認証でも可）
- **書き込み**: 認証済みユーザーのみ可能（実質的には管理者のみ）

---

## 16. PrivacyPolicy コレクション

**パス**: `privacy_policies/{policyId}`

**役割**: プライバシーポリシーを管理します。バージョン管理が可能です。

### 型定義

```typescript
interface PrivacyPolicy {
  title: string;
  body: string;
  updatedAt?: Timestamp;
}
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `title` | `string` | ✅ | プライバシーポリシーのタイトル。 |
| `body` | `string` | ✅ | プライバシーポリシーの本文。マークダウンまたはHTMLで記述。 |
| `updatedAt` | `Timestamp?` | - | 更新日時。 |

### アクセス制御

- **読み取り**: 全ユーザー可能（未認証でも可）
- **書き込み**: 認証済みユーザーのみ可能（実質的には管理者のみ）

---

## 17. PrivacyNotice コレクション

**パス**: `privacy_notices/{noticeId}`

**役割**: GDPR/CCPA対応のプライバシー通知を管理します。地域別のプライバシー規制に対応します。

### 型定義

```typescript
interface PrivacyNotice {
  version: string;
  gdprTitle: string;
  gdprSummary: string;
  gdprDetail: string;
  ccpaTitle: string;
  ccpaSummary: string;
  ccpaDetail: string;
  updatedAt: Timestamp;
}
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `version` | `string` | ✅ | バージョン番号。例: `"1.0"`, `"2.1"` |
| `gdprTitle` | `string` | ✅ | GDPR通知のタイトル。 |
| `gdprSummary` | `string` | ✅ | GDPR通知のサマリー。簡潔な説明。 |
| `gdprDetail` | `string` | ✅ | GDPR通知の詳細。完全な説明文。 |
| `ccpaTitle` | `string` | ✅ | CCPA通知のタイトル。 |
| `ccpaSummary` | `string` | ✅ | CCPA通知のサマリー。 |
| `ccpaDetail` | `string` | ✅ | CCPA通知の詳細。 |
| `updatedAt` | `Timestamp` | ✅ | 更新日時。 |

### アクセス制御

- **読み取り**: 認証済みユーザーのみ可能
- **書き込み**: 認証済みユーザーのみ可能

---

## 18. PrivacyConsent コレクション

**パス**: `privacy_consents/{consentId}`

**役割**: ユーザーのプライバシー同意記録を保存します。法的コンプライアンスのために重要です。

### 型定義

```typescript
interface PrivacyConsent {
  userId: string;
  version: string;
  gdprConsent: boolean;
  ccpaConsent: boolean;
  setAt: Timestamp;
}
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `userId` | `string` | ✅ | ユーザーID。 |
| `version` | `string` | ✅ | 同意したプライバシー通知のバージョン。 |
| `gdprConsent` | `boolean` | ✅ | GDPR同意フラグ。 |
| `ccpaConsent` | `boolean` | ✅ | CCPA同意フラグ。 |
| `setAt` | `Timestamp` | ✅ | 同意日時。法的記録として重要。 |

### アクセス制御

- **読み取り**: 認証済みユーザーのみ可能
- **書き込み**: 認証済みユーザーのみ可能

---

## 19. UserAppVersion コレクション

**パス**: `user_app_versions/{versionId}`

**役割**: ユーザーのアプリバージョン情報を追跡します。バージョン別の統計分析に使用されます。

### 型定義

```typescript
interface UserAppVersion {
  userId: string;
  currentVersion: string;
  platform: string;
  osVersion: string;
  firstSeenVersion: string;
  firstSeenAt: Timestamp;
  lastSeenAt: Timestamp;
}
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `userId` | `string` | ✅ | ユーザーID。 |
| `currentVersion` | `string` | ✅ | 現在のアプリバージョン。例: `"1.2.3"` |
| `platform` | `string` | ✅ | プラットフォーム。`ios` / `android` / `web`。Webログイン時は `"web"` を保存。 |
| `osVersion` | `string` | ✅ | OSバージョン。Webログイン時はUser-Agentから判定した `"macOS"` / `"Windows"` / `"iOS"` / `"Android"` / `"Linux"` / `"unknown"` を保存。 |
| `firstSeenVersion` | `string` | ✅ | 初回インストール時のアプリバージョン。 |
| `firstSeenAt` | `Timestamp` | ✅ | 初回確認日時。 |
| `lastSeenAt` | `Timestamp` | ✅ | 最終確認日時。 |

### アクセス制御

- **読み取り**: 認証済みユーザーのみ可能
- **書き込み**: 認証済みユーザーのみ可能

### Webでの更新仕様

Webアプリでは `POST /api/auth/session-login` 成功時に、Admin SDKで `user_app_versions` をupsertします。ユーザーごとに1ドキュメントの構造を維持し、既存ドキュメントがある場合は `firstSeenVersion` / `firstSeenAt` を保持したまま `currentVersion` / `platform` / `osVersion` / `lastSeenAt` を更新します。`currentVersion` はWebアプリの `package.json` の `version`、`platform` は `"web"` です。

---

## 20. DeletedUserSnapshot コレクション

**パス**: `deleted_user_snapshots/{uid}`

**役割**: 削除されたユーザーの統計スナップショットを保存します。離脱分析とサービス改善に使用されます。

Webの退会処理でもモバイルアプリと同じフィールド構成で `deleted_user_snapshots/{uid}` を作成します。追加のWeb専用フィールドは持たせず、Webログイン後に退会した場合は `devicePlatform` が `"web"`、`appVersion` がWebアプリの `package.json` の `version` になることがあります。

### 型定義

```typescript
interface DeletedUserSnapshot {
  uid: string;
  registeredAt: Timestamp;
  deletedAt: Timestamp;
  totalActiveSessionCount: number;
  totalActiveDaysCount: number;
  lastUsedAt?: Timestamp;
  averageWeeklyActiveDays: number;
  headacheLogTotalCount: number;
  headacheLogActiveDays: number;
  subscriptionPlan?: string;
  subscriptionStartedAt?: Timestamp;
  subscriptionEndedAt?: Timestamp;
  trialStartedAt?: Timestamp;
  trialEndedAt?: Timestamp;
  aiReportRequests?: AiReportRequestsSnapshot;
  aiReports?: AiReportsSnapshot;
  inputSetTotalCount?: number;
  usageTrackingSummary?: { [key: string]: any };
  subscriptionStatus?: string;
  subscriptionPlatform?: string;
  devicePlatform?: string;
  appVersion?: string;
  headacheAlertAccuracy?: {
    headacheRate: number;
    headacheDays: number;
    totalDays: number;
  };
}

interface AiReportRequestsSnapshot {
  totalCount: number;
  lastRequestedAt?: Timestamp;
  monthlyCounts: { [yearMonth: string]: number };
  successCount: number;
  failureCount: number;
  countBySource: { [source: string]: number };
}

interface AiReportsSnapshot {
  totalCount: number;
  averageTokenUsage?: AiReportTokenUsageAverage;
  countByModel: { [model: string]: number };
  countBySource: { [source: string]: number };
}

interface AiReportTokenUsageAverage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `uid` | `string` | ✅ | 削除されたユーザーのID。 |
| `registeredAt` | `Timestamp` | ✅ | 登録日時。 |
| `deletedAt` | `Timestamp` | ✅ | 削除日時。 |
| `totalActiveSessionCount` | `number` | ✅ | 総アクティブセッション数。 |
| `totalActiveDaysCount` | `number` | ✅ | 総アクティブ日数。 |
| `lastUsedAt` | `Timestamp?` | - | 最終利用日時。 |
| `averageWeeklyActiveDays` | `number` | ✅ | 週平均アクティブ日数。 |
| `headacheLogTotalCount` | `number` | ✅ | 頭痛記録の総数。 |
| `headacheLogActiveDays` | `number` | ✅ | 頭痛記録を付けた日数。 |
| `subscriptionPlan` | `string?` | - | サブスクリプションプラン。有料ユーザーの場合のみ。 |
| `subscriptionStartedAt` | `Timestamp?` | - | サブスクリプション開始日時。 |
| `subscriptionEndedAt` | `Timestamp?` | - | サブスクリプション終了日時。 |
| `trialStartedAt` | `Timestamp?` | - | トライアル開始日時。 |
| `trialEndedAt` | `Timestamp?` | - | トライアル終了日時。 |
| `aiReportRequests` | `AiReportRequestsSnapshot?` | - | AIレポートリクエストの統計スナップショット。総リクエスト数、成功・失敗数、ソース別カウントなどを含む。 |
| `aiReports` | `AiReportsSnapshot?` | - | AIレポートの統計スナップショット。総レポート数、平均トークン使用量、モデル別・ソース別カウントなどを含む。`averageTokenUsage` は各トークンフィールドの非null件数を分母に小数のまま平均し、集計対象がないフィールドは保存しません。 |
| `inputSetTotalCount` | `number?` | - | マイセット作成数。 |
| `usageTrackingSummary` | `Map?` | - | 頭痛ログ操作トラッキング集計（create/update/delete/inputSetUsed等）。 |
| `subscriptionStatus` | `string?` | - | サブスクリプションステータス（active/trialing/canceled等）。 |
| `subscriptionPlatform` | `string?` | - | サブスクリプションプラットフォーム（web/ios/android）。 |
| `devicePlatform` | `string?` | - | デバイスプラットフォーム（ios/android/web）。 |
| `appVersion` | `string?` | - | アプリバージョン。 |
| `headacheAlertAccuracy` | `Map?` | - | 頭痛警戒度の的中率データ（headacheRate, headacheDays, totalDays）。 |

### アクセス制御

- **読み取り**: 不可（管理者のみ）
- **書き込み**: 不可（サーバーサイドのみ）

### Web退会処理での削除範囲

Webの退会処理は、スナップショット作成後に `headache_logs` / `headache_log_preferences` / `privacy_consents` / `user_app_versions` / `users/{uid}/ai_report_requests` / `users/{uid}/ai_reports` / `users/{uid}/ai_report_preferences/auto_generation` / `headache_log_input_sets` / `users/{uid}/usage_tracking/headacheLogUsage` / `users/{uid}/devices` / `users/{uid}/userSettings/location` / `users/{uid}/userSettings/headacheAlertLocation` / `users/{uid}/metrics/headacheAlertAccuracy` を削除します。`users/{uid}` は論理削除のみ、`subscriptions/{uid}` / `invoices` / `checkout_sessions` / `audit_logs` は保持します。

---

## 21. Debug コレクション

**パス**: `debug/{docId}`

**役割**: デバッグ用のデータを一時的に保存します。開発中のテストやトラブルシューティングに使用されます。

### アクセス制御

- **読み取り**: 認証済みユーザーのみ可能
- **書き込み**: 認証済みユーザーのみ可能

---

## 22. AppConfigs コレクション

**パス**: `app_configs/ai_report`

**役割**: AIレポート機能のレートリミットや挙動を環境に依存せず管理するための設定ドキュメントです。Functions から参照され、短期/中期/月間の上限値と月次自動生成batchの処理ペースを制御します。

### 型定義

```typescript
interface AiReportConfig {
  shortTermWindowMinutes: number; // 短期ウィンドウの長さ（分）。例: 5
  shortTermMaxReports: number;    // 短期ウィンドウ内の上限回数。例: 5
  midTermWindowHours: number;     // 中期ウィンドウの長さ（時間）。例: 24
  midTermMaxReports: number;      // 中期ウィンドウ内の上限回数。例: 30
  monthlyMaxReports: number;      // 月間上限回数（当月1日〜月末）。例: 100
  systemMaxRequestsPerMinute: number; // システム全体の1分あたりの上限リクエスト数。例: 32
  batchMaxUsersPerMinute?: number;  // 月次自動生成batchの1分あたり処理ユーザー数。例：10
  batchWaitSecondsPerChunk?: number; // 月次自動生成batchのチャンク間待機秒数。例：60
  updatedAt: Timestamp;           // 設定更新日時。
}
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `shortTermWindowMinutes` | `number` | ✅ | 短期レートリミットの時間枠（分）。デフォルトは `5`。 |
| `shortTermMaxReports` | `number` | ✅ | 短期レートリミットの上限回数。指定した分数のスライディングウィンドウ内での最大リクエスト数。デフォルトは `5`。 |
| `midTermWindowHours` | `number` | ✅ | 中期レートリミットの時間枠（時間）。通常は過去24時間を表す `24` を設定。 |
| `midTermMaxReports` | `number` | ✅ | 中期レートリミットの上限回数。指定した時間のスライディングウィンドウ内での最大リクエスト数。デフォルトは `30`。 |
| `monthlyMaxReports` | `number` | ✅ | 月間レートリミットの上限回数。当月1日〜月末までの合計リクエスト数に対する上限。デフォルトは `100`。 |
| `systemMaxRequestsPerMinute` | `number` | ✅ | システム全体の1分あたりのレポート生成リクエスト上限。例: `32`。 |
| `batchMaxUsersPerMinute` | `number` | - | 月次自動生成batchで1分あたりに処理する最大ユーザー数。未設定時は Functions 側で `10` にフォールバックする。 |
| `batchWaitSecondsPerChunk` | `number` | - | 月次自動生成batchで1チャンク処理後に待機する秒数。未設定時は Functions 側で `60` にフォールバックする。 |
| `updatedAt` | `Timestamp` | ✅ | 設定が最後に更新された日時。運用時の変更履歴確認に使用。 |

月次自動生成batchは `app_configs/ai_report` を参照して処理ペースを決定します。`batchMaxUsersPerMinute` 件を1チャンクとして処理し、チャンク完了後に `batchWaitSecondsPerChunk` 秒待機します。各ユーザーの生成処理ではシステム全体レートリミットも通し、手動生成や一時的な処理時間の揺れに余白を残します。batch 用フィールドは既存環境互換のため任意ですが、未設定時は Functions 側の fallback 値（`10` / `60`）を使用します。

### SystemUsages コレクション

**パス**: `system_usages/ai_report`

**役割**: AIレポート機能に対する**システム全体**のレートリミット用の使用状況を管理します。直近1分間のリクエスト回数を元に上限チェックを行います。

#### 型定義

```typescript
interface AiReportSystemUsage {
  requestTimestamps: Timestamp[]; // 直近のAIレポート生成リクエストのタイムスタンプ一覧
  updatedAt: Timestamp;           // 最終更新日時
}
```

#### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `requestTimestamps` | `Timestamp[]` | ✅ | システム全体でのAIレポート生成リクエストの履歴。Functions 側では過去1分間の要素数を数えて上限チェックを行う。 |
| `updatedAt` | `Timestamp` | ✅ | このドキュメントが最後に更新された日時。 |

### アクセス制御

- **読み取り**: サーバーサイド（Admin SDK）からのみ参照。
- **書き込み**: 運用管理用ツールまたは手動オペレーション（Admin SDK / Firebase Console）からのみ。クライアントからの直接書き込みは不可。

---

## 23. Location コレクション

**パス**: `locations/{locationId}`

**役割**: 地理的位置のマスタデータを管理するコレクションです。天気情報の取得に必要な座標データを、国・地方・都道府県などの階層構造で保存します。GPSを使用しないユーザー向けの手動地域選択機能で使用されます。

### 型定義

```typescript
interface Location {
  id: string;
  type: LocationType;
  countryCode: string;
  parentId: string | null;
  code?: string;
  name: string;
  nameEn?: string;
  latitude: number;
  longitude: number;
  sortOrder?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

type LocationType =
  | "country"     // 国
  | "region"      // 地方（関東、東北など）
  | "prefecture"  // 都道府県（日本）
  | "state"       // 州（アメリカなど）
  | "province"    // 省（中国など）
  | "city";       // 市区町村
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `id` | `string` | ✅ | ユニークID。ISO準拠を推奨。例: `"jp"`, `"jp-kanto"`, `"jp-13"`, `"us-ca"` |
| `type` | `LocationType` | ✅ | 地域の種類。`country`（国）、`region`（地方）、`prefecture`（都道府県）、`state`（州）、`province`（省）、`city`（市区町村）。 |
| `countryCode` | `string` | ✅ | ISO 3166-1 alpha-2 国コード。例: `"JP"`（日本）、`"US"`（アメリカ）。 |
| `parentId` | `string \| null` | ✅ | 親の `locationId`。階層構造を表現。ルート（国）の場合は `null`。例: 東京都の `parentId` は `"jp-kanto"`。 |
| `code` | `string?` | - | 地域固有コード。日本の都道府県の場合は JIS X 0401 準拠（01〜47）。例: `"13"`（東京都）。 |
| `name` | `string` | ✅ | ローカル言語での表示名。例: `"東京都"`, `"関東地方"`, `"日本"` |
| `nameEn` | `string?` | - | 英語名。国際化対応用。例: `"Tokyo"`, `"Kanto Region"`, `"Japan"` |
| `latitude` | `number` | ✅ | 代表座標の緯度。天気API呼び出しに使用。例: `35.6895`（東京） |
| `longitude` | `number` | ✅ | 代表座標の経度。天気API呼び出しに使用。例: `139.6917`（東京） |
| `sortOrder` | `number?` | - | 同一親内での表示順。UIでのソートに使用。例: 北海道=1, 青森県=2, ... |
| `createdAt` | `Timestamp` | ✅ | ドキュメント作成日時。 |
| `updatedAt` | `Timestamp` | ✅ | ドキュメント更新日時。 |

### ID設計例

| ID | type | name | parentId | 説明 |
|----|------|------|----------|------|
| `jp` | country | 日本 | `null` | 国（ルート） |
| `jp-hokkaido` | region | 北海道地方 | `jp` | 地方 |
| `jp-tohoku` | region | 東北地方 | `jp` | 地方 |
| `jp-kanto` | region | 関東地方 | `jp` | 地方 |
| `jp-01` | prefecture | 北海道 | `jp-hokkaido` | 都道府県 |
| `jp-13` | prefecture | 東京都 | `jp-kanto` | 都道府県 |
| `jp-14` | prefecture | 神奈川県 | `jp-kanto` | 都道府県 |
| `us` | country | アメリカ | `null` | 国（ルート） |
| `us-ca` | state | カリフォルニア州 | `us` | 州 |

### データフロー

```
1. 管理者がマスタデータを初期投入
   ↓
2. ユーザーが設定画面で地域を選択
   ↓
3. locations/{locationId} から座標を取得
   ↓
4. 天気APIに座標を渡して天気情報を取得
```

### 使用例

```typescript
import { LocationRepository } from "@/lib/firestore";

// 日本の全都道府県を取得（UI表示用）
const prefectures = await LocationRepository.getPrefectures("JP");
// → [{ id: "jp-01", name: "北海道", ... }, { id: "jp-02", name: "青森県", ... }, ...]

// 関東地方の都道府県のみ取得
const kantoPrefectures = await LocationRepository.getByParentId("jp-kanto");
// → [{ id: "jp-08", name: "茨城県", ... }, { id: "jp-13", name: "東京都", ... }, ...]

// 全ての地方を取得
const regions = await LocationRepository.getRegions("JP");
// → [{ id: "jp-hokkaido", name: "北海道地方", ... }, { id: "jp-tohoku", name: "東北地方", ... }, ...]

// ユーザーが東京都を選択した場合の座標取得
const tokyo = await LocationRepository.getById("jp-13");
const { latitude, longitude } = tokyo;
// → latitude: 35.6895, longitude: 139.6917

// 天気APIを呼び出し
const weather = await WeatherService.getWeather(latitude, longitude);
```

### クエリパターン

```typescript
// 特定の国の全都道府県を取得
const prefectures = await db.collection('locations')
  .where('countryCode', '==', 'JP')
  .where('type', '==', 'prefecture')
  .orderBy('sortOrder')
  .get();

// 特定の親の子要素を取得（例: 関東地方の都道府県）
const children = await db.collection('locations')
  .where('parentId', '==', 'jp-kanto')
  .orderBy('sortOrder')
  .get();

// 全ての地方を取得
const regions = await db.collection('locations')
  .where('countryCode', '==', 'JP')
  .where('type', '==', 'region')
  .orderBy('sortOrder')
  .get();
```

### アクセス制御

- **読み取り**: 認証済みユーザーのみ可能（マスタデータの参照）
- **書き込み**: 不可（管理者のみ Admin SDK / Firebase Console 経由）

---

## 24. UsageTracking サブコレクション

**パス**: `users/{uid}/usage_tracking/{document}`

**役割**: ユーザーの画面操作を計測するためのトラッキングデータを保存します。ファネル分析（画面表示→決定ボタン押下のコンバージョン）、入力時間計測、サジェスト利用率、遷移元分析に使用されます。

### 累計カウンター

**パス**: `users/{uid}/usage_tracking/headacheLogUsage`

```typescript
interface HeadacheLogUsage {
  create: HeadacheLogUsageCounters;    // 新規入力の累計
  update: HeadacheLogUsageCounters;    // 更新の累計
  delete: {                            // 削除の累計
    confirmed: number;                 // 削除確定回数
  };
  openedFromCalendar: number;          // カレンダーから開いた回数
  openedFromHeadacheLogs: number;      // 一覧画面から開いた回数
  openedFromFloatingActionButton: number; // FABから開いた回数
  inputSetUsed: number;              // 入力セット適用の累計回数
  lastEventAt: Timestamp;             // 最終イベント日時（サーバー時刻）
}

interface HeadacheLogUsageCounters {
  opened: number;              // 画面を開いた回数
  confirmed: number;           // 決定ボタン押下回数
  validationErrors: number;    // バリデーションエラー回数
  suggestionUsed: number;      // サジェスト使用回数
}
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `create.opened` | `number` | - | 新規入力で画面を開いた累計回数。 |
| `create.confirmed` | `number` | - | 新規入力で決定ボタンを押した累計回数。 |
| `create.validationErrors` | `number` | - | 新規入力でバリデーションエラーが発生した累計回数。 |
| `create.suggestionUsed` | `number` | - | 新規入力でサジェストを使用した累計回数。 |
| `update.opened` | `number` | - | 更新で画面を開いた累計回数。 |
| `update.confirmed` | `number` | - | 更新で決定ボタンを押した累計回数。 |
| `update.validationErrors` | `number` | - | 更新でバリデーションエラーが発生した累計回数。 |
| `update.suggestionUsed` | `number` | - | 更新でサジェストを使用した累計回数。 |
| `delete.confirmed` | `number` | - | 削除を確定した累計回数。 |
| `openedFromCalendar` | `number` | - | カレンダーからの遷移回数。 |
| `openedFromHeadacheLogs` | `number` | - | 一覧画面からの遷移回数。 |
| `openedFromFloatingActionButton` | `number` | - | FAB（新規作成ボタン）からの遷移回数。 |
| `inputSetUsed` | `number` | - | 入力セット適用の累計回数。 |
| `lastEventAt` | `Timestamp` | - | 最終イベント日時（サーバー時刻）。 |

### セッションログ サブコレクション

**パス**: `users/{uid}/usage_tracking/headacheLogUsage/sessions/{sessionId}`

画面を開くたびに1ドキュメント作成されます。入力時間計測やセッション単位の行動分析に使用されます。

```typescript
interface HeadacheLogSession {
  mode: 'create' | 'update';          // 新規 or 更新
  source: 'calendar' | 'headacheLogs' | 'floatingActionButton'; // 遷移元
  openedAt: Timestamp;                // 画面を開いた日時（クライアント時刻）
  confirmedAt?: Timestamp;            // 決定ボタン押下日時（クライアント時刻）
  validationErrorCount?: number;      // バリデーションエラー回数
  suggestionUsedCount?: number;       // サジェスト使用回数
  inputSetId?: string;               // 適用した入力セットID（マイセットのみ）
  inputSetType?: 'my' | 'frequent' | 'recent'; // 入力セット種別
  action?: 'update' | 'delete';      // 実行されたアクション（mode が 'update' の時のみ）
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `mode` | `string` | ✅ | `'create'`（新規入力）または `'update'`（更新）。 |
| `source` | `string` | ✅ | `'calendar'`（カレンダーから）、`'headacheLogs'`（一覧画面から）、または `'floatingActionButton'`（FABから）。 |
| `openedAt` | `Timestamp` | ✅ | 画面を開いた日時。クライアント時刻。 |
| `confirmedAt` | `Timestamp?` | - | 決定ボタン押下日時。クライアント時刻。離脱時はフィールド未作成。 |
| `validationErrorCount` | `number?` | - | バリデーションエラー回数。未発生時はフィールド未作成。読み取り時 `?? 0`。 |
| `suggestionUsedCount` | `number?` | - | サジェスト使用回数。未使用時はフィールド未作成。読み取り時 `?? 0`。 |
| `inputSetId` | `string?` | - | 適用した入力セットID。マイセットの場合はドキュメントID、おすすめセットの場合はフィールド未作成。 |
| `inputSetType` | `string?` | - | 入力セット種別。`'my'`（マイセット）、`'frequent'`（よく使う入力）、`'recent'`（前回の入力）。未使用時はフィールド未作成。 |
| `action` | `string?` | - | 実行されたアクション。`'update'`（更新確定）または `'delete'`（削除確定）。mode が `'update'` の時のみ作成。 |

### アクセス制御

- **読み取り**: データオーナーのみ可能
- **書き込み**: データオーナーのみ可能（クライアント書き込み）

---

## 25. SubscriptionPlan コレクション

**パス**: `subscription_plans/{planId}`

**役割**: サブスクリプションプランの特典情報を管理するコレクションです。プランごとの特典一覧をサブコレクションとして保持し、サブスクリプション画面での特典表示に使用されます。

### ドキュメントID

プランの商品ID（`productId`）がドキュメントIDとして使用されます。

| ドキュメントID | 説明 |
|---------------|------|
| `sub_premium_monthly_v1` | デフォルトの月額プレミアムプラン（Remote Config で変更可能） |

### 型定義

```typescript
interface SubscriptionPlan {
  name: string;
  description: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### フィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `name` | `string` | ✅ | プランの表示名。 |
| `description` | `string` | ❌ | プランの説明文。 |
| `createdAt` | `Timestamp` | ✅ | 作成日時。 |
| `updatedAt` | `Timestamp` | ✅ | 更新日時。 |

### benefits サブコレクション

**パス**: `subscription_plans/{planId}/benefits/{benefitId}`

**役割**: 各プランに紐づく特典の一覧です。サブスクリプション画面でプラン選択時に表示されます。

#### 型定義

```typescript
interface SubscriptionBenefit {
  title: string;
  description: string;
  order: number;
  isActive: boolean;
}
```

#### フィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `title` | `string` | ✅ | 特典のタイトル。 |
| `description` | `string` | ✅ | 特典の説明文。 |
| `order` | `number` | ✅ | 表示順（昇順ソート）。 |
| `isActive` | `boolean` | ✅ | 表示対象かどうか。`false` の場合、アプリ側でフィルタされ表示されない。 |

### クエリパターン

```dart
// アクティブな特典を表示順に取得
firestore
  .collection('subscription_plans')
  .doc(planId)
  .collection('benefits')
  .where('isActive', isEqualTo: true)
  .orderBy('order')
  .get();
```

### アクセス制御

- **読み取り**: 全ユーザーが可能（プラン特典は公開情報）
- **書き込み**: 管理者のみ（Firebase Console または管理ツール経由）

---

## 26. WeatherCache コレクション

**パス**: `weather_cache/{cacheKey}`

**役割**: OpenWeatherMap APIから取得した天気データをキャッシュするコレクションです。座標ベースでキャッシュし、API呼び出しを削減します。キャッシュが有効期限内ならキャッシュデータを返却し、期限切れならAPIを呼んで最新データを返却します。

### ドキュメントID

座標を小数点第4位に丸めた `{latitude}_{longitude}` 形式。

| ドキュメントID例 | 説明 |
|-----------------|------|
| `35.6895_139.6917` | 東京付近の座標 |

**座標丸めロジック**: `Math.round(value * 10000) / 10000`

### 型定義

```typescript
interface WeatherCacheDocument {
  data: WeatherData;
  fetchedAt: Timestamp;
  expiresAt: Timestamp;
  location?: {
    latitude: number;
    longitude: number;
    name: string;
  };
  updatedAt?: Timestamp;
}

interface WeatherData {
  weather: {
    main: string;
    description: string;
    icon: string;
  };
  temperature: number;
  humidity: number;
  pressure: number;
  locationName: string;
  timestamp: string;
  pressureForecast: PressureForecast[];
  hourlyForecast: HourlyForecast[];
  dailyForecast: DailyForecast[];
}

interface PressureForecast {
  hoursFromNow: number;
  pressure: number;
}

interface HourlyForecast {
  dateTime: string;
  temperature: number;
  pressure: number;
  humidity: number;
  weatherMain: string;
  weatherDescription: string;
  weatherIcon: string;
}

interface DailyForecast {
  date: string;
  tempMin: number;
  tempMax: number;
  pressure: number;
  humidity: number;
  weatherMain: string;
  weatherDescription: string;
  weatherIcon: string;
}
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `data` | `WeatherData` | ✅ | 天気データ本体。下記のネスト構造を参照。 |
| `fetchedAt` | `Timestamp` | ✅ | APIからデータを取得した日時。 |
| `expiresAt` | `Timestamp` | ✅ | キャッシュの有効期限。`fetchedAt` + 10分。 |
| `location` | `object?` | - | 位置情報。スケジュール実行関数（天気警戒通知・気圧変動通知）が `merge: true` で追加。 |
| `location.latitude` | `number` | - | 緯度。 |
| `location.longitude` | `number` | - | 経度。 |
| `location.name` | `string` | - | 地名（OpenWeatherMap Geocoding APIから取得）。 |
| `updatedAt` | `Timestamp?` | - | スケジュール実行関数による更新日時。サーバータイムスタンプ。 |

### data フィールドの構造

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `data.weather.main` | `string` | 天気カテゴリ（`"Clouds"`, `"Rain"` など） |
| `data.weather.description` | `string` | 天気説明（日本語） |
| `data.weather.icon` | `string` | 天気アイコンコード |
| `data.temperature` | `number` | 気温（摂氏、小数第1位） |
| `data.humidity` | `number` | 湿度（%） |
| `data.pressure` | `number` | 現在の気圧（hPa） |
| `data.locationName` | `string` | 地名 |
| `data.timestamp` | `string` | 取得日時（ISO8601） |
| `data.pressureForecast` | `PressureForecast[]` | 気圧予報データ。`hoursFromNow`（0, 6, 24）と `pressure`（hPa）。 |
| `data.hourlyForecast` | `HourlyForecast[]` | 時間ごと予報。日時・気温・気圧・湿度・天気情報を含む。 |
| `data.dailyForecast` | `DailyForecast[]` | 日ごと予報。日付・最低/最高気温・気圧・湿度・天気情報を含む。 |

### データフロー

```
1. Flutter アプリが getWeatherData Callable Function を呼び出し
   ↓
2. WeatherCacheService がキャッシュキー（座標）で weather_cache を検索
   ↓
3a. キャッシュヒット（expiresAt > now）: キャッシュデータを即座に返却
3b. 期限切れ/キャッシュミス: OpenWeatherMap APIを呼び出し、結果をキャッシュに保存して返却
   ↓
4. スケジュール実行関数（天気警戒通知・気圧変動通知）も
   weather_cache に fetchedAt / expiresAt / location 情報付きで書き込み（merge: true）
```

### キャッシュ戦略

- **キャッシュTTL**: 10分（`CACHE_TTL_MS = 10 * 60 * 1000`）
- **方式**: シンプルキャッシュ — 有効期限内ならキャッシュ返却、期限切れならAPIを呼んで最新データを返却

### 書き込み元

| 書き込み元 | 説明 |
|-----------|------|
| `WeatherCacheService.fetchAndCacheWeather()` | Callable Function 経由。`data`, `fetchedAt`, `expiresAt` を `set` で書き込み。 |
| `sendWeatherHeadacheAlertNotification` | スケジュール実行（5分ごと）。`data`, `fetchedAt`, `expiresAt`, `location`, `updatedAt` を `merge: true` で書き込み。 |
| `sendPressureChangeNotification` | スケジュール実行（1時間ごと）。`data`, `fetchedAt`, `expiresAt`, `location`, `updatedAt` を `merge: true` で書き込み。 |

### アクセス制御

- **読み取り**: クライアントからの直接アクセスは不可（`allow read, write: if false`）
- **書き込み**: Cloud Functions（Admin SDK）のみ
- Flutter アプリは `getWeatherData` Callable Function 経由でデータを取得

---

## コレクション間の関係

```
users/{uid} ─────────────────────┐
  ├─ (1:1) subscriptions/{uid}   │
  ├─ (1:N) devices/{deviceId}    │
  ├─ (1:1) userSettings/location │
  ├─ (1:1) userSettings/headacheAlertLocation
  ├─ (1:1) userSettings/lastAlertLevel
  ├─ (1:N) ai_reports/{reportId} │
  ├─ (1:N) ai_report_requests/{requestId}
  ├─ (1:1) ai_report_preferences/auto_generation
  └─ (1:1) usage_tracking/headacheLogUsage
       └─ (1:N) sessions/{sessionId}
                                  │
subscriptions/{uid}               │
  ↓ (1:N)                         │
invoices/{uid}/user_invoices/{id} │
                                  │
headache_logs/{logId} ────────────┤
  ↓ (userId参照)                  │
users/{uid}                       │
                                  │
headache_log_preferences/{userId} │
  ↓ (userId参照)                  │
users/{uid}                       │
                                  │
privacy_consents/{consentId}      │
  ↓ (userId参照)                  │
users/{uid}                       │
                                  │
user_app_versions/{versionId}     │
  ↓ (userId参照)                  │
users/{uid}                       │
                                  │
deleted_user_snapshots/{uid}      │
  ↓ (uid参照、削除後の記録)       │
元users/{uid}                     │
                                  │
banners/{bannerId}                │
  └─ (1:N) stats_daily/{dateId}   │
                                  │
checkout_sessions/{id} ───────────┤ Webhook経由で連携
  ↓ (Webhook)                     │
subscriptions/{uid}               │
                                  │
notifications/{id} ───────────────┤ 独立（全ユーザー向け）
audit_logs/{id} ──────────────────┤ 独立（分析用）
summary_report_counts/{scope} ────┤ 独立（統計用）
terms/{termId} ───────────────────┤ 独立（法的文書）
privacy_policies/{policyId} ──────┤ 独立（法的文書）
privacy_notices/{noticeId} ───────┤ 独立（法的文書）
debug/{docId} ────────────────────┤ 独立（デバッグ用）
subscription_plans/{planId} ──────┘ 独立（マスタデータ）
  └─ (1:N) benefits/{benefitId}
```

### 連携フロー

1. **ユーザー登録時**
   ```
   Firebase Auth → users/{uid} 作成
                → devices/{deviceId} 作成（デバイス登録時）
                → headache_log_preferences/{userId} 作成（初回記録時）
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

5. **頭痛記録時**
   ```
   ユーザー → headache_logs/{logId} 作成
              ↓
              summary_report_counts 更新（統計カウント）
   ```

6. **AIレポート生成時**
   ```
   ユーザー → ai_report_requests/{requestId} 作成 (status: "pending")
              ↓ Cloud Functions
              headache_logs クエリ（期間内のログ取得）
              ↓ AI API呼び出し
              ai_reports/{reportId} 作成
              ↓
              ai_report_requests/{requestId} 更新 (status: "success")
   ```

7. **お知らせ投稿時**
   ```
   管理者 → notifications/{notificationId} 作成
            ↓ Cloud Functions (onNotificationCreated)
            devices コレクショングループクエリ
            ↓
            プッシュ通知送信（FCM）
   ```

8. **ユーザー削除時**
   ```
   ユーザー → アカウント削除リクエスト
              ↓ Cloud Functions
              統計データ集計
              ↓
              deleted_user_snapshots/{uid} 作成
              ↓
              users/{uid} & 関連データ削除
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

### パターン8: 頭痛記録の作成と取得

```typescript
import { HeadacheLogRepository } from "@/lib/firestore";

// 頭痛記録の作成
const newLog = {
  userId: uid,
  timing: Timestamp.now(),
  intensity: 7,
  duration: 120, // 分
  locations: ["こめかみ", "後頭部"],
  types: ["ズキズキ"],
  triggers: ["ストレス", "睡眠不足"],
  medications: [
    {
      name: "ロキソニン",
      dosage: 1,
      unit: "錠",
      takenAt: Timestamp.now(),
      effectiveness: 7,
    }
  ],
  note: "仕事のストレスで頭痛が発生",
};

await HeadacheLogRepository.createHeadacheLog(newLog);

// 期間指定でログ取得
const logs = await HeadacheLogRepository.getHeadacheLogsByDateRange({
  userId: uid,
  fromDate: new Date('2025-01-01'),
  toDate: new Date('2025-01-31'),
});

console.log(`1月の頭痛記録: ${logs.length}件`);
```

### パターン9: AIレポートの生成とリクエスト管理

```typescript
import { AiReportRequestRepository } from "@/lib/firestore";

// AIレポートリクエスト作成
const request = {
  periodType: 'weekly',
  requestedAt: Timestamp.now(),
  status: 'pending',
  source: 'on_demand',
  createdAt: Timestamp.now(),
};

const requestId = await AiReportRequestRepository.createRequest(uid, request);

// Cloud Functionsでレポート生成
// → headache_logsから期間内のデータを取得
// → AI APIで分析
// → ai_reportsに保存
// → ai_report_requestsのstatusを'success'に更新

// レポート取得
const reports = await AiReportRepository.getReports(uid);
const latestReport = reports[0];

if (latestReport && !latestReport.readAt) {
  // 未読レポートとして表示
  console.log(`新しいレポート: ${latestReport.summary.substring(0, 50)}...`);
}
```

### パターン10: プッシュ通知の送信

```typescript
import { UserDeviceRepository } from "@/lib/firestore";

// デバイス登録
const device = {
  userId: uid,
  token: fcmToken,
  platform: 'ios',
  appVersion: '1.0.0',
  osVersion: '17.0',
  deviceModel: 'iPhone 15 Pro',
  tokenValid: true,
  lastRefreshedAt: Timestamp.now(),
  lastSeenAt: Timestamp.now(),
  push: {
    pushEnabled: true,
    channels: {
      notification: true,
      ai_report_generated: true,
    },
  },
};

await UserDeviceRepository.registerDevice(uid, deviceId, device);

// お知らせ投稿 → 自動でプッシュ通知送信
const notification = {
  title: '新しい頭痛記事が公開されました',
  content: '頭痛の予防法について詳しく解説しています。',
  postedAt: Timestamp.now(),
};

await NotificationRepository.createNotification(notification);
// → Cloud Functions (onNotificationCreated) がトリガー
// → push.pushEnabled === true かつ push.channels.notification === true のデバイスに送信
```

### パターン11: バナー表示と効果測定

```typescript
import { BannerItemRepository, BannerMetricsService } from "@/lib/firestore";

// アクティブなバナーを取得
const banners = await BannerItemRepository.watchActiveBanners({ limit: 5 });

// バナー表示時
await BannerMetricsService.recordImpression(bannerId);
// → banners/{bannerId}.metrics.impressionsTotal をインクリメント
// → banners/{bannerId}/stats_daily/{today}.impressions をインクリメント

// バナータップ時
await BannerMetricsService.recordInteraction(bannerId);
// → banners/{bannerId}.metrics.interactionsTotal をインクリメント
// → banners/{bannerId}/stats_daily/{today}.interactions をインクリメント

// CTR計算
const banner = await BannerItemRepository.getById(bannerId);
const ctr = (banner.metrics.interactionsTotal / banner.metrics.impressionsTotal) * 100;
console.log(`バナーCTR: ${ctr.toFixed(2)}%`);
```

### パターン12: ユーザー削除時のスナップショット保存

```typescript
import { DeletedUserSnapshotRepository } from "@/lib/firestore";

// アカウント削除時にスナップショットを作成
const snapshot = {
  uid: uid,
  registeredAt: user.createdAt,
  deletedAt: Timestamp.now(),
  totalActiveSessionCount: 245,
  totalActiveDaysCount: 87,
  lastUsedAt: user.lastLoginAt,
  averageWeeklyActiveDays: 4.2,
  headacheLogTotalCount: 152,
  headacheLogActiveDays: 78,
  subscriptionPlan: subscription?.plan,
  subscriptionStartedAt: subscription?.currentPeriodStart,
  subscriptionEndedAt: subscription?.currentPeriodEnd,
  trialStartedAt: subscription?.trialEnd ? subscription.currentPeriodStart : undefined,
  trialEndedAt: subscription?.trialEnd,
};

await DeletedUserSnapshotRepository.createSnapshot(snapshot);

// 離脱分析
const deletedUsers = await DeletedUserSnapshotRepository.getSnapshotsByDateRange(
  startDate,
  endDate
);

const avgActiveDays = deletedUsers.reduce((sum, u) => sum + u.totalActiveDaysCount, 0) / deletedUsers.length;
const withSubscription = deletedUsers.filter(u => u.subscriptionPlan).length;

console.log(`削除ユーザー: ${deletedUsers.length}人`);
console.log(`平均アクティブ日数: ${avgActiveDays.toFixed(1)}日`);
console.log(`有料ユーザー: ${withSubscription}人 (${(withSubscription/deletedUsers.length*100).toFixed(1)}%)`);
```

---

## 27. ApiUsage コレクション

**パス**: `api_usage/{serviceId}`

**役割**: 外部APIの使用量を管理するコレクションです。現在は OpenWeatherMap One Call API 3.0 のレートリミット管理に使用しています。

### 型定義

```typescript
interface ApiUsage {
  /** 1日あたりのリクエスト上限数 */
  dailyLimit: number;
  /** 作成日時 */
  createdAt: Timestamp;
  /** 更新日時 */
  updatedAt: Timestamp;
}
```

### ドキュメント

| ドキュメントID | 説明 |
|---------------|------|
| `openweathermap_onecall` | OpenWeatherMap One Call API 3.0 の設定 |

### 28.1 ApiUsageDaily サブコレクション

**パス**: `api_usage/{serviceId}/api_usage_daily/{YYYY-MM-DD}`

**役割**: 日次のAPIリクエスト回数を記録するサブコレクションです。ドキュメントIDはJST基準の日付（`YYYY-MM-DD`）です。

```typescript
interface ApiUsageDaily {
  /** 当日のリクエスト回数（FieldValue.increment() でアトミックにカウント） */
  count: number;
  /** 最終更新日時 */
  lastUpdated: Timestamp;
}
```

### データフロー

```
WeatherService.fetchWeatherData()
  → ApiUsageService.incrementAndCheck()
    → api_usage/openweathermap_onecall/api_usage_daily/{YYYY-MM-DD}.count を +1
    → count >= dailyLimit なら警告ログ出力（リクエストはブロックしない）
  → OpenWeatherMap One Call API 3.0 呼び出し
```

---

## 28. SubscriptionTrial コレクション

**パス**: `subscription_trial/{docId}`

**役割**: サブスクリプションのトライアル（無料体験）設定とプランを管理するコレクションです。

### 特殊ドキュメント

- `subscription_trial/_config`: トライアル機能の全体設定を保持する設定ドキュメント
- **予約ID**: `_config`, `config` はシステム予約IDとして、トライアルプランのIDには使用できない

### 型定義

#### _config ドキュメント

```typescript
// パス: subscription_trial/_config
interface SubscriptionTrialConfig {
  /** トライアル機能の有効/無効 */
  enabled: boolean;
  /** 現在適用中のトライアルプランID（空文字 = 未設定） */
  currentPlanId: string;
}
```

**初期値戦略**: `_config` ドキュメントが存在しない場合、APIはデフォルト値（`enabled: false`, `currentPlanId: ''`）を返却する（404ではなく200）。初回PUT時にドキュメントが自動作成される（`set`でupsert）。

#### トライアルプラン ドキュメント

```typescript
// パス: subscription_trial/{planId}（planId !== '_config' && planId !== 'config'）
interface SubscriptionTrialPlan {
  /** トライアル期間（日数）: 1〜365の整数 */
  durationDays: number;
  /** このプランの有効/無効 */
  enabled: boolean;
  /** 作成日時 */
  createdAt: Timestamp;
  /** 更新日時 */
  updatedAt: Timestamp;
}
```

### バリデーション仕様

| フィールド | ルール |
|-----------|--------|
| `durationDays` | 1以上365以下の整数。0・負数・小数・非数値は400エラー |
| `enabled` | boolean型のみ許可。型不正は400エラー |
| `planId`（新規作成時） | 必須、空文字不可、予約ID（`_config`, `config`）不可 |
| `currentPlanId`（_config更新時） | 空文字または実在するトライアルプランID（予約ID除外）のみ許可 |

### 参照整合性

- `_config.currentPlanId` で参照中のプランを削除しようとした場合、409エラーで拒否する
- エラーメッセージ: 「このプランは現在のトライアル設定で使用中のため削除できません」

### データフロー

```
管理画面
  → GET /api/subscription-trial          → プラン一覧取得（_config除外）
  → POST /api/subscription-trial         → プラン新規作成（ユーザー指定ID）
  → GET /api/subscription-trial/{id}     → プラン単体取得（予約ID拒否）
  → PUT /api/subscription-trial/{id}     → プラン更新（予約ID拒否）
  → DELETE /api/subscription-trial/{id}  → プラン削除（予約ID拒否、参照整合性チェック）
  → GET /api/subscription-trial/config   → _config取得（未作成時デフォルト値）
  → PUT /api/subscription-trial/config   → _config更新（upsert、currentPlanId存在検証）
```

---

## まとめ

### 各コレクションの重要度

| コレクション | 重要度 | 主な用途 |
|-------------|--------|---------|
| **subscriptions** | ⭐⭐⭐⭐⭐ | 有料機能のアクセス制御（最重要） |
| **headache_logs** | ⭐⭐⭐⭐⭐ | 頭痛記録管理（アプリのコア機能） |
| **users** | ⭐⭐⭐⭐ | ユーザー基本情報とStripe連携 |
| **devices** | ⭐⭐⭐⭐ | プッシュ通知配信 |
| **ai_reports** | ⭐⭐⭐⭐ | AI分析レポート（有料機能） |
| **checkout_sessions** | ⭐⭐⭐⭐ | CVR計測と流入分析 |
| **invoices** | ⭐⭐⭐ | 請求履歴の表示 |
| **audit_logs** | ⭐⭐⭐ | 行動分析とファネル最適化 |
| **notifications** | ⭐⭐⭐ | お知らせ配信 |
| **banners** | ⭐⭐⭐ | キャンペーン告知とCTR測定 |
| **deleted_user_snapshots** | ⭐⭐⭐ | 離脱分析 |
| **summary_report_counts** | ⭐⭐ | 統計カウント |
| **headache_log_preferences** | ⭐⭐ | フォームカスタマイズ |
| **privacy_consents** | ⭐⭐ | 法的コンプライアンス |
| **terms / privacy_policies** | ⭐⭐ | 法的文書管理 |
| **userSettings** | ⭐⭐⭐ | ユーザー位置情報・警戒度設定（通知機能の基盤） |
| **locations** | ⭐⭐ | 天気取得用の地理座標マスタデータ |
| **subscription_plans** | ⭐⭐ | プラン特典の表示（マスタデータ） |
| **api_usage** | ⭐⭐ | 外部APIレートリミット管理 |
| **subscription_trial** | ⭐⭐ | トライアル（無料体験）設定・プラン管理 |
