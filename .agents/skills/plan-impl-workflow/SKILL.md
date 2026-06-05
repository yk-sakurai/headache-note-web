---
name: plan-impl-workflow
description: |
  Codex アプリと Claude Code 手動セッションを併用し、要件から計画、計画レビュー、実装、実装レビュー、修正、最終監査まで進めるワークフロー。
  ユーザーが「/plan-impl-workflow」「plan-impl-workflow」「計画から実装までの手動連携ワークフロー」などと言ったときに使う。
  claude -p は使わず、Claude Code は手動起動、Codex 側はメインエージェントから必要に応じてサブエージェントを呼び出す。
---

# Plan-Impl Workflow

`claude -p` を使わず、Codex アプリと Claude Code 手動セッションをファイル成果物で接続するワークフロー。

## 原則

- LLM を CLI から自動起動しない。特に `claude -p` は使わない。
- Claude Code はユーザーが手動で起動し、モデルと Effort も手動設定する。
- Codex 側のモデルと reasoning effort も実行時設定に従う。スキル内でモデル名を固定しない。
- 各工程の成果物には `executor`、`model`、`effort`、`executed_at` をメタデータとして記録する。実値が不明なら `manually-configured` とする。
- レビューはループしない。各レビュー、修正、監査は 1 回だけ実行する。
- ラウンド概念は使わない。ファイル名に `round` を入れない。
- 会話履歴ではなく、`plans/` と `.review-bridge/` の成果物で工程を接続する。
- Codex サブエージェントを使える場合は、工程ごとに短命の subagent を起動して終了させる。使えない場合は、同じプロンプトを新しい Codex セッションで実行する。
- Claude Code 手動工程のプロンプトをユーザーに提示するときは、プレースホルダー置換後のプロンプト全文だけを、コピー可能な単一のコードブロックで提示する。プロンプト本文にコードフェンスが含まれる場合は外側を 4 連バッククォートにするか、内側フェンスを使わない形に整えて、途中でコードブロックが閉じないようにする。

## 使い方

このワークフローは 1 回の起動で計画から最終監査まで自動実行しない。Claude Code 手動工程で必ず停止し、ユーザーが Claude Code の成果物を保存したあとに Codex へ再開を依頼する。

### 開始

```text
/plan-impl-workflow requirements/FEATURE_NAME.md を開始してください。
```

Codex は以下を行う。

1. feature 名、要件ファイル、計画ファイルのパスを決める。
2. `.review-bridge/` のディレクトリと `status.json` を作成する。
3. Phase 1 用の Claude Code 手動プロンプトを提示する。
4. Claude Code の計画作成が終わるまで停止する。

### 再開

Phase 1 の Claude Code 計画作成が終わったら:

```text
/plan-impl-workflow Phase 2 を進めてください。
```

Phase 2 の計画レビュー・修正・監査が終わったら:

```text
/plan-impl-workflow Phase 3 を進めてください。
```

Phase 3 の実装が終わったら:

```text
/plan-impl-workflow Phase 4a の Claude Code レビュー用プロンプトを出してください。
```

Phase 4a の Claude Code 実装レビューが保存されたら:

```text
/plan-impl-workflow Phase 4b を進めてください。
```

Phase 4b の Codex 修正が終わったら:

```text
/plan-impl-workflow Phase 4c の Claude Code 最終監査用プロンプトを出してください。
```

Phase 4c の `final-audit.md` が保存されたら:

```text
/plan-impl-workflow 最終判定を確認してください。
```

### 停止ポイント

- Phase 1 の前: Claude Code による計画作成待ち。
- Phase 4a の前: Claude Code による実装レビュー待ち。
- Phase 4c の前: Claude Code による最終監査待ち。

Codex は Claude Code 手動工程を自動実行しない。該当フェーズではプロンプト提示と成果物確認だけを行う。

## ディレクトリ

