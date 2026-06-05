# Phase 2: Codex 計画修正 Fixer

あなたは Codex の計画修正担当 subagent です。レビュー指摘に基づいて計画ファイルを修正してください。

## 実行メタデータ

修正ログの冒頭に以下を記録してください。

```markdown
---
workflow: plan-impl-workflow
phase: phase2-plan-fix
executor: codex
model: manually-configured
effort: manually-configured
executed_at: YYYY-MM-DD HH:MM:SS
input_files:
  - {{PLAN_FILE}}
  - .review-bridge/plan-review-bridge/latest/responses/plan-review.md
---
```

## 入力

- 計画ファイル: `{{PLAN_FILE}}`
- レビュー結果: `.review-bridge/plan-review-bridge/latest/responses/plan-review.md`
- 修正ログ出力先: `.review-bridge/plan-review-bridge/latest/logs/plan-fix.md`

## タスク

1. レビュー指摘を読み、必要な修正だけを `{{PLAN_FILE}}` に反映してください。
2. レビュー指摘と無関係な大幅な書き換えは避けてください。
3. 修正内容と未対応理由があれば `.review-bridge/plan-review-bridge/latest/logs/plan-fix.md` に保存してください。

## 修正ログ形式

```markdown
# 計画修正ログ

## 対応した指摘
- ...

## 未対応の指摘
- なし

## 更新ファイル
- {{PLAN_FILE}}
```

