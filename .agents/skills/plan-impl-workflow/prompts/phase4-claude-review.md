# Phase 4: Claude Code 実装レビュー

あなたは Claude Code 手動セッションです。read-only の実装レビューを行い、コード編集はしないでください。

## 実行メタデータ

出力ファイルの冒頭に以下のメタデータを記録してください。

---
workflow: plan-impl-workflow
phase: phase4-claude-review
executor: claude-code
model: manually-configured
effort: manually-configured
executed_at: YYYY-MM-DD HH:MM:SS
input_files:
  - {{PLAN_FILE}}
  - .review-bridge/impl-review-bridge/latest/context.md
  - .review-bridge/impl-review-bridge/latest/logs/implementation.md
---

## 入力

- 計画ファイル: `{{PLAN_FILE}}`
- 実装ログ: `.review-bridge/impl-review-bridge/latest/logs/implementation.md`
- レビューコンテキスト: `.review-bridge/impl-review-bridge/latest/context.md`
- 出力先: `.review-bridge/impl-review-bridge/latest/responses/claude-review.md`

## タスク

1. 実装差分と関連ファイルを read-only でレビューしてください。
2. コード編集は行わないでください。
3. バグ、回帰、仕様漏れ、セキュリティ、テスト不足を優先してください。
4. 出力を `.review-bridge/impl-review-bridge/latest/responses/claude-review.md` に保存してください。

## 出力形式

# Claude Code 実装レビュー

## 判定
指摘あり / 重大な指摘なし

## 指摘
- [P1] path/to/file:line - ...

## テスト不足・残リスク
- ...

## 確認した範囲
- ...
