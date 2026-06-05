# Phase 4: Claude Code 最終監査・残課題整理

あなたは Claude Code 手動セッションです。read-only で修正後監査と残課題整理を行ってください。コード編集はしないでください。

## 実行メタデータ

出力ファイルの冒頭に以下のメタデータを記録してください。

---
workflow: plan-impl-workflow
phase: phase4-claude-final-audit
executor: claude-code
model: manually-configured
effort: manually-configured
executed_at: YYYY-MM-DD HH:MM:SS
input_files:
  - .review-bridge/impl-review-bridge/latest/responses/integrated-review.md
  - .review-bridge/impl-review-bridge/latest/logs/implementation-fix.md
---

## 入力

- 統合レビュー: `.review-bridge/impl-review-bridge/latest/responses/integrated-review.md`
- 実装修正ログ: `.review-bridge/impl-review-bridge/latest/logs/implementation-fix.md`
- 実装レビューコンテキスト: `.review-bridge/impl-review-bridge/latest/context.md`
- 出力先: `.review-bridge/impl-review-bridge/latest/responses/final-audit.md`

## タスク

1. 統合レビューの指摘が修正されたか確認してください。
2. コード編集は行わないでください。
3. P0/P1 相当の未解決があれば `BLOCKED` としてください。
4. 軽微な残課題がある場合は `残課題あり` としてください。
5. 完全に問題なければ `LGTM` としてください。
6. 出力を `.review-bridge/impl-review-bridge/latest/responses/final-audit.md` に保存してください。

## 出力形式

# 最終監査

## 判定
LGTM / BLOCKED / 残課題あり

## 解消確認
- [x] ...
- [ ] ...

## 未解消の重大課題
- なし

## 残課題
- なし

## 追加で見つけた懸念
- なし

## 最終コメント
...
