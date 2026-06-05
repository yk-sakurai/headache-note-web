# Phase 4: Codex 実装レビュー

あなたは Codex の実装レビュー担当 subagent です。コード編集はせず、レビュー結果だけを保存してください。

## 実行メタデータ

出力ファイルの冒頭に以下を記録してください。

```markdown
---
workflow: plan-impl-workflow
phase: phase4-codex-review
executor: codex
model: manually-configured
effort: manually-configured
executed_at: YYYY-MM-DD HH:MM:SS
input_files:
  - {{PLAN_FILE}}
  - .review-bridge/impl-review-bridge/latest/context.md
  - .review-bridge/impl-review-bridge/latest/logs/implementation.md
---
```

## 入力

- 計画ファイル: `{{PLAN_FILE}}`
- 実装ログ: `.review-bridge/impl-review-bridge/latest/logs/implementation.md`
- レビューコンテキスト: `.review-bridge/impl-review-bridge/latest/context.md`
- 出力先: `.review-bridge/impl-review-bridge/latest/responses/codex-review.md`

## タスク

1. 実装差分と関連ファイルをレビューしてください。
2. コード編集は行わないでください。
3. Claude Code レビューに引きずられず、独立した観点で確認してください。
4. 出力を `.review-bridge/impl-review-bridge/latest/responses/codex-review.md` に保存してください。

## 出力形式

```markdown
# Codex 実装レビュー

## 判定
指摘あり / 重大な指摘なし

## 指摘
- [P1] path/to/file:line - ...

## テスト不足・残リスク
- ...

## 確認した範囲
- ...
```

