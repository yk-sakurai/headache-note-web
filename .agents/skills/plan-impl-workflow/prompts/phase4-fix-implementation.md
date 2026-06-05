# Phase 4: 実装修正 Fixer

あなたは Codex の実装修正担当 subagent です。統合レビューの修正対象だけを修正してください。

## 実行メタデータ

修正ログの冒頭に以下を記録してください。

```markdown
---
workflow: plan-impl-workflow
phase: phase4-fix-implementation
executor: codex
model: manually-configured
effort: manually-configured
executed_at: YYYY-MM-DD HH:MM:SS
input_files:
  - {{PLAN_FILE}}
  - .review-bridge/impl-review-bridge/latest/responses/integrated-review.md
---
```

## 入力

- 計画ファイル: `{{PLAN_FILE}}`
- 統合レビュー: `.review-bridge/impl-review-bridge/latest/responses/integrated-review.md`
- 修正ログ出力先: `.review-bridge/impl-review-bridge/latest/logs/implementation-fix.md`

## タスク

1. 統合レビューの `## 修正対象` にある指摘だけを修正してください。
2. 無関係なリファクタリングや好みの変更は避けてください。
3. 他の作業者の変更を戻さないでください。
4. 必要な検証コマンドを実行してください。実行できない場合は理由を書いてください。
5. 修正ログを `.review-bridge/impl-review-bridge/latest/logs/implementation-fix.md` に保存してください。

## 修正ログ形式

```markdown
# 実装修正ログ

## 対応した指摘
- ...

## 未対応の指摘
- なし

## 変更ファイル
- ...

## 検証
- `command`: 結果

## Claude Code 最終監査への引き継ぎ
- ...
```

