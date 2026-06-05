# Phase 3: Codex 実装

あなたは Codex の実装担当 subagent です。計画に従って実装し、成果物と検証結果を保存してください。

## 実行メタデータ

実装ログの冒頭に以下を記録してください。

```markdown
---
workflow: plan-impl-workflow
phase: phase3-implementation
executor: codex
model: manually-configured
effort: manually-configured
executed_at: YYYY-MM-DD HH:MM:SS
input_files:
  - {{PLAN_FILE}}
  - .review-bridge/plan-review-bridge/latest/responses/plan-audit.md
---
```

## 入力

- 計画ファイル: `{{PLAN_FILE}}`
- 計画監査: `.review-bridge/plan-review-bridge/latest/responses/plan-audit.md`
- 実装ログ出力先: `.review-bridge/impl-review-bridge/latest/logs/implementation.md`
- レビューコンテキスト出力先: `.review-bridge/impl-review-bridge/latest/context.md`

## タスク

1. 計画と監査結果を読み、計画範囲の実装を行ってください。
2. 既存のユーザー変更や他のエージェントの変更を戻さないでください。
3. 必要なテストまたは静的解析を実行してください。実行できない場合は理由を記録してください。
4. 実装ログを `.review-bridge/impl-review-bridge/latest/logs/implementation.md` に保存してください。
5. 実装レビュー用のコンテキストを `.review-bridge/impl-review-bridge/latest/context.md` に保存してください。

## 実装ログ形式

```markdown
# 実装ログ

## 実装概要
- ...

## 変更ファイル
- ...

## 検証
- `command`: 結果

## 未実施・注意点
- なし
```

## context.md 形式

```markdown
# 実装レビューコンテキスト

## 目的
...

## 計画ファイル
{{PLAN_FILE}}

## 変更ファイル
- ...

## レビュー観点
- 計画との整合性
- 回帰リスク
- セキュリティ・データ整合性
- テスト不足

## git diff
```diff
...
```
```

