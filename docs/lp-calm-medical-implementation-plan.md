# LP Calm Medical Implementation Plan

## 目的

生成済みモック画像を基準に、ログイン前トップページを Calm Medical トンマナで実装する。  
現在の `src/app/page.tsx` を流用して変更し、React + Tailwind CSS で PC / スマホ両対応の LP を作る。

## 参照画像

- PC: `public/design-concepts/prelogin-header-footer-desktop.png`
- Mobile: `public/design-concepts/prelogin-header-footer-mobile.png`

## 実装方針

- 既存トップページ `src/app/page.tsx` を拡張する。
- 全体色は `docs/calm-medical-design-guideline.md` のトークンを `src/app/globals.css` に反映する。
- ヘッダーは未ログイン時に `できること / 料金 / よくある質問 / ログイン / ユーザー登録` を表示する。
- フッターは `プライバシーポリシー / 利用規約 / お問い合わせ` を表示する。
- PC は生成画像のように、左にヒーロー文言、右に実UI風プレビューを配置する。
- スマホはヘッダーに `ログイン`、短い `登録`、メニューアイコンを表示し、本文は縦積みにする。
- LP 内の図像は inline SVG と CSS で構成し、透過画像が必要な装飾のみ imagegen で生成する。
- アニメーションは控えめに、ロード時のフェード/スライド、カードの hover、CTA の軽い浮き上がりを入れる。

## ピクセル再現の基準

- 完全な画像貼り付けではなく、実装UIとして忠実に再現する。
- PC 幅では以下を重点確認する。
  - ヘッダー高さ、中央ナビ、右CTAの視線バランス
  - ヒーロー見出しの大きさ、行間、左余白
  - 右側プレビューカードの白面、薄い影、記録UI密度
  - 3つの機能カードの横並び
  - フッターリンクの右寄せ感
- Mobile 幅では以下を重点確認する。
  - ヘッダー内でロゴ、ログイン、登録、メニューが自然に収まる
  - CTA が押しやすく、文字がはみ出さない
  - 記録プレビュー、機能カード、フッターリンクが縦に自然に並ぶ

## TODO

1. 素材生成と計画整理
   - imagegen でスマホモックを参照し、ヒーロー補助用の透明イラスト素材を生成する。
   - 必要であれば chroma key で透過処理する。
   - 生成素材を `public/design-concepts/` に保存する。

2. 共通スタイルとヘッダー
   - `src/app/globals.css` に Calm Medical のCSS変数、背景、アニメーションを追加する。
   - `src/components/Button.tsx` をトンマナに合わせる。
   - `src/components/Header.tsx` を未ログイン/ログイン済み両方で破綻しないレスポンシブ構成にする。
   - `src/app/layout.tsx` の `lang` とメタ情報を日本語LP向けに調整する。

3. トップページ本文
   - `src/app/page.tsx` を生成モックに沿って実装する。
   - ヒーロー、UIプレビュー、機能カード、安全性ブロック、フッターを追加する。
   - PC / Mobile の配置差を Tailwind で制御する。

4. 検証と微調整
   - `pnpm lint` を実行する。
   - dev server を起動して Browser Use で PC / Mobile 表示を確認する。
   - 生成モックとの差が大きい箇所を修正する。
   - 必要に応じて TODO や実装計画を更新する。
