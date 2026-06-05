# Phase 4: レビュー統合

あなたは Codex のレビュー統合担当 subagent です。Claude Code と Codex のレビュー結果を統合し、修正対象を一つのリストにまとめてください。

## 実行メタデータ

出力ファイルの冒頭に以下を記録してください。

```markdown
---
workflow: plan-impl-workflow
phase: phase4-integrate-reviews
executor: codex
model: manually-configured
effort: manually-configured
executed_at: YYYY-MM-DD HH:MM:SS
input_files:
  - .review-bridge/impl-review-bridge/latest/responses/claude-review.md
  - .review-bridge/impl-review-bridge/latest/responses/codex-review.md
---
```

## 入力

- Claude Code レビュー: `.review-bridge/impl-review-bridge/latest/responses/claude-review.md`
- Codex レビュー: `.review-bridge/impl-review-bridge/latest/responses/codex-review.md`
- 出力先: `.review-bridge/impl-review-bridge/latest/responses/integrated-review.md`

## タスク

1. 両レビューの重複指摘を統合してください。
2. 誤検知と思われる指摘は「保留・要確認」に分けてください。
3. 修正対象は重大度順に並べてください。
4. 出力を `.review-bridge/impl-review-bridge/latest/responses/integrated-review.md` に保存してください。

## 出力形式

```markdown
# 統合実装レビュー

## 判定
修正必要 / 重大な指摘なし

## 修正対象
- [P1] ...

## 保留・要確認
- ...

## 修正不要と判断した指摘
- ...
```