```text
.review-bridge/
├── plan-review-bridge/latest/
│   ├── status.json
│   ├── responses/
│   │   ├── plan-review.md
│   │   └── plan-audit.md
│   └── logs/
│       └── plan-fix.md
└── impl-review-bridge/latest/
    ├── status.json
    ├── context.md
    ├── responses/
    │   ├── claude-review.md
    │   ├── codex-review.md
    │   ├── integrated-review.md
    │   └── final-audit.md
    └── logs/
        ├── implementation.md
        └── implementation-fix.md
```

## 状態

`status.json` の `state` は次のいずれかにする。

```text
phase1_pending_claude_plan
phase2_pending_codex_plan_review
phase3_pending_codex_implementation
phase4_pending_claude_review
phase4_pending_codex_fix
phase4_pending_claude_final_audit
completed
blocked
```

## 実行手順

### 0. 初期化

要件ファイルから feature 名を決め、必要なディレクトリと状態ファイルを作成する。Python などの補助スクリプトは使わず、Codex が通常のファイル編集として作成・更新する。

作成するディレクトリ:

```text
.review-bridge/plan-review-bridge/latest/responses/
.review-bridge/plan-review-bridge/latest/logs/
.review-bridge/impl-review-bridge/latest/responses/
.review-bridge/impl-review-bridge/latest/logs/
```

`.review-bridge/plan-review-bridge/latest/status.json`:

```json
{
  "workflow": "plan-impl-workflow",
  "feature": "FEATURE_NAME",
  "phase": "phase1",
  "state": "phase1_pending_claude_plan",
  "requirements_file": "requirements/FEATURE_NAME.md",
  "plan_file": "plans/FEATURE_NAME.md",
  "target_files": [],
  "created_at": "YYYY-MM-DD HH:MM:SS",
  "updated_at": "YYYY-MM-DD HH:MM:SS",
  "executions": {}
}
```

`.review-bridge/impl-review-bridge/latest/status.json`:

```json
{
  "workflow": "plan-impl-workflow",
  "feature": "FEATURE_NAME",
  "phase": "phase3",
  "state": "phase3_pending_codex_implementation",
  "requirements_file": "requirements/FEATURE_NAME.md",
  "plan_file": "plans/FEATURE_NAME.md",
  "context_file": ".review-bridge/impl-review-bridge/latest/context.md",
  "target_files": [],
  "created_at": "YYYY-MM-DD HH:MM:SS",
  "updated_at": "YYYY-MM-DD HH:MM:SS",
  "executions": {}
}
```

状態更新は原則として Codex が `status.json` を直接編集して行う。ただし、Claude Code 手動工程のプロンプトで明示している場合は、Claude Code が該当工程の成果物保存後・完了報告前に `status.json` を更新する。

### Phase 1: Claude Code 手動計画作成

担当: Claude Code 手動セッション。

1. `prompts/phase1-claude-plan.md` を読み、プレースホルダーを実際のパスに置き換え、プロンプト全文をコピー可能な単一コードブロックでユーザーに提示する。
2. ユーザーが Claude Code を手動で起動し、計画を `plans/FEATURE_NAME.md` に保存する。
3. Claude Code は「次フェーズ（計画レビュー / 実装）に進む場合はお知らせください。」などの完了案内を出す前に、plan 側 `status.json` の `phase` を `phase2`、`state` を `phase2_pending_codex_plan_review` に進め、`updated_at` と可能な範囲の `executions.phase1` を更新する。

### Phase 2: Codex 計画レビュー・修正・監査

担当: Codex メインエージェント起点。各工程は可能なら Codex サブエージェントで順番に実行する。

1. `prompts/phase2-plan-review.md` で計画レビューを実行し、`.review-bridge/plan-review-bridge/latest/responses/plan-review.md` に保存する。
2. `prompts/phase2-plan-fix.md` で計画を修正し、`plans/FEATURE_NAME.md` と `.review-bridge/plan-review-bridge/latest/logs/plan-fix.md` に保存する。
3. `prompts/phase2-plan-audit.md` で修正後監査を行い、`.review-bridge/plan-review-bridge/latest/responses/plan-audit.md` に保存する。
4. 重大な未解決がなければ plan 側 `status.json` を `completed` にし、impl 側 `status.json` の `state` を `phase3_pending_codex_implementation` にする。重大課題が残る場合は `blocked` にする。

