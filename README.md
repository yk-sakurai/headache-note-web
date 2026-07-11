# 頭痛ノート Web

頭痛の記録・分析アプリ「頭痛ノート」の Web 版です。
モバイル版（Flutter）とデータ基盤（Firebase）を共有し、ブラウザから記録の閲覧・管理ができます。

**開発ステータス**: 現在、最終テスト段階です（未デプロイ）。

**モバイル版**:
[App Store](https://apps.apple.com/jp/app/6742800418)
[Google Play](https://play.google.com/store/apps/details?id=com.ysakuraiappdev.headacheNote)

## 主要機能

- **認証** — Firebase Authentication（メール）。Session Cookie による SSR 認証で、保護ルートはサーバーサイドで検証
- **ホーム（カレンダー）** — 頭痛記録をカレンダー表示。月単位でのブラウズに対応
- **記録一覧** — 頭痛の発生日時・強さ・服薬などの記録を期間指定で閲覧
- **レポート一覧** — 月次 AI レポート（モバイル版と共通の Firestore データ）の閲覧
- **サブスクリプション** — Stripe Checkout による月額プランの契約、Customer Portal での解約・支払い方法の変更、請求履歴の表示
- **アカウント管理** — メールアドレス変更、パスワード変更・リセット、退会処理
- **法務ページ** — 利用規約 / プライバシーポリシー

## 技術スタック

| 領域 | 技術 |
| --- | --- |
| フレームワーク | Next.js 15（App Router / Server Components） |
| 言語 | TypeScript |
| UI | React 19 / Tailwind CSS 4 |
| 認証 | Firebase Authentication（SSR Session Cookie） |
| データベース | Cloud Firestore（モバイル版とスキーマ共有） |
| 決済 | Stripe（Checkout / Customer Portal / Webhook） |
| ホスティング | Firebase App Hosting（Cloud Run） |
| バックエンド | Cloud Functions v2（Stripe Webhook 処理） |
| パッケージ管理 | pnpm |

## アーキテクチャ概要

```
ブラウザ
  │
  ├─ Next.js (Firebase App Hosting / Cloud Run)
  │    ├─ Server Components …… Session Cookie 検証・Firestore 読み取り（Admin SDK）
  │    ├─ API Routes …………… Checkout Session / Customer Portal / 認証系
  │    └─ Client Components … Firebase JS SDK（認証・リアルタイム系）
  │
  ├─ Cloud Firestore ←──── モバイル版（Flutter）と共有
  │    └─ Security Rules による所有者ベースのアクセス制御
  │
  └─ Stripe
       └─ Webhook → Cloud Functions v2 → Firestore（契約状態の同期）
```

設計上のポイント:

- 環境変数・シークレットは Cloud Secret Manager で管理（`apphosting.yaml` は Secret 参照のみ）
- 課金状態の正は Stripe Webhook 経由でサーバー側が更新し、クライアントからは書き換え不可
- Firestore Security Rules で認証・所有者チェックに加えドキュメントのスキーマ検証を実施

## プロジェクト構造

```
src/
├── app/                  # Next.js App Router
│   ├── home/             # ホーム（カレンダー・契約情報）
│   ├── records/          # 記録一覧
│   ├── reports/          # AIレポート一覧
│   ├── account/          # アカウント管理（メール/パスワード/退会）
│   ├── pricing/          # 料金プラン
│   ├── login/ signup/    # 認証
│   └── api/              # API Routes（checkout / portal / auth など）
├── components/           # 共通コンポーネント
└── lib/                  # Firebase / Stripe / Firestore リポジトリ層
functions/                # Cloud Functions v2（Stripe Webhook）
docs/                     # 設計ドキュメント
```

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

[.env.example](.env.example) をコピーして `.env.local` を作成し、自身の Firebase プロジェクトの値を設定してください。

```bash
cp .env.example .env.local
```

Stripe 連携を動かす場合のセットアップ手順は [docs/stripe-setup.md](docs/stripe-setup.md) を参照してください。

### 3. 開発サーバーの起動

```bash
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。Firebase Emulator を使う場合は `.env.local` で `NEXT_PUBLIC_USE_EMULATORS=true` を設定し、`firebase emulators:start` を併用してください。

## テスト（Stripe）

テストモードでは以下のカードで決済フローを確認できます。

- カード番号: `4242 4242 4242 4242` / 有効期限: 未来の任意日付 / CVC: 任意の3桁

1. `/pricing` でプランを選択
2. テストカードで Checkout を完了
3. `/home` で契約状態が反映されることを確認

## ドキュメント

- [Stripe セットアップガイド](docs/stripe-setup.md)
- [Firestore スキーマ](docs/firestore-schema.md)
- [デザインガイドライン](docs/calm-medical-design-guideline.md)

## License

コード・ドキュメントの無断複製、再配布、商用利用はご遠慮ください。
