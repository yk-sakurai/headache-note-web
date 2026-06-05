# AGENTS.md

このファイルは、このリポジトリで作業する AI エージェント向けの運用メモです。

## コミュニケーション

- すべての応答は日本語（です・ます調）で行う。
- API 名、クラス名、CLI コマンド、エラーメッセージなどの固有名詞は原文のままでよい。
- 英語の出力を引用する場合は、必要に応じて直後に日本語で要点を補足する。
- 手順、注意、補足などは日本語の見出しで整理する。

## プロジェクト概要

- 頭痛記録アプリ「頭痛ノート」の Web アプリケーション。
- Next.js 15 App Router、React 19、TypeScript、Tailwind CSS 4 を使用する。
- Firebase Authentication の SSR セッション、Cloud Firestore、Stripe Checkout/Customer Portal を使う。
- ホスティングとバックエンドは Firebase Hosting / App Hosting と Cloud Functions v2 を前提にする。
- Node.js は 20、パッケージマネージャーは pnpm を使う。

## 主な構成

- `src/app/`: Next.js App Router。ページ、レイアウト、API Route を置く。
- `src/components/`: 再利用可能な UI コンポーネント。
- `src/lib/firebase/`: Firebase クライアント/Admin SDK 初期化。
- `src/lib/firestore/`: Firestore 型、ヘルパー、リポジトリ。
- `src/lib/stripe/`: Stripe サーバー設定。
- `functions/`: Firebase Functions v2。Stripe Webhook などを置く。
- `docs/firestore-schema.md`: Firestore スキーマの詳細。
- `docs/stripe-setup.md`: Stripe 設定手順。
- `docs/calm-medical-design-guideline.md`: UI トンマナとデザイン指針。

## 開発コマンド

ルート:

```bash
pnpm install
pnpm dev
pnpm lint
pnpm build
pnpm start
```

Functions:

```bash
cd functions
pnpm install
pnpm lint
pnpm build
pnpm serve
```

## 検証方針

- TypeScript / React / Next.js の変更後は、可能な範囲で `pnpm lint` と `pnpm build` を実行する。
- `functions/` 配下を変更した場合は、`cd functions && pnpm lint && pnpm build` を実行する。
- UI を変更した場合は、`pnpm dev` で起動し、該当画面をブラウザで確認する。
- 環境変数や外部サービスが必要で検証できない場合は、実行できなかった理由と残るリスクを明記する。

## 実装ルール

- 既存の構成、命名、コンポーネント分割に合わせる。
- App Router の Server Component / Client Component 境界を崩さない。ブラウザ API、Firebase クライアント SDK、状態管理、イベントハンドラを使うコンポーネントには `use client` を付ける。
- 認証が必要な画面や API では、既存の SSR セッション確認と middleware の方針に合わせる。
- Firestore の読み書きは、可能な限り `src/lib/firestore/repositories/` の既存リポジトリを経由する。
- Firestore の型やスキーマを変更する場合は、`src/lib/firestore/types.ts` と `docs/firestore-schema.md` の整合性を保つ。
- Stripe の金額、Price ID、Webhook イベント処理を変更する場合は、Checkout API、Customer Portal、Functions 側 Webhook の影響を確認する。
- 秘密情報はコミットしない。`.env.local` はローカル専用とし、共有が必要なキーは `.env.example` に空値で追加する。

## UI / 文言の方針

- UI は `docs/calm-medical-design-guideline.md` の Calm Medical 方針に従う。
- 基準色は `#00A67E`。白、薄いミント、やわらかいクリームを中心に、落ち着いた医療サービスらしさを保つ。
- 角丸は基本 8px、大きなモーダルやプレビューのみ 12px 程度までにする。
- 強い影、派手なグラデーション、過度に広告的な見せ方は避ける。
- 医療的な断定表現や不安をあおる文言を避ける。
- 文言は短く、やさしく、行動が分かりやすい日本語にする。

## Git / 作業時の注意

- 作業前に `git status --short` で既存の変更を確認する。
- ユーザーや他エージェントの未コミット変更を巻き戻さない。
- 依頼範囲外のリファクタリングや整形だけの変更は避ける。
- 生成物、ログ、ローカル設定、秘密情報を不要に追加しない。
- 変更内容と検証結果は最後に簡潔に報告する。
