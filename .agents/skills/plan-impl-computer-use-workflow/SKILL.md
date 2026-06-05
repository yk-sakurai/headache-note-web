---
name: plan-impl-computer-use-workflow
description: |
  既存の plan-impl-workflow を変更せずに、Claude Code 手動工程を Codex の Computer Use で代行する実験用ラッパーワークフロー。
  ユーザーが「plan-impl-workflow を Computer Use で任せたい」「Claude Code 手動部分を Codex が操作して進めたい」「Phase 1-2 だけ」「Phase 3-4 だけ」「Phase 1-4 通しで」などと言ったときに使う。
  claude -p は使わず、ユーザーが VS Code 統合ターミナルで起動・設定した対話型 Claude Code CLI を Computer Use で操作する。
---

# Plan-Impl Computer Use Workflow

既存の `plan-impl-workflow` を変更せずに、Claude Code 手動工程だけを Codex の Computer Use で代行する実験用ラッパースキル。

## 原則

- まず `.agents/skills/plan-impl-workflow/SKILL.md` を読み、Phase、成果物、`status.json`、プロンプト、停止ポイントの正本として扱う。
- このスキルは既存手順を複製しない。差分は「Claude Code 手動工程を Computer Use で操作する」ことだけ。
- `claude -p` は使わない。Codex の shell tool から Claude Code を非対話実行しない。
- Claude Code は、ユーザーが VS Code 統合ターミナルで起動した対話型 CLI セッションを使う。Terminal.app は Computer Use で操作できない場合があるため、操作対象にしない。
- VS Code 統合ターミナルが開いていない場合は、Computer Use で VS Code の統合ターミナルを開いてから Claude Code セッションを確認する。
- Claude Code のモデル、Effort、権限設定はユーザーの手動設定を尊重する。変更が必要なら作業前に確認する。
- Claude Code 手動工程は、Phase ごとに新規またはクリア済みセッションで実行する。Phase 1、Phase 4a、Phase 4c は同じ会話文脈を引き継がない。
- Codex は Computer Use でプロンプト貼り付け、送信、出力確認、成果物保存確認を行う。
- ログイン、モデル選択、権限許可、予期しないダイアログ、保存失敗、プロンプト投入失敗が発生したら停止してユーザーに確認する。
- ただし、ユーザーが明示的に許可している場合、`grep` / `rg` / `ls` / `date` などの読み取り・確認系コマンド、およびそれらだけで構成された複合コマンドの Claude Code 権限確認は Computer Use で許可してよい。
- 成果物と状態管理は既存 `plan-impl-workflow` と同じ `.review-bridge/`、`plans/`、`status.json` を使う。

## 実行範囲モード

ユーザーの依頼から、次のいずれかを選ぶ。

| モード | 対象 | 完了条件 |
|---|---|---|
| 計画のみ | Phase 1 から Phase 2 | plan 側 `status.json` が `completed` または `blocked` |
| 実装のみ | Phase 3 から Phase 4 | impl 側 `status.json` が `completed` または `blocked` |
| 計画と実装 | Phase 1 から Phase 4 | plan 側と impl 側が `completed`、またはいずれかが `blocked` |

## 計画のみ: Phase 1 から Phase 2

開始例:

```text
/plan-impl-computer-use-workflow requirements/FEATURE_NAME.md を Phase 1 から Phase 2 まで進めてください。
```

手順:

1. 既存 `plan-impl-workflow` の初期化手順に従い、feature 名、要件ファイル、計画ファイル、`.review-bridge/`、`status.json` を準備する。
2. Phase 1 の Claude Code 計画作成プロンプトを作る。
3. Computer Use でユーザーの VS Code 統合ターミナル上の Claude Code セッションへプロンプトを貼り付けて送信する。
4. Claude Code が `plans/FEATURE_NAME.md` と plan 側 `status.json` を保存したことを確認する。
5. Phase 2 の Codex 計画レビュー・修正・監査を既存 `plan-impl-workflow` に従って実行する。
6. Phase 3 には進まず、計画結果、判定、成果物パスを報告して停止する。

## 実装のみ: Phase 3 から Phase 4

開始例:

```text
/plan-impl-computer-use-workflow plans/FEATURE_NAME.md を Phase 3 から Phase 4 まで進めてください。
```

手順:

1. 既存の計画ファイル、要件ファイル、`.review-bridge/` の状態を確認し、不足があれば Phase 3 用に初期化する。
2. Phase 3 の Codex 実装を既存 `plan-impl-workflow` に従って実行する。
3. Phase 4a の Claude Code 実装レビュー用プロンプトを作る。
4. Computer Use で Claude Code セッションへ貼り付けて送信し、`.review-bridge/impl-review-bridge/latest/responses/claude-review.md` の保存を確認する。
5. Phase 4b の Codex レビュー統合・修正を既存 `plan-impl-workflow` に従って実行する。
6. Phase 4c の Claude Code 最終監査用プロンプトを作る。
7. Computer Use で Claude Code セッションへ貼り付けて送信し、`.review-bridge/impl-review-bridge/latest/responses/final-audit.md` の保存を確認する。
8. 最終判定を報告して停止する。

