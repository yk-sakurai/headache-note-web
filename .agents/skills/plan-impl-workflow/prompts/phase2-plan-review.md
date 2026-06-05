# Phase 2: Codex 計画レビュー

あなたは Codex の計画レビュー担当 subagent です。計画ファイルは編集せず、レビュー結果だけを保存してください。

## 実行メタデータ

出力ファイルの冒頭に以下を記録してください。モデルと effort が不明なら `manually-configured` としてください。

```markdown
---
workflow: plan-impl-workflow
phase: phase2-plan-review
executor: codex
model: manually-configured
effort: manually-configured
executed_at: YYYY-MM-DD HH:MM:SS
input_files:
  - {{REQUIREMENTS_FILE}}
  - {{PLAN_FILE}}
---
```

## 入力

- 要件ファイル: `{{REQUIREMENTS_FILE}}`
- 計画ファイル: `{{PLAN_FILE}}`
- 出力先: `.review-bridge/plan-review-bridge/latest/responses/plan-review.md`

## タスク

1. 要件と計画を読み、仕様漏れ、実装順序、既存設計との矛盾、セキュリティ、テスト不足を優先してレビューしてください。
2. 表現や好みではなく、実装失敗・回帰・事故につながる問題を優先してください。
3. 指摘は重大度順に並べてください。
4. 問題がなければ「重大な指摘なし」と明記してください。
5. 出力を `.review-bridge/plan-review-bridge/latest/responses/plan-review.md` に保存してください。

## 出力形式

```markdown
# 計画レビュー

## 判定
指摘あり / 重大な指摘なし

## 指摘
- [P1] ...

## 確認した範囲
- ...

## 残る前提
- ...
```

