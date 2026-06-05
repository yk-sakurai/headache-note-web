# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

頭痛記録アプリ「頭痛ノート」の Web アプリケーション。Next.js 15 (App Router) + React 19 + TypeScript + Firebase + Stripe で構築。

> 注: このリポジトリには `AGENTS.md`（運用ルール・日本語応答方針）と `GEMINI.md` も存在します。応答は日本語（です・ます調）で行うこと。

## コマンド

ルート（pnpm 10、Node 20 固定）:

```bash
pnpm install
pnpm dev      # next dev --turbopack
pnpm lint     # eslint
pnpm build    # next build（型チェックを兼ねる。変更後に必ず実行推奨）
pnpm start    # next start -p 8080（本番起動）
```

Functions（別パッケージ、ESLint 設定も別）:

```bash
cd functions
pnpm lint     # eslint .
pnpm build    # tsc
pnpm serve    # build + firebase emulators:start --only functions
```

エミュレータ一式（auth:9099 / firestore:8080 / functions:5001 / apphosting:5002）:

```bash
firebase emulators:start
```

テストフレームワークは未導入。検証は `pnpm lint` + `pnpm build`、UI は `pnpm dev` で目視確認する。

## アーキテクチャ

### 認証 — SSR セッション Cookie 方式

Firebase Auth の ID トークンを**サーバー側でセッション Cookie に変換**して使うのが要。クライアント SDK のログイン状態には依存しない。

- Cookie 名は `__session`（`src/lib/constants.ts`、Firebase Hosting の制約でこの名前必須）。有効期限 7 日。
- ログイン: クライアントで ID トークン取得 → `POST /api/auth/session-login` が `adminAuth.createSessionCookie` で httpOnly Cookie を発行。
- `middleware.ts`: `/home/:path*` を保護。Cookie の有無を見て、なければ `/login?redirect=...` へ。存在時は `/api/auth/verify-session` を fetch して検証（Edge ランタイムから Admin SDK を直接呼べないため API 経由）。
- ページ/レイアウト側でも**二重に検証**する。`src/app/home/layout.tsx` が `adminAuth.verifySessionCookie` で uid を確定し、未認証なら `redirect("/login")`。

### アクセス制御 — サブスクリプション状態

`/home` 配下は認証だけでなく**有効なサブスクリプション**が必要。`src/app/home/layout.tsx` が `SubscriptionRepository.getSubscription(uid)` を取得し、`hasActiveAccess()`（`src/lib/firestore/helpers.ts`）で判定。アクセス不可なら `RestrictedAccess` を表示。サブスク状態の派生ロジック（trial 残日数、次回請求日、警告文言、`getAccessDeniedReason` など）はすべて `helpers.ts` に集約されているので、状態判定を増やす時はここに足す。

### Firestore — Repository パターン（client / server の二系統）

Firestore への読み書きは**直接呼ばず必ず Repository を経由**する。同じコレクションに対し用途別の 2 実装がある:

- `src/lib/firestore/repositories/server.ts`: Admin SDK 使用（`getAdminDb()`）。Server Component / API Route / middleware 経由で使う。`UserRepository`, `SubscriptionRepository`, `InvoiceRepository`, `CheckoutSessionRepository`, `AuditLogRepository`, `DeviceRepository`, `HeadacheLogRepository` を static メソッドで提供。
- `src/lib/firestore/repositories/client.ts`: クライアント SDK 使用（`"use client"`）。`Client*Repository` 系。ブラウザからの読み書き用で Firestore セキュリティルール（`firestore.rules`）の制約を受ける。
- `src/lib/firestore/repositories/sanitize.ts`: 書き込み前の共通整形。`omitUndefinedDeep`（undefined を再帰除去、Firestore が undefined を拒否するため）と `sanitizeHeadacheLogStrings`。

型は `src/lib/firestore/types.ts` に一元化。`Timestamp`（client）と `AdminTimestamp`（server）の両方を許容する union を多用する点に注意。スキーマを変える時は `types.ts` と `docs/firestore-schema.md` の整合を保つ。

主要コレクション: `users/{uid}`, `subscriptions/{uid}`, `invoices/{uid}/user_invoices/{id}`, `checkout_sessions/{id}`, `audit_logs`, `users/{uid}/devices/{id}`, `headache_logs/{id}`（`userId` フィールドで所有者を表す）。

### Firebase 初期化

- `src/lib/firebase/admin.ts`: Admin SDK。認証情報は ① `FIRESTORE_EMULATOR_HOST` ② `FIREBASE_SERVICE_ACCOUNT_KEY`(JSON) ③ `FIREBASE_ADMIN_*` 三つ組、の優先順で解決。`adminDb`, `adminAuth` を export。
- `src/lib/firebase/app.ts` / `*.client.ts`: ブラウザ用クライアント SDK（auth / firestore / analytics）。

### Stripe — 決済

- 価格・プロモ判定はコード側の定数（`src/lib/constants.ts`: 月額290円 / 年額1980円 / ローンチプロモ年額1480円 / トライアル14日）。Price ID は `NEXT_PUBLIC_STRIPE_*_PRICE_ID` から取得。プロモ適用は `NEXT_PUBLIC_LAUNCH_DATE` + `LAUNCH_PROMO_DAYS` で**サーバー側でも再判定**する（`/api/checkout`）。
- `POST /api/checkout`: Checkout Session 作成。`POST /api/portal`: Customer Portal。両方ともセッション Cookie で認証。
- **Webhook は Next.js ではなく `functions/`（Cloud Functions v2, asia-northeast1）が受ける。** `functions/src/stripe/webhook.ts` → `handlers/{checkout,subscription,invoice,trial}.ts`。Stripe イベントを受けて Firestore の subscription / invoice を更新するのはこちら。金額・Price ID・Webhook イベント処理を変える時は、Next 側（checkout/portal）と Functions 側の両方への影響を確認する。

### ルーティング構成（App Router）

`src/app/` 直下: `home/`（要認証・要課金のメイン画面、頭痛記録 CRUD は `home/log/`）, `account/`, `pricing/`, `login/`, `debug/`, `api/`。`docs/calm-medical-design-guideline.md` の Calm Medical デザイン方針（基準色 `#00A67E`、角丸8px、強い影や煽り文言を避ける）に従う。

## 規約

- Server / Client Component 境界を崩さない。ブラウザ API・クライアント Firebase SDK・状態・イベントハンドラを使うものだけ `"use client"`。
- 認証が必要な画面・API は既存の SSR セッション検証パターン（Cookie → `verifySessionCookie`）に合わせる。
- 秘密情報はコミットしない。`.env.local` はローカル専用、共有が必要なキーは `.env.example` に空値で追加。