## 計画と実装: Phase 1 から Phase 4

開始例:

```text
/plan-impl-computer-use-workflow requirements/FEATURE_NAME.md を Phase 1 から Phase 4 まで通して進めてください。
```

手順:

1. 「計画のみ」モードを実行する。
2. plan 側 `status.json` が `completed` の場合だけ Phase 3 に進む。
3. 「実装のみ」モードを実行する。
4. 最終判定を報告して停止する。

## Computer Use 操作手順

Claude Code 手動工程に入ったら、以下を行う。

1. `computer-use` スキルを使い、VS Code の状態を確認する。
2. VS Code が対象リポジトリを開いているか、ウィンドウタイトル、サイドバー、ターミナル表示などから確認する。
3. VS Code 統合ターミナルが表示されていなければ、Computer Use で VS Code の統合ターミナルを開く。通常はメニューの `Terminal > New Terminal` または VS Code の統合ターミナル表示ショートカットを使う。
4. Terminal.app など別のターミナルアプリは操作対象にしない。
5. 複数の統合ターミナル、タブ、ペインがある場合、画面内容から Claude Code セッション候補を識別する。
6. Claude Code の対話型セッションが開いていなければ、ユーザーに VS Code 統合ターミナルで起動を依頼する。
7. 対象セッションが一意に特定できた場合だけ、新規またはクリア済みセッションか確認する。
8. 前工程の会話文脈が残っている場合は、前工程の成果物保存を確認してからセッションをクリアする。クリア方法が不明または危険な場合は、ユーザーに新規/クリア済みセッションを前面表示してもらう。
9. 入力欄またはカーソル位置を確認する。
10. 置換済みプロンプト全文を貼り付ける。
11. `Return` で送信する。
12. Claude Code の完了メッセージ、ファイル保存、`status.json` 更新を確認する。
13. 成果物が不足、空、または状態不整合なら停止してユーザーに報告する。

## Claude Code セッション分離ルール

- Claude Code 手動工程は、各 Phase で独立した新規またはクリア済みセッションを使う。
- Phase 1 の計画作成、Phase 4a の実装レビュー、Phase 4c の最終監査は、同じ会話文脈を引き継がない。
- 既存セッションを再利用する場合は、プロンプト送信前に会話をクリアする。
- Codex が Computer Use でクリア操作する場合は、対象セッションが一意に特定でき、前工程の成果物保存が確認できた場合だけ行う。
- セッションのクリア方法が画面上で確認できない場合や、誤って別セッションを消すリスクがある場合は操作しない。
- 不明な場合は、ユーザーに VS Code 統合ターミナル上の新規またはクリア済み Claude Code セッションを前面表示してもらう。
- クリア後または新規起動後に、対象リポジトリ、Claude Code の入力待ち状態、モデル/Effort 設定が期待どおりか確認してからプロンプトを送信する。

## 複数ターミナル時の識別ルール

- Codex は、VS Code 統合ターミナル内の Claude Code 対話画面、`claude` の入力待ち表示、対象プロジェクトのパス、直近の会話内容、ウィンドウタイトル、タブタイトルなどを根拠に対象セッションを識別する。
- 対象セッションが一意に特定できない場合は操作しない。
- 複数の Claude Code セッションが見つかった場合は、推測で選ばず停止する。
- 通常 shell、別プロジェクトの Claude Code、別作業中のターミナルが候補に混ざる場合は停止する。
- 入力カーソルが対象セッションにあると確認できない場合は貼り付けない。
- 判断に迷う場合は、ユーザーに対象の Claude Code セッションを前面表示してもらう。
- 送信直前に、対象リポジトリ、Claude Code の入力待ち状態、貼り付け先の3点を確認する。

## 停止条件

- Claude Code セッションが見つからない。
- Claude Code セッションが VS Code 統合ターミナル上にない。
- VS Code が対象リポジトリを開いているか確認できず、統合ターミナルを安全に開けない。
- Computer Use で VS Code 統合ターミナルを開けない。
- Claude Code セッション候補が複数あり、一意に特定できない。
- 対象セッションが前面表示されていない、または入力先が確認できない。
- Claude Code セッションに前工程の会話文脈が残っており、安全にクリアできない。
- Claude Code のログインや権限許可が必要。
- ただし、ユーザーが明示的に許可済みの読み取り・確認系コマンド（例: `grep` / `rg` / `ls` / `date`）と、それらだけで構成された複合コマンドの権限確認は停止条件に含めず、Computer Use で許可してよい。
- モデルや Effort の選択が必要。
- Claude Code が対象外ファイルを編集しようとしている。
- 成果物ファイルが保存されない。
- `status.json` の状態が既存 `plan-impl-workflow` の定義と一致しない。
- P0/P1 相当の未解決があり、続行すると危険。

## 報告

各モードの終了時に、以下を簡潔に報告する。

- 実行した範囲。
- 作成・更新された主要成果物。
- `status.json` の最終 state。
- 最終判定。
- ユーザー判断が必要な残課題。