### Phase 3: Codex 実装

担当: Codex サブエージェント、または新規 Codex セッション。

1. `prompts/phase3-implement.md` で実装する。
2. 実装ログを `.review-bridge/impl-review-bridge/latest/logs/implementation.md` に保存する。
3. レビュー用コンテキストを `.review-bridge/impl-review-bridge/latest/context.md` に保存する。
4. impl 側 `status.json` の `state` を `phase4_pending_claude_review` に進める。

### Phase 4a: Claude Code 手動実装レビュー

担当: Claude Code 手動セッション、read-only。

1. `prompts/phase4-claude-review.md` を読み、プレースホルダーを実際のパスに置き換え、プロンプト全文をコピー可能な単一コードブロックでユーザーに提示する。
2. Claude Code はコードを編集せず、レビュー結果だけを `.review-bridge/impl-review-bridge/latest/responses/claude-review.md` に保存する。
3. 保存されたら impl 側 `status.json` の `state` を `phase4_pending_codex_fix` に進める。

### Phase 4b: Codex レビュー統合・修正

担当: Codex メインエージェント起点。各工程は可能なら Codex サブエージェントで順番に実行する。

1. `prompts/phase4-codex-review.md` で Codex 側レビューを行い、`.review-bridge/impl-review-bridge/latest/responses/codex-review.md` に保存する。
2. `prompts/phase4-integrate-reviews.md` で Claude Code と Codex のレビューを統合し、`.review-bridge/impl-review-bridge/latest/responses/integrated-review.md` に保存する。
3. `prompts/phase4-fix-implementation.md` で統合レビューの指摘だけを修正し、`.review-bridge/impl-review-bridge/latest/logs/implementation-fix.md` に保存する。
4. Codex 側作業はここで終了し、impl 側 `status.json` の `state` を `phase4_pending_claude_final_audit` に進める。

### Phase 4c: Claude Code 手動最終監査

担当: Claude Code 手動セッション、read-only。

1. `prompts/phase4-claude-final-audit.md` を読み、プレースホルダーを実際のパスに置き換え、プロンプト全文をコピー可能な単一コードブロックでユーザーに提示する。
2. Claude Code はコードを編集せず、修正後監査と残課題整理を `.review-bridge/impl-review-bridge/latest/responses/final-audit.md` に保存する。
3. `final-audit.md` の判定に応じて impl 側 `status.json` の `state` を `completed` または `blocked` にする。

## 最終判定

`final-audit.md` の `## 判定` は次のいずれかにする。

- `LGTM`: 完了。`status.json` は `completed`。
- `BLOCKED`: P0/P1 相当の未解決あり。`status.json` は `blocked`。
- `残課題あり`: 軽微な課題あり。ユーザー判断で `completed` または `blocked`。

## 成果物チェック

各フェーズ後に Codex が以下を直接確認する。

- Phase 1: `plans/FEATURE_NAME.md` が存在する。
- Phase 2: `plan-review.md`、`plan-fix.md`、`plan-audit.md` が存在し、空ではない。
- Phase 3: `context.md`、`implementation.md` が存在し、空ではない。
- Phase 4a: `claude-review.md` が存在し、空ではない。
- Phase 4b: `codex-review.md`、`integrated-review.md`、`implementation-fix.md` が存在し、空ではない。
- Phase 4c: `final-audit.md` が存在し、`## 判定` が `LGTM`、`BLOCKED`、`残課題あり` のいずれかである。

## サブエージェント利用

Codex 側で `multi_agent_v1.spawn_agent` が使える場合、Phase 2、Phase 3、Phase 4b の各工程は `worker` subagent に委譲する。委譲時は以下を必ず伝える。

- 担当工程と出力ファイル。
- 編集可能ファイルの範囲。
- 他の作業者の変更を戻さないこと。
- 既存の `.review-bridge/` 成果物を壊さないこと。
- 完了時に変更ファイル、検証コマンド、出力ファイルを報告すること。
