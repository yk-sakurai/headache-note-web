# Phase 1: Claude Code 計画作成

あなたは Claude Code 手動セッションです。`claude -p` ではなく、通常の対話型セッションとして実行されています。

## 実行メタデータ

作成する計画ファイルの冒頭または末尾に、可能な範囲で以下のメタデータを記録してください。

---
workflow: plan-impl-workflow
phase: phase1-plan
executor: claude-code
model: manually-configured
effort: manually-configured
executed_at: YYYY-MM-DD HH:MM:SS
input_files:
  - {{REQUIREMENTS_FILE}}
---

## 入力

- 要件ファイル: `{{REQUIREMENTS_FILE}}`
- 出力先計画ファイル: `{{PLAN_FILE}}`
- 状態ファイル: `.review-bridge/plan-review-bridge/latest/status.json`

## タスク

1. 要件ファイルを読み、プロジェクトの `AGENTS.md` と `docs/ai-agents/` のルールに従ってください。
2. 実装可能な計画を `{{PLAN_FILE}}` に作成してください。
3. 計画には以下を含めてください。
   - 概要
   - 要件
   - 非対象
   - 実装方針
   - 修正対象ファイル
   - テスト・検証方法
   - リスクと注意点
   - 進捗セクション
4. 計画ファイルを保存したら、ユーザーへ完了報告する前に `.review-bridge/plan-review-bridge/latest/status.json` を更新してください。
   - `phase` を `phase2` にする
   - `state` を `phase2_pending_codex_plan_review` にする
   - `updated_at` を現在時刻（`YYYY-MM-DD HH:MM:SS`）に更新する
   - 可能なら `executions.phase1` に `executor`、`model`、`effort`、`executed_at`、`output_files` を記録する
5. 計画作成と上記の状態更新以外のコード編集は行わないでください。

完了したら、`status.json` 更新後に、作成・更新したファイルを報告してください。
